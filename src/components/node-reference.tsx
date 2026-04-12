"use client";

import { useState } from "react";
import type { DbMessage } from "@/lib/types";

interface NodeReferenceProps {
  label: string;
  targetId: string | undefined;
  targetMessage: DbMessage | undefined;
  senderName: string | undefined;
  conversationId: string;
}

export function NodeReference({
  label,
  targetId,
  targetMessage,
  senderName,
  conversationId,
}: NodeReferenceProps) {
  const [showPreview, setShowPreview] = useState(false);

  if (!targetId || !targetMessage) {
    // Unknown reference — render as plain styled text
    return (
      <span className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-gray-500">
        @{label}
      </span>
    );
  }

  const preview =
    targetMessage.body.length > 100
      ? targetMessage.body.slice(0, 100) + "..."
      : targetMessage.body;

  const time = new Date(targetMessage.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <span className="relative inline-block">
      <a
        href={`/conversation/${conversationId}?node=${targetId}&mode=focus`}
        className="rounded bg-blue-100 px-1 py-0.5 font-mono text-xs font-medium
                   text-blue-700 hover:bg-blue-200 transition-colors"
        onMouseEnter={() => setShowPreview(true)}
        onMouseLeave={() => setShowPreview(false)}
      >
        @{label}
      </a>
      {showPreview && (
        <div
          className="absolute bottom-full left-0 z-50 mb-1 w-64 rounded-lg border
                     border-gray-200 bg-white p-3 shadow-lg"
        >
          <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
            <span className="font-mono font-medium text-blue-600">{label}</span>
            <span className="font-medium text-gray-700">{senderName ?? "unknown"}</span>
            <span>{time}</span>
          </div>
          <p className="text-sm leading-relaxed text-gray-800">{preview}</p>
        </div>
      )}
    </span>
  );
}
