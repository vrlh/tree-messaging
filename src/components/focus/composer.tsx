"use client";

import { useState } from "react";
import { createMessage } from "@/actions/messages";
import type { DbMessage } from "@/lib/types";

interface ComposerProps {
  conversationId: string;
  parentId: string | null;
  mode: "reply" | "sibling";
  onClose: () => void;
  onSent: (message: DbMessage) => void;
}

export function Composer({
  conversationId,
  parentId,
  mode,
  onClose,
  onSent,
}: ComposerProps) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const label = mode === "reply" ? "Reply" : "Add alternative";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    setSending(true);
    setError("");

    const result = await createMessage({
      conversation_id: conversationId,
      parent_id: parentId,
      body: body.trim(),
    });

    setSending(false);

    if (result.success && result.message) {
      setBody("");
      onSent(result.message);
    } else if (!result.success) {
      setError(result.error ?? "Failed to send");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-blue-200 bg-blue-50/30 p-3"
    >
      <p className="mb-2 text-xs font-medium text-blue-700">{label}</p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          mode === "reply" ? "Write a reply..." : "Write an alternative..."
        }
        rows={3}
        autoFocus
        className="w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2
                   text-sm placeholder:text-gray-400 focus:border-blue-500
                   focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {navigator.platform.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to send
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100
                       focus:outline-none focus:ring-2 focus:ring-gray-400/30"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white
                       hover:bg-gray-800 disabled:opacity-50 focus:outline-none
                       focus:ring-2 focus:ring-gray-900/20"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </form>
  );
}
