"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getAncestorChain,
  getSiblingContext,
  getDefaultBranchPath,
  countDescendants,
} from "@/lib/tree-utils";
import type { DbMessage, AncestorNode, SiblingContext } from "@/lib/types";
import { buildNodeLabelMaps } from "@/lib/node-numbers";
import { MessageCard } from "./message-card";
import { AncestorChain } from "./ancestor-chain";
import { Composer } from "./composer";

interface BranchViewProps {
  conversationId: string;
  initialMessages: DbMessage[];
  initialNodeId: string;
  currentUserId: string;
  profiles: Record<string, { email: string; display_name: string | null }>;
}

interface ComposerState {
  parentId: string | null;
  mode: "reply" | "sibling";
}

export function BranchView({
  conversationId,
  initialMessages,
  initialNodeId,
  currentUserId,
  profiles,
}: BranchViewProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<DbMessage[]>(initialMessages);
  const [focusedNodeId, setFocusedNodeId] = useState(initialNodeId);
  const [composerState, setComposerState] = useState<ComposerState | null>(
    null
  );

  const profileMap = new Map(Object.entries(profiles));
  const messagesById = new Map(messages.map((m) => [m.id, m]));
  const { idToLabel, labelToId } = buildNodeLabelMaps(messages);

  // Subscribe to realtime message inserts and updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as DbMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as DbMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Compute view data from current state
  const ancestors = getAncestorChain(focusedNodeId, messagesById, profileMap);
  const branchPath = getDefaultBranchPath(focusedNodeId, messages);

  // Build full path: ancestor messages (before focused) + branchPath (focused + down)
  const ancestorMessages: DbMessage[] = ancestors
    .slice(0, -1) // exclude the focused node itself (it's the first item in branchPath)
    .map((a) => messagesById.get(a.id)!)
    .filter(Boolean);
  const fullPath = [...ancestorMessages, ...branchPath];

  const navigateToNode = useCallback(
    (nodeId: string) => {
      setFocusedNodeId(nodeId);
      setComposerState(null);
      router.replace(`/conversation/${conversationId}?node=${nodeId}`, {
        scroll: false,
      });
    },
    [conversationId, router]
  );

  function handleReplyAsChild(messageId: string) {
    setComposerState({ parentId: messageId, mode: "reply" });
  }

  function handleAddSibling(parentId: string | null) {
    setComposerState({ parentId, mode: "sibling" });
  }

  function handleSiblingSwitch(siblingId: string) {
    navigateToNode(siblingId);
  }

  function handleComposerSent(newMessage: DbMessage) {
    setMessages((prev) => {
      if (prev.some((m) => m.id === newMessage.id)) return prev;
      return [...prev, newMessage];
    });
    setComposerState(null);
    // Navigate to the new message so it becomes the visible branch
    navigateToNode(newMessage.id);
  }

  function handleMessageUpdated(msgId: string, newBody: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, body: newBody } : m))
    );
  }

  return (
    <div>
      {/* Ancestor breadcrumbs */}
      <AncestorChain
        ancestors={ancestors}
        currentNodeId={focusedNodeId}
        onNavigate={navigateToNode}
      />

      {/* Full path: ancestors + focused node + default path downward */}
      <div className="space-y-3">
        {fullPath.map((msg, i) => {
          const profile = profileMap.get(msg.sender_id);
          const senderName =
            profile?.display_name ?? profile?.email.split("@")[0] ?? "unknown";
          const isFocused = msg.id === focusedNodeId;
          const siblingCtx: SiblingContext = getSiblingContext(
            msg.id,
            messages
          );
          const childCount = countDescendants(msg.id, messages);
          const branchCount = messages.filter(
            (m) => m.parent_id === msg.id
          ).length;

          // Depth relative to the focused node
          const depth = i;

          return (
            <div key={msg.id}>
              <MessageCard
                id={msg.id}
                conversationId={conversationId}
                body={msg.body}
                senderName={senderName}
                senderId={msg.sender_id}
                currentUserId={currentUserId}
                nodeLabel={idToLabel.get(msg.id) ?? ""}
                labelToId={labelToId}
                messagesById={messagesById}
                profileMap={profileMap}
                timestamp={msg.created_at}
                updatedAt={msg.updated_at}
                edited={msg.edited ?? false}
                childCount={childCount}
                branchCount={branchCount}
                depth={depth}
                isActive={isFocused}
                siblingContext={siblingCtx}
                onFocus={navigateToNode}
                onReplyAsChild={handleReplyAsChild}
                onAddSibling={handleAddSibling}
                parentId={msg.parent_id}
                onSiblingSwitch={handleSiblingSwitch}
                onMessageUpdated={handleMessageUpdated}
              />

              {/* Show composer after this message if targeted */}
              {composerState &&
                composerState.parentId === msg.id &&
                composerState.mode === "reply" && (
                  <div style={{ marginLeft: (depth + 1) * 16 }} className="mt-2">
                    <Composer
                      conversationId={conversationId}
                      parentId={msg.id}
                      mode="reply"
                      onClose={() => setComposerState(null)}
                      onSent={handleComposerSent}
                    />
                  </div>
                )}

              {composerState &&
                composerState.parentId === msg.parent_id &&
                composerState.mode === "sibling" &&
                msg.id === focusedNodeId && (
                  <div style={{ marginLeft: depth * 16 }} className="mt-2">
                    <Composer
                      conversationId={conversationId}
                      parentId={msg.parent_id}
                      mode="sibling"
                      onClose={() => setComposerState(null)}
                      onSent={handleComposerSent}
                    />
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {/* Leaf-level composer: offer reply at the bottom of the branch */}
      {fullPath.length > 0 && !composerState && (
        <div
          style={{ marginLeft: Math.min(fullPath.length, 6) * 16 }}
          className="mt-3"
        >
          <button
            onClick={() =>
              handleReplyAsChild(fullPath[fullPath.length - 1].id)
            }
            className="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-2.5
                       text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
          >
            + Continue this branch
          </button>
        </div>
      )}
    </div>
  );
}
