"use client";

import { useState } from "react";
import type { DbMessage } from "@/lib/types";

interface OrganizeCardProps {
  message: DbMessage;
  senderName: string;
  isOwn: boolean;
  nodeLabel: string;
  parentLabel: string | null;
  isSelected: boolean;
  hasSelection: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
  onSetParent: (childId: string, parentId: string) => void;
  onMakeRoot: (id: string) => void;
  onCombineWithNext: (id: string) => void;
  onSplit: (id: string, splitIndex: number) => void;
}

export function OrganizeCard({
  message,
  senderName,
  isOwn,
  nodeLabel,
  parentLabel,
  isSelected,
  hasSelection,
  selectedId,
  onSelect,
  onClearSelection,
  onSetParent,
  onMakeRoot,
  onCombineWithNext,
  onSplit,
}: OrganizeCardProps) {
  const [showSplit, setShowSplit] = useState(false);
  const [splitPos, setSplitPos] = useState(0);

  const time = new Date(message.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const hasNewlines = message.body.includes("\n");

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        isSelected
          ? "border-blue-400 bg-blue-50 ring-2 ring-blue-300"
          : hasSelection && selectedId !== message.id
            ? "border-gray-200 bg-white hover:border-blue-200"
            : "border-gray-200 bg-white"
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`font-medium ${isOwn ? "text-blue-600" : "text-gray-700"}`}>
          {senderName}
        </span>
        <span className="text-gray-400">{time}</span>
        {nodeLabel && (
          <span className="rounded bg-gray-100 px-0.5 font-mono text-[9px] leading-tight text-gray-400">
            {nodeLabel}
          </span>
        )}
        {parentLabel ? (
          <span className="rounded bg-green-100 px-1 py-px text-[10px] text-green-700">
            child of {parentLabel}
          </span>
        ) : (
          <span className="rounded bg-orange-100 px-1 py-px text-[10px] text-orange-700">
            root
          </span>
        )}
      </div>

      {/* Body */}
      <div className="mt-1">
        {showSplit ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              Click where you want to split:
            </p>
            <div
              className="cursor-text rounded border border-gray-200 p-2 text-sm leading-relaxed whitespace-pre-wrap"
              onClick={(e) => {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  setSplitPos(range.startOffset);
                }
              }}
            >
              {splitPos > 0 ? (
                <>
                  <span className="bg-blue-100">{message.body.slice(0, splitPos)}</span>
                  <span className="border-l-2 border-red-500" />
                  <span className="bg-yellow-100">{message.body.slice(splitPos)}</span>
                </>
              ) : (
                message.body
              )}
            </div>
            {/* Split by newline buttons */}
            {hasNewlines && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-gray-500">Split at line:</span>
                {message.body.split("\n").reduce((acc: { pos: number; label: string }[], line, i) => {
                  if (i > 0) {
                    const pos = acc.length > 0 ? acc[acc.length - 1].pos + acc[acc.length - 1].label.length + 1 : line.length + 1;
                    acc.push({ pos: message.body.indexOf("\n", acc.length > 0 ? acc[acc.length - 1].pos : 0) + 1, label: line });
                  } else {
                    acc.push({ pos: 0, label: line });
                  }
                  return acc;
                }, []).slice(1).map((item, i) => {
                  // Find each newline position
                  let nlPos = -1;
                  let count = 0;
                  for (let j = 0; j < message.body.length; j++) {
                    if (message.body[j] === "\n") {
                      count++;
                      if (count === i + 1) { nlPos = j + 1; break; }
                    }
                  }
                  if (nlPos < 0) return null;
                  return (
                    <button
                      key={i}
                      onClick={() => setSplitPos(nlPos)}
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                        splitPos === nlPos ? "bg-red-200 text-red-800" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      line {i + 2}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowSplit(false); setSplitPos(0); }}
                className="rounded-md px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              {splitPos > 0 && (
                <button
                  onClick={() => { onSplit(message.id, splitPos); setShowSplit(false); setSplitPos(0); }}
                  className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-800"
                >
                  Split here
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap">
            {message.body}
          </p>
        )}
      </div>

      {/* Actions */}
      {!showSplit && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
          {/* Selection actions */}
          {!hasSelection && (
            <button onClick={() => onSelect(message.id)} className="hover:text-gray-600">
              select
            </button>
          )}
          {isSelected && (
            <button onClick={onClearSelection} className="text-blue-600 hover:text-blue-800">
              deselect
            </button>
          )}
          {hasSelection && !isSelected && selectedId && (
            <button
              onClick={() => onSetParent(selectedId, message.id)}
              className="text-green-600 hover:text-green-800"
            >
              ← make parent of selected
            </button>
          )}

          <span className="text-gray-300">|</span>

          {/* Organize actions */}
          {message.parent_id !== null && (
            <button onClick={() => onMakeRoot(message.id)} className="hover:text-gray-600">
              make root
            </button>
          )}
          <button onClick={() => onCombineWithNext(message.id)} className="hover:text-gray-600">
            combine with next
          </button>
          {message.body.includes("\n") && (
            <button onClick={() => setShowSplit(true)} className="hover:text-gray-600">
              split
            </button>
          )}
        </div>
      )}
    </div>
  );
}
