"use client";

import { useState } from "react";
import type { SiblingContext, DbMessage } from "@/lib/types";
import { updateMessage } from "@/actions/messages";
import { MessageBody } from "@/components/message-body";

interface MessageCardProps {
  id: string;
  conversationId: string;
  body: string;
  senderName: string;
  senderId: string;
  currentUserId: string;
  nodeLabel: string;
  labelToId: Map<string, string>;
  messagesById: Map<string, DbMessage>;
  profileMap: Map<string, { email: string; display_name: string | null }>;
  timestamp: string;
  updatedAt: string;
  edited: boolean;
  childCount: number;
  branchCount: number;
  depth: number;
  isActive: boolean;
  siblingContext?: SiblingContext;
  onFocus: (id: string) => void;
  onReplyAsChild: (id: string) => void;
  onAddSibling: (parentId: string | null) => void;
  parentId: string | null;
  onSiblingSwitch?: (siblingId: string) => void;
  onMessageUpdated?: (id: string, newBody: string) => void;
}

export function MessageCard({
  id,
  conversationId,
  body,
  senderName,
  senderId,
  currentUserId,
  nodeLabel,
  labelToId,
  messagesById,
  profileMap,
  timestamp,
  updatedAt,
  edited: wasEdited,
  childCount,
  branchCount,
  depth,
  isActive,
  siblingContext,
  onFocus,
  onReplyAsChild,
  onAddSibling,
  parentId,
  onSiblingSwitch,
  onMessageUpdated,
}: MessageCardProps) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isOwn = senderId === currentUserId;

  const time = new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const editedTime = wasEdited
    ? new Date(updatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const indent = Math.min(depth, 6) * 16;

  async function handleSaveEdit() {
    if (!editBody.trim() || editBody.trim() === body) {
      setEditing(false);
      setEditBody(body);
      return;
    }

    setSaving(true);
    setError("");

    const result = await updateMessage(id, editBody.trim());

    setSaving(false);

    if (result.success) {
      setEditing(false);
      onMessageUpdated?.(id, editBody.trim());
    } else {
      setError(result.error ?? "Failed to save");
    }
  }

  return (
    <div
      style={{ marginLeft: indent }}
      className={`rounded-lg border p-4 transition-colors ${
        isActive
          ? "border-blue-300 bg-blue-50/50 ring-1 ring-blue-200"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
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
                  setEditBody(body);
                }
              }}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Esc to cancel, {navigator.platform.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to save
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditBody(body);
                  }}
                  className="rounded-md px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100
                             focus:outline-none focus:ring-2 focus:ring-gray-400/30"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editBody.trim()}
                  className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white
                             hover:bg-gray-800 disabled:opacity-50 focus:outline-none
                             focus:ring-2 focus:ring-gray-900/20"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <MessageBody
            body={body}
            labelToId={labelToId}
            messagesById={messagesById}
            profiles={profileMap}
            conversationId={conversationId}
            className="min-w-0 flex-1 text-sm leading-relaxed text-gray-900 whitespace-pre-wrap"
          />
        )}
        {!editing && (
          <div className="flex shrink-0 gap-1.5">
            {!isActive && (
              <button
                onClick={() => onFocus(id)}
                className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium
                           text-gray-600 hover:bg-gray-200 focus:outline-none
                           focus:ring-2 focus:ring-gray-400/30"
              >
                Focus
              </button>
            )}
            <a
              href={`/conversation/${conversationId}?node=${id}&mode=tree`}
              className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium
                         text-gray-600 hover:bg-gray-200 focus:outline-none
                         focus:ring-2 focus:ring-gray-400/30"
            >
              Tree
            </a>
            <a
              href={`/conversation/${conversationId}?node=${id}&mode=forum`}
              className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium
                         text-gray-600 hover:bg-gray-200 focus:outline-none
                         focus:ring-2 focus:ring-gray-400/30"
            >
              Forum
            </a>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="font-medium text-gray-700">{senderName}</span>
        <span>{time}</span>
        {wasEdited && (
          <span className="italic text-gray-400">(edited {editedTime})</span>
        )}
        {branchCount > 0 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5">
            {branchCount} {branchCount === 1 ? "branch" : "branches"}
          </span>
        )}
        {childCount > 0 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5">
            {childCount} {childCount === 1 ? "reply" : "replies"} below
          </span>
        )}
      </div>

      {/* Action buttons + sibling nav */}
      {!editing && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onReplyAsChild(id)}
              className="rounded-md bg-gray-100 px-2.5 py-1 text-xs text-gray-600
                         hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
            >
              Reply
            </button>
            {parentId !== null && (
              <button
                onClick={() => onAddSibling(parentId)}
                className="rounded-md bg-gray-100 px-2.5 py-1 text-xs text-gray-600
                           hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
              >
                Add alternative
              </button>
            )}
            {isOwn && (
              <button
                onClick={() => setEditing(true)}
                className="rounded-md bg-gray-100 px-2.5 py-1 text-xs text-gray-600
                           hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
              >
                Edit
              </button>
            )}
          </div>

          {/* Node label + Sibling navigation — bottom right */}
          <div className="flex items-center gap-2">
          {nodeLabel && (
            <span className="rounded bg-gray-100 px-0.5 font-mono text-[9px] leading-tight text-gray-400">
              {nodeLabel}
            </span>
          )}
          {siblingContext && siblingContext.total_siblings > 1 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs">
              <button
                onClick={() => {
                  const prev =
                    siblingContext.sibling_ids[siblingContext.current_index - 1];
                  if (prev && onSiblingSwitch) onSiblingSwitch(prev);
                }}
                disabled={siblingContext.current_index === 0}
                className="px-1 text-gray-600 hover:text-gray-900 disabled:text-gray-300
                           focus:outline-none"
                aria-label="Previous sibling"
              >
                &larr;
              </button>
              <span className="tabular-nums">
                {siblingContext.current_index + 1}/{siblingContext.total_siblings}
              </span>
              <button
                onClick={() => {
                  const next =
                    siblingContext.sibling_ids[siblingContext.current_index + 1];
                  if (next && onSiblingSwitch) onSiblingSwitch(next);
                }}
                disabled={
                  siblingContext.current_index ===
                  siblingContext.total_siblings - 1
                }
                className="px-1 text-gray-600 hover:text-gray-900 disabled:text-gray-300
                           focus:outline-none"
                aria-label="Next sibling"
              >
                &rarr;
              </button>
            </span>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
