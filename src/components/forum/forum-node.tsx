"use client";

import { useState } from "react";
import type { MessageNode, DbMessage } from "@/lib/types";
import { updateMessage, createMessage } from "@/actions/messages";
import { MessageBody } from "@/components/message-body";
import { HighlightTextarea } from "@/components/highlight-textarea";
import Link from "next/link";

interface ForumNodeProps {
  node: MessageNode;
  depth: number;
  conversationId: string;
  currentUserId: string;
  idToLabel: Map<string, string>;
  labelToId: Map<string, string>;
  messagesById: Map<string, DbMessage>;
  profileMap: Map<string, { email: string; display_name: string | null }>;
  onMessageAdded: (message: DbMessage) => void;
  onMessageUpdated: (id: string, newBody: string) => void;
}

export function ForumNode({
  node,
  depth,
  conversationId,
  currentUserId,
  idToLabel,
  labelToId,
  messagesById,
  profileMap,
  onMessageAdded,
  onMessageUpdated,
}: ForumNodeProps) {
  const isOwn = node.sender_id === currentUserId;
  const nodeLabel = idToLabel.get(node.id) ?? "";
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(node.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [composerMode, setComposerMode] = useState<"reply" | null>(null);
  const [composerBody, setComposerBody] = useState("");
  const [composerSending, setComposerSending] = useState(false);
  const [composerError, setComposerError] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const senderName = node.sender_display_name ?? node.sender_email.split("@")[0];
  const time = new Date(node.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const indent = Math.min(depth, 10) * 24;

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
    <div style={{ marginLeft: indent }}>
      {/* Thread line + card */}
      <div className="flex gap-2 py-1">
        {/* Vertical thread line */}
        {depth > 0 && (
          <div className="flex flex-col items-center pt-3">
            <div className="h-full w-0.5 bg-gray-200" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Header row with focus/tree links inline */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`font-medium ${isOwn ? "text-blue-600" : "text-gray-700"}`}>
              {senderName}
            </span>
            <span className="text-gray-400">{time}</span>
            {(node.edited ?? false) && (
              <span className="italic text-gray-400">(edited)</span>
            )}
            {nodeLabel && (
              <span className="rounded bg-gray-100 px-0.5 font-mono text-[9px] leading-tight text-gray-400">
                {nodeLabel}
              </span>
            )}
            <span className="text-gray-300">|</span>
            <Link href={`/conversation/${conversationId}?node=${node.id}&mode=focus`} className="text-gray-400 hover:text-gray-600">focus</Link>
            <Link href={`/conversation/${conversationId}?node=${node.id}&mode=tree`} className="text-gray-400 hover:text-gray-600">tree</Link>
          </div>

          {/* Body */}
          {editing ? (
            <div className="mt-1 space-y-2">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={3}
                autoFocus
                className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm
                           focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSaveEdit(); }
                  if (e.key === "Escape") { setEditing(false); setEditBody(node.body); }
                }}
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <button onClick={() => { setEditing(false); setEditBody(node.body); }} className="rounded-md px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100">Cancel</button>
                <button onClick={handleSaveEdit} disabled={saving || !editBody.trim()} className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
              </div>
            </div>
          ) : (
            <div className="mt-0.5">
              <MessageBody
                body={node.body}
                labelToId={labelToId}
                messagesById={messagesById}
                profiles={profileMap}
                conversationId={conversationId}
                className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap"
              />
            </div>
          )}

          {/* Actions row */}
          {!editing && (
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <button onClick={() => setComposerMode("reply")} className="hover:text-gray-600">reply</button>
              {isOwn && (
                <button onClick={() => setEditing(true)} className="hover:text-gray-600">edit</button>
              )}
              {node.child_count > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hover:text-gray-600"
                  >
                    [{collapsed ? "+" : "-"}] {node.child_count} {node.child_count === 1 ? "reply" : "replies"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Composer */}
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
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleComposerSubmit(e); }
                  if (e.key === "Escape") { setComposerMode(null); setComposerBody(""); }
                }}
              />
              {composerError && <p className="mt-1 text-xs text-red-600">{composerError}</p>}
              <div className="mt-1.5 flex justify-end gap-2">
                <button type="button" onClick={() => { setComposerMode(null); setComposerBody(""); setComposerError(""); }} className="rounded-md px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100">Cancel</button>
                <button type="submit" disabled={composerSending || !composerBody.trim()} className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50">{composerSending ? "Sending..." : "Send"}</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Children — indented below */}
      {!collapsed && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <ForumNode
              key={child.id}
              node={child}
              depth={depth + 1}
              conversationId={conversationId}
              currentUserId={currentUserId}
              idToLabel={idToLabel}
              labelToId={labelToId}
              messagesById={messagesById}
              profileMap={profileMap}
              onMessageAdded={onMessageAdded}
              onMessageUpdated={onMessageUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
