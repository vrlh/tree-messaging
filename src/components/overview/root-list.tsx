"use client";

import type { RootTopic, DbMessage } from "@/lib/types";
import { RootCard } from "./root-card";
import { NewRootForm } from "./new-root-form";

interface RootListProps {
  topics: RootTopic[];
  conversationId: string;
  childrenByRoot: Record<string, DbMessage[]>;
  profiles: Record<string, { email: string; display_name: string | null }>;
}

export function RootList({
  topics,
  conversationId,
  childrenByRoot,
  profiles,
}: RootListProps) {
  const profileMap = new Map(Object.entries(profiles));

  return (
    <div className="space-y-3">
      {topics.map((topic) => (
        <RootCard
          key={topic.message.id}
          topic={topic}
          conversationId={conversationId}
          children_previews={childrenByRoot[topic.message.id] ?? []}
          profiles={profileMap}
        />
      ))}
      <NewRootForm conversationId={conversationId} />
    </div>
  );
}
