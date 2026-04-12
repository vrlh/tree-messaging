"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildTree } from "@/lib/tree-utils";
import { buildNodeLabelMaps } from "@/lib/node-numbers";
import type { DbMessage, MessageNode } from "@/lib/types";
import { ForumNode } from "./forum-node";

interface ForumViewProps {
  conversationId: string;
  initialMessages: DbMessage[];
  currentUserId: string;
  rootNodeId: string | null;
  profiles: Record<string, { email: string; display_name: string | null }>;
}

export function ForumView({
  conversationId,
  initialMessages,
  currentUserId,
  rootNodeId,
  profiles,
}: ForumViewProps) {
  const [messages, setMessages] = useState<DbMessage[]>(initialMessages);
  const profileMap = new Map(Object.entries(profiles));

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`forum:${conversationId}`)
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

  const tree = buildTree(messages, profileMap);
  const { idToLabel, labelToId } = buildNodeLabelMaps(messages);
  const messagesById = new Map(messages.map((m) => [m.id, m]));

  function findNode(nodes: MessageNode[], id: string): MessageNode | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  }

  const displayRoots = rootNodeId
    ? ([findNode(tree, rootNodeId)].filter(Boolean) as MessageNode[])
    : tree;

  function handleMessageAdded(newMessage: DbMessage) {
    setMessages((prev) => {
      if (prev.some((m) => m.id === newMessage.id)) return prev;
      return [...prev, newMessage];
    });
  }

  function handleMessageUpdated(id: string, newBody: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, body: newBody, edited: true } : m))
    );
  }

  return (
    <div className="space-y-0">
      {displayRoots.map((root) => (
        <ForumNode
          key={root.id}
          node={root}
          depth={0}
          conversationId={conversationId}
          currentUserId={currentUserId}
          idToLabel={idToLabel}
          labelToId={labelToId}
          messagesById={messagesById}
          profileMap={profileMap}
          onMessageAdded={handleMessageAdded}
          onMessageUpdated={handleMessageUpdated}
        />
      ))}
    </div>
  );
}
