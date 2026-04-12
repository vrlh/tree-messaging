"use client";

import { useState } from "react";
import type { RootTopic, DbMessage } from "@/lib/types";
import Link from "next/link";

interface RootCardProps {
  topic: RootTopic;
  conversationId: string;
  children_previews: DbMessage[];
  profiles: Map<string, { email: string; display_name: string | null }>;
}

export function RootCard({
  topic,
  conversationId,
  children_previews,
  profiles,
}: RootCardProps) {
  const [expanded, setExpanded] = useState(false);

  const time = new Date(topic.message.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const senderName =
    topic.sender_display_name ?? topic.sender_email.split("@")[0];

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-relaxed text-gray-900">
              {topic.message.body}
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Link
              href={`/conversation/${conversationId}?node=${topic.message.id}&mode=focus`}
              className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium
                         text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2
                         focus:ring-gray-400/30"
            >
              Focus
            </Link>
            <Link
              href={`/conversation/${conversationId}?node=${topic.message.id}&mode=tree`}
              className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium
                         text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2
                         focus:ring-gray-400/30"
            >
              Tree
            </Link>
            <Link
              href={`/conversation/${conversationId}?node=${topic.message.id}&mode=forum`}
              className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium
                         text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2
                         focus:ring-gray-400/30"
            >
              Forum
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="font-medium text-gray-700">{senderName}</span>
          <span>{time}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5">
            {topic.branch_count} {topic.branch_count === 1 ? "branch" : "branches"}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5">
            {topic.total_replies} {topic.total_replies === 1 ? "reply" : "replies"}
          </span>
        </div>
      </div>

      {topic.branch_count > 0 && (
        <div className="border-t border-gray-100 px-4 py-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800
                       focus:outline-none focus:underline"
          >
            {expanded ? "Collapse" : "Expand branches"}
          </button>

          {expanded && (
            <div className="mt-2 space-y-2">
              {children_previews.map((child) => {
                const profile = profiles.get(child.sender_id);
                const childName =
                  profile?.display_name ??
                  profile?.email.split("@")[0] ??
                  "unknown";
                const childTime = new Date(
                  child.created_at
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={child.id}
                    className="flex items-start gap-2 rounded-md border border-gray-100 bg-gray-50 p-3
                               hover:border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <Link
                      href={`/conversation/${conversationId}?node=${child.id}&mode=focus`}
                      className="min-w-0 flex-1"
                    >
                      <p className="text-sm text-gray-800 line-clamp-2">
                        {child.body}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
                        <span className="font-medium text-gray-600">
                          {childName}
                        </span>
                        <span>{childTime}</span>
                      </div>
                    </Link>
                    <div className="flex shrink-0 gap-1.5">
                      <Link
                        href={`/conversation/${conversationId}?node=${child.id}&mode=focus`}
                        className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium
                                   text-gray-600 hover:bg-gray-200"
                      >
                        Focus
                      </Link>
                      <Link
                        href={`/conversation/${conversationId}?node=${child.id}&mode=tree`}
                        className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium
                                   text-gray-600 hover:bg-gray-200"
                      >
                        Tree
                      </Link>
                      <Link
                        href={`/conversation/${conversationId}?node=${child.id}&mode=forum`}
                        className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium
                                   text-gray-600 hover:bg-gray-200"
                      >
                        Forum
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
