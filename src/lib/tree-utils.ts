import type { DbMessage, MessageNode, AncestorNode, SiblingContext } from "./types";

type ProfileInfo = { email: string; display_name: string | null };

/**
 * Build a tree of MessageNode from a flat list of messages.
 * Returns only root nodes (parent_id === null), sorted by created_at.
 */
export function buildTree(
  messages: DbMessage[],
  profiles: Map<string, ProfileInfo>
): MessageNode[] {
  // Index: parent_id → children (sorted by created_at)
  const childrenMap = new Map<string, DbMessage[]>();
  const byId = new Map<string, DbMessage>();

  for (const msg of messages) {
    byId.set(msg.id, msg);
    const parentKey = msg.parent_id ?? "__roots__";
    const siblings = childrenMap.get(parentKey) ?? [];
    siblings.push(msg);
    childrenMap.set(parentKey, siblings);
  }

  // Sort each group by created_at
  for (const [, group] of childrenMap) {
    group.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  function toNode(msg: DbMessage, depth: number): MessageNode {
    const childMessages = childrenMap.get(msg.id) ?? [];
    const profile = profiles.get(msg.sender_id);
    return {
      ...msg,
      children: childMessages.map((c) => toNode(c, depth + 1)),
      child_count: childMessages.length,
      sender_display_name: profile?.display_name ?? null,
      sender_email: profile?.email ?? "unknown",
      depth,
    };
  }

  const roots = childrenMap.get("__roots__") ?? [];
  return roots.map((r) => toNode(r, 0));
}

/**
 * Walk up from a message to the root, returning the ancestor chain.
 * Ordered from root (index 0) to the target message (last index).
 */
export function getAncestorChain(
  messageId: string,
  messagesById: Map<string, DbMessage>,
  profiles: Map<string, ProfileInfo>
): AncestorNode[] {
  const chain: AncestorNode[] = [];
  let currentId: string | null = messageId;

  while (currentId) {
    const msg = messagesById.get(currentId);
    if (!msg) break;
    const profile = profiles.get(msg.sender_id);
    chain.unshift({
      id: msg.id,
      body: msg.body,
      sender_email: profile?.email ?? "unknown",
      sender_display_name: profile?.display_name ?? null,
      depth: 0, // will be fixed below
    });
    currentId = msg.parent_id;
  }

  // Fix depth values
  chain.forEach((node, i) => {
    node.depth = i;
  });

  return chain;
}

/**
 * Get sibling context: all children of the same parent, with current index.
 */
export function getSiblingContext(
  messageId: string,
  messages: DbMessage[]
): SiblingContext {
  const msg = messages.find((m) => m.id === messageId);
  if (!msg) {
    return { current_index: 0, total_siblings: 1, sibling_ids: [messageId] };
  }

  // Find all siblings (same parent_id), sorted by created_at
  const siblings = messages
    .filter((m) => m.parent_id === msg.parent_id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const index = siblings.findIndex((s) => s.id === messageId);

  return {
    current_index: Math.max(0, index),
    total_siblings: siblings.length,
    sibling_ids: siblings.map((s) => s.id),
  };
}

/**
 * Count all descendants under a given message.
 */
export function countDescendants(
  messageId: string,
  messages: DbMessage[]
): number {
  const childrenMap = new Map<string, string[]>();
  for (const msg of messages) {
    if (msg.parent_id) {
      const kids = childrenMap.get(msg.parent_id) ?? [];
      kids.push(msg.id);
      childrenMap.set(msg.parent_id, kids);
    }
  }

  let count = 0;
  const stack = [messageId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    const kids = childrenMap.get(id) ?? [];
    count += kids.length;
    stack.push(...kids);
  }
  return count;
}

/**
 * Get the default branch path from a node downward
 * (follows first child at each level by created_at).
 */
export function getDefaultBranchPath(
  messageId: string,
  messages: DbMessage[]
): DbMessage[] {
  const byId = new Map<string, DbMessage>();
  const childrenMap = new Map<string, DbMessage[]>();

  for (const msg of messages) {
    byId.set(msg.id, msg);
    if (msg.parent_id) {
      const kids = childrenMap.get(msg.parent_id) ?? [];
      kids.push(msg);
      childrenMap.set(msg.parent_id, kids);
    }
  }

  // Sort children by created_at
  for (const [, kids] of childrenMap) {
    kids.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  const path: DbMessage[] = [];
  let currentId: string | null = messageId;

  while (currentId) {
    const msg = byId.get(currentId);
    if (!msg) break;
    path.push(msg);
    const kids = childrenMap.get(currentId);
    currentId = kids && kids.length > 0 ? kids[0].id : null;
  }

  return path;
}
