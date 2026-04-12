import type { DbMessage } from "./types";

export interface NodeLabelMaps {
  idToLabel: Map<string, string>;
  labelToId: Map<string, string>;
}

/**
 * Build bidirectional maps between message IDs and hierarchical labels.
 * Roots: T1, T2, T3 (by created_at). Children: T1-1, T1-2. Nested: T1-2-1.
 */
export function buildNodeLabelMaps(messages: DbMessage[]): NodeLabelMaps {
  const idToLabel = new Map<string, string>();
  const labelToId = new Map<string, string>();

  // Group children by parent
  const childrenOf = new Map<string, DbMessage[]>();
  const roots: DbMessage[] = [];

  for (const msg of messages) {
    if (msg.parent_id === null) {
      roots.push(msg);
    } else {
      const siblings = childrenOf.get(msg.parent_id) ?? [];
      siblings.push(msg);
      childrenOf.set(msg.parent_id, siblings);
    }
  }

  // Sort by created_at
  roots.sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const [, siblings] of childrenOf) {
    siblings.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  // Assign labels recursively
  function assign(msgId: string, label: string) {
    idToLabel.set(msgId, label);
    labelToId.set(label, msgId);

    const children = childrenOf.get(msgId) ?? [];
    children.forEach((child, i) => {
      assign(child.id, `${label}-${i + 1}`);
    });
  }

  roots.forEach((root, i) => {
    assign(root.id, `T${i + 1}`);
  });

  return { idToLabel, labelToId };
}

/** Regex matching @-references like @T1, @T1-2, @T1-2-3 */
export const NODE_REF_REGEX = /(@T\d+(?:-\d+)*)/g;

/** Split body text into segments of plain text and node references */
export function parseNodeReferences(
  body: string
): Array<{ type: "text"; value: string } | { type: "ref"; label: string }> {
  const segments: Array<
    { type: "text"; value: string } | { type: "ref"; label: string }
  > = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state
  NODE_REF_REGEX.lastIndex = 0;

  while ((match = NODE_REF_REGEX.exec(body)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: body.slice(lastIndex, match.index) });
    }
    // The reference (strip the @ prefix)
    segments.push({ type: "ref", label: match[1].slice(1) });
    lastIndex = NODE_REF_REGEX.lastIndex;
  }

  // Remaining text
  if (lastIndex < body.length) {
    segments.push({ type: "text", value: body.slice(lastIndex) });
  }

  return segments;
}
