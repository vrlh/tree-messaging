import type { DbMessage, MessageNode, AncestorNode, SiblingContext } from "./types";

/**
 * Build a tree of MessageNode from a flat list of messages.
 * Returns only root nodes (parent_id === null).
 */
export function buildTree(
  _messages: DbMessage[],
  _profiles: Map<string, { email: string; display_name: string | null }>
): MessageNode[] {
  throw new Error("not implemented");
}

/**
 * Walk up from a message to the root, returning the ancestor chain.
 * Ordered from root (index 0) to the target message (last index).
 */
export function getAncestorChain(
  _messageId: string,
  _messagesById: Map<string, DbMessage>,
  _profiles: Map<string, { email: string; display_name: string | null }>
): AncestorNode[] {
  throw new Error("not implemented");
}

/**
 * Get sibling context: all children of the same parent, with current index.
 */
export function getSiblingContext(
  _messageId: string,
  _messagesById: Map<string, DbMessage>
): SiblingContext {
  throw new Error("not implemented");
}

/**
 * Collect all descendant IDs under a given message (for counting).
 */
export function countDescendants(
  _messageId: string,
  _childrenMap: Map<string, string[]>
): number {
  throw new Error("not implemented");
}

/**
 * Get the default branch path from a node downward
 * (follows first child at each level).
 */
export function getDefaultBranchPath(
  _messageId: string,
  _childrenMap: Map<string, DbMessage[]>
): DbMessage[] {
  throw new Error("not implemented");
}
