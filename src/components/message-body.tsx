"use client";

import { parseNodeReferences } from "@/lib/node-numbers";
import { NodeReference } from "./node-reference";
import type { DbMessage } from "@/lib/types";

interface MessageBodyProps {
  body: string;
  labelToId: Map<string, string>;
  messagesById: Map<string, DbMessage>;
  profiles: Map<string, { email: string; display_name: string | null }>;
  conversationId: string;
  className?: string;
}

export function MessageBody({
  body,
  labelToId,
  messagesById,
  profiles,
  conversationId,
  className,
}: MessageBodyProps) {
  const segments = parseNodeReferences(body);

  // If no references found, render plain text
  if (segments.length === 1 && segments[0].type === "text") {
    return (
      <p className={className ?? "text-sm leading-relaxed text-gray-900 whitespace-pre-wrap"}>
        {body}
      </p>
    );
  }

  return (
    <p className={className ?? "text-sm leading-relaxed text-gray-900 whitespace-pre-wrap"}>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <span key={i}>{seg.value}</span>;
        }
        const targetId = labelToId.get(seg.label);
        const targetMsg = targetId ? messagesById.get(targetId) : undefined;
        const senderName = targetMsg
          ? (profiles.get(targetMsg.sender_id)?.display_name ??
             profiles.get(targetMsg.sender_id)?.email.split("@")[0])
          : undefined;

        return (
          <NodeReference
            key={i}
            label={seg.label}
            targetId={targetId}
            targetMessage={targetMsg}
            senderName={senderName}
            conversationId={conversationId}
          />
        );
      })}
    </p>
  );
}
