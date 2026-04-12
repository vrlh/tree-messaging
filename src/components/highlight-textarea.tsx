"use client";

import { useRef, useCallback, useMemo } from "react";
import { NODE_REF_REGEX } from "@/lib/node-numbers";
import type { DbMessage } from "@/lib/types";

interface HighlightTextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  labelToId?: Map<string, string>;
  messagesById?: Map<string, DbMessage>;
  profiles?: Map<string, { email: string; display_name: string | null }>;
}

const SHARED_STYLE =
  "w-full resize-none rounded-md px-3 py-2 text-sm leading-relaxed";

export function HighlightTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  autoFocus,
  onKeyDown,
  labelToId,
  messagesById,
  profiles,
}: HighlightTextareaProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLTextAreaElement>) => {
      if (backdropRef.current) {
        backdropRef.current.scrollTop = e.currentTarget.scrollTop;
      }
    },
    []
  );

  // Parse value and highlight @-references
  const segments: Array<{ type: "text" | "ref"; value: string; label?: string }> = [];
  let lastIndex = 0;
  NODE_REF_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NODE_REF_REGEX.exec(value)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: value.slice(lastIndex, match.index) });
    }
    const label = match[1].slice(1);
    segments.push({ type: "ref", value: match[1], label });
    lastIndex = NODE_REF_REGEX.lastIndex;
  }
  if (lastIndex < value.length) {
    segments.push({ type: "text", value: value.slice(lastIndex) });
  }

  // Collect referenced nodes for preview bar
  const referencedNodes = useMemo(() => {
    if (!labelToId || !messagesById) return [];
    const seen = new Set<string>();
    const nodes: Array<{ label: string; msg: DbMessage; senderName: string }> = [];
    for (const seg of segments) {
      if (seg.type === "ref" && seg.label && !seen.has(seg.label)) {
        seen.add(seg.label);
        const id = labelToId.get(seg.label);
        const msg = id ? messagesById.get(id) : undefined;
        if (msg) {
          const profile = profiles?.get(msg.sender_id);
          const senderName = profile?.display_name ?? profile?.email.split("@")[0] ?? "unknown";
          nodes.push({ label: seg.label, msg, senderName });
        }
      }
    }
    return nodes;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, labelToId, messagesById, profiles]);

  const hasRefs = segments.some((s) => s.type === "ref");

  return (
    <div>
      <div className="relative">
        {/* Backdrop: only renders highlight backgrounds behind @refs, all text invisible */}
        {hasRefs && (
          <div
            ref={backdropRef}
            aria-hidden
            className={`${SHARED_STYLE} pointer-events-none absolute inset-0 overflow-hidden
                        whitespace-pre-wrap break-words border border-transparent`}
            style={{ color: "transparent" }}
          >
            {segments.map((seg, i) =>
              seg.type === "ref" ? (
                <span key={i} className="rounded bg-blue-100" style={{ color: "transparent" }}>
                  {seg.value}
                </span>
              ) : (
                <span key={i} style={{ color: "transparent" }}>{seg.value}</span>
              )
            )}
            {"\n "}
          </div>
        )}

        {/* Actual textarea with visible text */}
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          autoFocus={autoFocus}
          onKeyDown={onKeyDown}
          onScroll={handleScroll}
          className={`${SHARED_STYLE} relative border border-gray-200 bg-transparent
                      text-gray-900 placeholder:text-gray-400 focus:border-blue-500
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
        />
      </div>

      {/* Live preview of referenced nodes — floats above surrounding content */}
      {referencedNodes.length > 0 && (
        <div className="relative z-10 mt-1.5 space-y-1">
          {referencedNodes.map((ref) => {
            const preview = ref.msg.body.length > 80
              ? ref.msg.body.slice(0, 80) + "..."
              : ref.msg.body;
            return (
              <div
                key={ref.label}
                className="flex items-start gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs shadow-sm"
              >
                <span className="shrink-0 rounded bg-blue-100 px-1 py-px font-mono text-[10px] font-medium text-blue-700">
                  {ref.label}
                </span>
                <div className="min-w-0">
                  <span className="font-medium text-gray-600">{ref.senderName}: </span>
                  <span className="text-gray-500">{preview}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
