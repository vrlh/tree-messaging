"use client";

import { useState } from "react";
import type { MessageNode, DbMessage } from "@/lib/types";
import { updateMessage, createMessage } from "@/actions/messages";
import { MessageBody } from "@/components/message-body";
import { HighlightTextarea } from "@/components/highlight-textarea";
import Link from "next/link";

interface TreeNodeProps {
  node: MessageNode;
  conversationId: string;
  currentUserId: string;
  idToLabel: Map<string, string>;
  labelToId: Map<string, string>;
  messagesById: Map<string, DbMessage>;
  profileMap: Map<string, { email: string; display_name: string | null }>;
  onMessageAdded: (message: DbMessage) => void;
  onMessageUpdated: (id: string, newBody: string) => void;
}

export function TreeNode({
  node,
  conversationId,
  currentUserId,
  idToLabel,
  labelToId,
  messagesById,
  profileMap,
  onMessageAdded,
  onMessageUpdated,
}: TreeNodeProps) {
  const isOwn = node.sender_id === currentUserId;
  const nodeLabel = idToLabel.get(node.id) ?? "";
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(node.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [composerMode, setComposerMode] = useState<
    "reply" | null
  >(null);
  const [composerBody, setComposerBody] = useState("");
  const [composerSending, setComposerSending] = useState(false);
  const [composerError, setComposerError] = useState("");

  const senderName =
    node.sender_display_name ?? node.sender_email.split("@")[0];

  // Count all descendants recursively
  function countAll(n: MessageNode): number {
    let count = n.children.length;
    for (const child of n.children) count += countAll(child);
    return count;
  }
  const totalBelow = countAll(node);

  const time = new Date(node.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  async function handleSaveEdit() {
    if (!editBody.trim() || editBody.trim() === node.body) {
      setEditing(false);
      setEditBody(node.body);
      return;
    }
    setSaving(true);
    setError("");
    const result = await updateMessage(node.id, editBody.trim());
    setSaving(false);
    if (result.success) {
      setEditing(false);
      onMessageUpdated(node.id, editBody.trim());
    } else {
      setError(result.error ?? "Failed to save");
    }
  }

  async function handleComposerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!composerBody.trim()) return;
    setComposerSending(true);
    setComposerError("");

    const parentId = node.id;

    const result = await createMessage({
      conversation_id: conversationId,
      parent_id: parentId,
      body: composerBody.trim(),
    });

    setComposerSending(false);
    if (result.success && result.message) {
      setComposerBody("");
      setComposerMode(null);
      onMessageAdded(result.message);
    } else {
      setComposerError(result.error ?? "Failed to send");
    }
  }

  return (
    <div className="flex w-full flex-col">
      {/* The node card */}
      <div
        className="rounded-lg border border-gray-200 bg-white p-3 overflow-visible"
      >
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={3}
              autoFocus
              className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm
                         placeholder:text-gray-400 focus:border-blue-500 focus:outline-none
                         focus:ring-2 focus:ring-blue-500/20"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSaveEdit();
                }
                if (e.key === "Escape") {
                  setEditing(false);
                  setEditBody(node.body);
                }
              }}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setEditing(false); setEditBody(node.body); }}
                className="rounded-md px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editBody.trim()}
                className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white
                           hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <MessageBody
                body={node.body}
                labelToId={labelToId}
                messagesById={messagesById}
                profiles={profileMap}
                conversationId={conversationId}
                className="min-w-0 flex-1 text-sm leading-relaxed text-gray-900 whitespace-pre-wrap"
              />
              <div className="flex shrink-0 gap-1.5">
                <Link
                  href={`/conversation/${conversationId}?node=${node.id}&mode=focus`}
                  className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium
                             text-gray-600 hover:bg-gray-200"
                >
                  Focus
                </Link>
                <Link
                  href={`/conversation/${conversationId}?node=${node.id}&mode=tree`}
                  className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium
                             text-gray-600 hover:bg-gray-200"
                >
                  Tree
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
              <span className={`font-medium ${isOwn ? "text-blue-600" : "text-gray-700"}`}>
                {senderName}
              </span>
              <span>{time}</span>
              {(node.edited ?? false) && (
                <span className="italic text-gray-400">(edited)</span>
              )}
              {node.child_count > 0 && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5">
                  {node.child_count} {node.child_count === 1 ? "branch" : "branches"}
                </span>
              )}
              {totalBelow > 0 && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5">
                  {totalBelow} below
                </span>
              )}
            </div>

            {/* Actions + node label */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setComposerMode("reply")}
                  className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600
                             hover:bg-gray-200"
                >
                  Reply
                </button>
                {isOwn && (
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600
                               hover:bg-gray-200"
                  >
                    Edit
                </button>
              )}
              </div>
              {nodeLabel && (
                <span className="rounded bg-gray-100 px-0.5 font-mono text-[9px] leading-tight text-gray-400">
                  {nodeLabel}
                </span>
              )}
            </div>
          </>
        )}

        {/* Inline composer */}
        {composerMode && (
          <form onSubmit={handleComposerSubmit} className="mt-2 rounded-md border border-blue-200 bg-blue-50/30 p-2">
            <p className="mb-1 text-xs font-medium text-blue-700">
              Reply
            </p>
            <HighlightTextarea
              value={composerBody}
              onChange={(e) => setComposerBody(e.target.value)}
              rows={2}
              autoFocus
              placeholder="Write a reply..."
              labelToId={labelToId}
              messagesById={messagesById}
              profiles={profileMap}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleComposerSubmit(e);
                }
                if (e.key === "Escape") {
                  setComposerMode(null);
                  setComposerBody("");
                }
              }}
            />
            {composerError && <p className="mt-1 text-xs text-red-600">{composerError}</p>}
            <div className="mt-1.5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setComposerMode(null); setComposerBody(""); setComposerError(""); }}
                className="rounded-md px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={composerSending || !composerBody.trim()}
                className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white
                           hover:bg-gray-800 disabled:opacity-50"
              >
                {composerSending ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Children */}
      {node.children.length > 0 && (
        <>
          {/* Vertical connector from parent */}
          <div className="flex justify-center">
            <div className="h-4 w-0.5 bg-gray-400" />
          </div>
          {/* Single child: just render it directly, no horizontal scroll needed */}
          {node.children.length === 1 ? (
            <TreeNode
              node={node.children[0]}
              conversationId={conversationId}
              currentUserId={currentUserId}
              idToLabel={idToLabel}
              labelToId={labelToId}
              messagesById={messagesById}
              profileMap={profileMap}
              onMessageAdded={onMessageAdded}
              onMessageUpdated={onMessageUpdated}
            />
          ) : (
            /* Multiple children: each child gets a constrained column that scrolls independently */
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4" style={{ minWidth: node.children.length * 280 }}>
                {node.children.map((child, i) => (
                  <div key={child.id} className="min-w-[260px] flex-1 overflow-hidden">
                    {/* Connector: horizontal bar segment + vertical drop */}
                    <div className="flex h-1 items-center">
                      <div className={`h-0.5 flex-1 ${i === 0 ? "bg-transparent" : "bg-gray-400"}`} />
                      <div className="h-0.5 w-0.5 bg-gray-400" />
                      <div className={`h-0.5 flex-1 ${i === node.children.length - 1 ? "bg-transparent" : "bg-gray-400"}`} />
                    </div>
                    <div className="flex justify-center">
                      <div className="h-3 w-0.5 bg-gray-400" />
                    </div>
                    <TreeNode
                      node={child}
                      conversationId={conversationId}
                      currentUserId={currentUserId}
                      idToLabel={idToLabel}
                      labelToId={labelToId}
                      messagesById={messagesById}
                      profileMap={profileMap}
                      onMessageAdded={onMessageAdded}
                      onMessageUpdated={onMessageUpdated}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
