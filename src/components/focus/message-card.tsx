"use client";

import type { SiblingContext } from "@/lib/types";

interface MessageCardProps {
  id: string;
  body: string;
  senderName: string;
  timestamp: string;
  childCount: number;
  depth: number;
  isActive: boolean;
  siblingContext?: SiblingContext;
  onFocus: (id: string) => void;
  onReplyAsChild: (id: string) => void;
  onAddSibling: (parentId: string | null) => void;
  parentId: string | null;
  onSiblingSwitch?: (siblingId: string) => void;
}

export function MessageCard({
  id,
  body,
  senderName,
  timestamp,
  childCount,
  depth,
  isActive,
  siblingContext,
  onFocus,
  onReplyAsChild,
  onAddSibling,
  parentId,
  onSiblingSwitch,
}: MessageCardProps) {
  const time = new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const indent = Math.min(depth, 6) * 16;

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
        <p className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap">
          {body}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="font-medium text-gray-700">{senderName}</span>
        <span>{time}</span>
        {childCount > 0 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5">
            {childCount} {childCount === 1 ? "reply" : "replies"}
          </span>
        )}

        {/* Sibling navigation */}
        {siblingContext && siblingContext.total_siblings > 1 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5">
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

      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap gap-2">
        {!isActive && (
          <button
            onClick={() => onFocus(id)}
            className="rounded-md bg-gray-100 px-2.5 py-1 text-xs text-gray-600
                       hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400/30"
          >
            Focus here
          </button>
        )}
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
      </div>
    </div>
  );
}
