"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import type { DbMessage } from "@/lib/types";

interface NodeReferenceProps {
  label: string;
  targetId: string | undefined;
  targetMessage: DbMessage | undefined;
  senderName: string | undefined;
  conversationId: string;
}

const TOOLTIP_W = 256;
const GAP = 6;

export function NodeReference({
  label,
  targetId,
  targetMessage,
  senderName,
  conversationId,
}: NodeReferenceProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();

    // Horizontal: prefer left-aligned, shift left if it would overflow
    let left = rect.left;
    if (left + TOOLTIP_W > window.innerWidth - 8) {
      left = Math.max(8, rect.right - TOOLTIP_W);
    }

    // Vertical: prefer above, fall back to below
    const tooltipH = 100;
    let top: number;
    if (rect.top > tooltipH + GAP) {
      top = rect.top - tooltipH - GAP;
    } else {
      top = rect.bottom + GAP;
    }

    setCoords({ top, left });
    setShowPreview(true);
  }, []);

  if (!targetId || !targetMessage) {
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
        ref={anchorRef}
        href={`/conversation/${conversationId}?node=${targetId}&mode=focus`}
        className="rounded bg-blue-100 px-1 py-0.5 font-mono text-xs font-medium
                   text-blue-700 hover:bg-blue-200 transition-colors"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowPreview(false)}
      >
        @{label}
      </a>
      {showPreview &&
        mounted &&
        createPortal(
          <div
            style={{ top: coords.top, left: coords.left, width: TOOLTIP_W }}
            className="pointer-events-none fixed z-[9999] rounded-lg border border-gray-200
                       bg-white p-3 shadow-lg"
          >
            <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
              <span className="font-mono font-medium text-blue-600">{label}</span>
              <span className="font-medium text-gray-700">{senderName ?? "unknown"}</span>
              <span>{time}</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-800">{preview}</p>
          </div>,
          document.body
        )}
    </span>
  );
}
