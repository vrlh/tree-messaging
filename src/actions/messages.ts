"use server";

import type { ActionResult, CreateMessagePayload } from "@/lib/types";

/**
 * Create a new message node (child reply, sibling, or root).
 * Validates user is authenticated + member of the conversation.
 */
export async function createMessage(
  _payload: CreateMessagePayload
): Promise<ActionResult> {
  throw new Error("not implemented");
}
