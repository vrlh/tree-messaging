"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildNodeLabelMaps } from "@/lib/node-numbers";
import type { DbMessage } from "@/lib/types";
import { OrganizeCard } from "./organize-card";
import { updateMessage } from "@/actions/messages";
import {
  setParent,
  makeRoot,
  deleteMessage,
  combineMessages,
  splitMessage,
} from "@/actions/organize";

interface OrganizeViewProps {
  conversationId: string;
  initialMessages: DbMessage[];
  currentUserId: string;
  profiles: Record<string, { email: string; display_name: string | null }>;
}

export function OrganizeView({
  conversationId,
  initialMessages,
  currentUserId,
  profiles,
}: OrganizeViewProps) {
  const [messages, setMessages] = useState<DbMessage[]>(initialMessages);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "roots" | "orphans">("all");
  const [error, setError] = useState("");

  const profileMap = useMemo(
    () => new Map(Object.entries(profiles)),
    [profiles]
  );
  const { idToLabel } = useMemo(
    () => buildNodeLabelMaps(messages),
    [messages]
  );

  // Build parent label lookup
  const parentLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of messages) {
      if (m.parent_id) {
        const label = idToLabel.get(m.parent_id);
        if (label) map.set(m.id, label);
      }
    }
    return map;
  }, [messages, idToLabel]);

  // No realtime refetch in organize mode — local state is authoritative
  // The server actions update the DB, and local state is updated optimistically

  // Filter messages
  const filtered = useMemo(() => {
    const sorted = [...messages].sort(
      (a, b) => a.created_at.localeCompare(b.created_at)
    );
    if (filter === "roots") return sorted.filter((m) => m.parent_id === null);
    if (filter === "orphans") {
      const ids = new Set(messages.map((m) => m.id));
      return sorted.filter(
        (m) => m.parent_id !== null && !ids.has(m.parent_id)
      );
    }
    return sorted;
  }, [messages, filter]);

  // Count stats
  const rootCount = messages.filter((m) => m.parent_id === null).length;
  const childCount = messages.filter((m) => m.parent_id !== null).length;

  async function handleSetParent(childId: string, parentId: string) {
    setError("");
    const result = await setParent(childId, parentId);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === childId ? { ...m, parent_id: parentId } : m))
    );
    setSelectedId(null);
  }

  async function handleMakeRoot(id: string) {
    setError("");
    const result = await makeRoot(id);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, parent_id: null } : m))
    );
  }

  async function handleDelete(id: string) {
    setError("");
    const result = await deleteMessage(id);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    setMessages((prev) => {
      const msg = prev.find((m) => m.id === id);
      return prev
        .filter((m) => m.id !== id)
        .map((m) => m.parent_id === id ? { ...m, parent_id: msg?.parent_id ?? null } : m);
    });
    if (selectedId === id) setSelectedId(null);
  }

  async function handleEdit(id: string, newBody: string) {
    setError("");
    const result = await updateMessage(id, newBody);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, body: newBody } : m))
    );
  }

  async function handleCombineWithNext(id: string) {
    setError("");
    const sorted = [...messages].sort((a, b) =>
      a.created_at.localeCompare(b.created_at)
    );
    const idx = sorted.findIndex((m) => m.id === id);
    if (idx < 0 || idx >= sorted.length - 1) {
      setError("No next message to combine with");
      return;
    }
    const next = sorted[idx + 1];
    const result = await combineMessages(id, next.id);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    // Update local state
    setMessages((prev) => {
      const keep = prev.find((m) => m.id === id);
      if (!keep) return prev;
      return prev
        .filter((m) => m.id !== next.id)
        .map((m) =>
          m.id === id
            ? { ...m, body: keep.body + "\n" + next.body }
            : m.parent_id === next.id
              ? { ...m, parent_id: id }
              : m
        );
    });
  }

  async function handleSplit(id: string, splitIndex: number) {
    setError("");
    const result = await splitMessage(id, splitIndex);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    // Refetch to get the new message
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
        <span className="text-gray-500">
          {messages.length} messages ({rootCount} roots, {childCount} organized)
        </span>
        <span className="text-gray-300">|</span>
        {(["all", "roots", "orphans"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-2 py-1 ${
              filter === f
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f} {f === "all" ? `(${messages.length})` : f === "roots" ? `(${rootCount})` : ""}
          </button>
        ))}
        {selectedId && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-blue-600">
              Selected: {idToLabel.get(selectedId) ?? "..."} — click another message to set it as parent
            </span>
          </>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Message list */}
      <div className="space-y-2">
        {filtered.map((msg) => {
          const profile = profileMap.get(msg.sender_id);
          const senderName =
            profile?.display_name ?? profile?.email.split("@")[0] ?? "unknown";
          const isOwn = msg.sender_id === currentUserId;

          return (
            <OrganizeCard
              key={msg.id}
              message={msg}
              senderName={senderName}
              isOwn={isOwn}
              nodeLabel={idToLabel.get(msg.id) ?? ""}
              parentLabel={parentLabels.get(msg.id) ?? null}
              isSelected={selectedId === msg.id}
              hasSelection={selectedId !== null}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onClearSelection={() => setSelectedId(null)}
              onSetParent={handleSetParent}
              onMakeRoot={handleMakeRoot}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onCombineWithNext={handleCombineWithNext}
              onSplit={handleSplit}
            />
          );
        })}
      </div>
    </div>
  );
}
