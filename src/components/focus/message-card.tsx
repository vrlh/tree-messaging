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
      className={`rounded-lg border p-3 transition-colors ${
        isActive
          ? "border-blue-300 bg-blue-50/50 ring-1 ring-blue-200"
          : "border-gray-200 bg-white"
      }`}
    >
      {/* Header: sender, time, label, mode links */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`font-medium ${isOwn ? "text-blue-600" : "text-gray-700"}`}>
          {senderName}
        </span>
        <span className="text-gray-400">{time}</span>
        {wasEdited && (
          <span className="italic text-gray-400">(edited {editedTime})</span>
        )}
        {nodeLabel && (
          <span className="rounded bg-gray-100 px-0.5 font-mono text-[9px] leading-tight text-gray-400">
            {nodeLabel}
          </span>
        )}
        {branchCount > 0 && (
          <span className="text-gray-400">
            {branchCount} {branchCount === 1 ? "branch" : "branches"}
          </span>
        )}
        {childCount > 0 && (
          <span className="text-gray-400">
            {childCount} below
          </span>
        )}
        <span className="text-gray-300">|</span>
        {!isActive && (
          <button onClick={() => onFocus(id)} className="text-gray-400 hover:text-gray-600">focus</button>
        )}
        <a href={`/conversation/${conversationId}?node=${id}&mode=tree`} className="text-gray-400 hover:text-gray-600">tree</a>
        <a href={`/conversation/${conversationId}?node=${id}&mode=forum`} className="text-gray-400 hover:text-gray-600">forum</a>
      </div>

      {/* Body */}
      {editing ? (
        <div className="mt-1.5 space-y-2">
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={3}
            autoFocus
            className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm
                       focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSaveEdit(); }
              if (e.key === "Escape") { setEditing(false); setEditBody(body); }
            }}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setEditing(false); setEditBody(body); }}
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
        <div className="mt-1">
          <MessageBody
            body={body}
            labelToId={labelToId}
            messagesById={messagesById}
            profiles={profileMap}
            conversationId={conversationId}
            className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap"
          />
        </div>
      )}

      {/* Actions: reply, edit, sibling nav */}
      {!editing && (
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-400">
          <button onClick={() => onReplyAsChild(id)} className="hover:text-gray-600">reply</button>
          {isOwn && (
            <button onClick={() => setEditing(true)} className="hover:text-gray-600">edit</button>
          )}
          {siblingContext && siblingContext.total_siblings > 1 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="inline-flex items-center gap-1">
                <button
                  onClick={() => {
                    const prev = siblingContext.sibling_ids[siblingContext.current_index - 1];
                    if (prev && onSiblingSwitch) onSiblingSwitch(prev);
                  }}
                  disabled={siblingContext.current_index === 0}
                  className="text-gray-500 hover:text-gray-900 disabled:text-gray-300"
                  aria-label="Previous sibling"
                >
                  &larr;
                </button>
                <span className="tabular-nums text-gray-500">
                  {siblingContext.current_index + 1}/{siblingContext.total_siblings}
                </span>
                <button
                  onClick={() => {
                    const next = siblingContext.sibling_ids[siblingContext.current_index + 1];
                    if (next && onSiblingSwitch) onSiblingSwitch(next);
                  }}
                  disabled={siblingContext.current_index === siblingContext.total_siblings - 1}
                  className="text-gray-500 hover:text-gray-900 disabled:text-gray-300"
                  aria-label="Next sibling"
                >
                  &rarr;
                </button>
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
