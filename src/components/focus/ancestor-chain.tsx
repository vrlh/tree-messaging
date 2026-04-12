"use client";

import type { AncestorNode } from "@/lib/types";

interface AncestorChainProps {
  ancestors: AncestorNode[];
  currentNodeId: string;
  onNavigate: (nodeId: string) => void;
}

export function AncestorChain({
  ancestors,
  currentNodeId,
  onNavigate,
}: AncestorChainProps) {
  if (ancestors.length <= 1) return null;

  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-gray-500">
      <a
        href="/"
        className="hover:text-gray-700 focus:outline-none focus:underline"
      >
        Overview
      </a>
      {ancestors.map((ancestor, i) => {
        const isCurrent = ancestor.id === currentNodeId;
        const label =
          ancestor.sender_display_name ??
          ancestor.sender_email.split("@")[0];
        const preview =
          ancestor.body.length > 30
            ? ancestor.body.slice(0, 30) + "..."
            : ancestor.body;

        return (
          <span key={ancestor.id} className="inline-flex items-center gap-1">
            <span className="text-gray-300">/</span>
            {isCurrent ? (
              <span className="font-medium text-gray-800" title={ancestor.body}>
                {preview}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(ancestor.id)}
                className="max-w-[200px] truncate hover:text-gray-700
                           focus:outline-none focus:underline"
                title={`${label}: ${ancestor.body}`}
              >
                {preview}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
