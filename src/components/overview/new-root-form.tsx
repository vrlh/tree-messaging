"use client";

import { useState } from "react";
import { createMessage } from "@/actions/messages";

interface NewRootFormProps {
  conversationId: string;
}

export function NewRootForm({ conversationId }: NewRootFormProps) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    setSending(true);
    setError("");

    const result = await createMessage({
      conversation_id: conversationId,
      parent_id: null,
      body: body.trim(),
    });

    setSending(false);

    if (result.success) {
      setBody("");
      setOpen(false);
    } else {
      setError(result.error ?? "Failed to send");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3
                   text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700
                   focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
      >
        + New root topic
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-200 bg-white p-4"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Start a new topic..."
        rows={3}
        autoFocus
        className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm
                   placeholder:text-gray-400 focus:border-blue-500 focus:outline-none
                   focus:ring-2 focus:ring-blue-500/20"
      />

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setBody("");
            setError("");
          }}
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
    </form>
  );
}
