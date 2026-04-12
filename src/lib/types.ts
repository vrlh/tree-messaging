// ──────────────────────────────────────────────
// Database row types (match Supabase schema 1:1)
// ──────────────────────────────────────────────

export interface DbProfile {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface DbConversation {
  id: string;
  title: string;
  created_at: string;
}

export interface DbConversationMember {
  conversation_id: string;
  user_id: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  parent_id: string | null;
  sender_id: string;
  body: string;
  edited: boolean;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────
// App-level types (enriched for UI)
// ──────────────────────────────────────────────

/** A message node with computed tree metadata */
export interface MessageNode extends DbMessage {
  children: MessageNode[];
  child_count: number;
  sender_display_name: string | null;
  sender_email: string;
  depth: number;
}

/** Root topic summary for overview mode */
export interface RootTopic {
  message: DbMessage;
  sender_display_name: string | null;
  sender_email: string;
  total_replies: number;
  branch_count: number; // direct children count
}

/** Ancestor chain item for focus mode breadcrumbs */
export interface AncestorNode {
  id: string;
  body: string;
  sender_email: string;
  sender_display_name: string | null;
  depth: number;
}

/** Sibling context for left/right navigation */
export interface SiblingContext {
  current_index: number;
  total_siblings: number;
  sibling_ids: string[];
}

// ──────────────────────────────────────────────
// Action payloads
// ──────────────────────────────────────────────

export interface CreateMessagePayload {
  conversation_id: string;
  parent_id: string | null;
  body: string;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  message?: DbMessage;
}
