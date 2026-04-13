"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { revalidatePath } from "next/cache";

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, supabase };
  return { user, supabase };
}

export async function setParent(
  messageId: string,
  newParentId: string | null
): Promise<ActionResult> {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Prevent setting self as parent
  if (messageId === newParentId) {
    return { success: false, error: "Cannot set message as its own parent" };
  }

  const { error } = await supabase
    .from("messages")
    .update({ parent_id: newParentId })
    .eq("id", messageId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function makeRoot(messageId: string): Promise<ActionResult> {
  return setParent(messageId, null);
}

export async function combineMessages(
  keepId: string,
  mergeId: string
): Promise<ActionResult> {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Fetch both messages
  const { data: keepMsg } = await supabase
    .from("messages")
    .select("*")
    .eq("id", keepId)
    .single();

  const { data: mergeMsg } = await supabase
    .from("messages")
    .select("*")
    .eq("id", mergeId)
    .single();

  if (!keepMsg || !mergeMsg) {
    return { success: false, error: "Message not found" };
  }

  // Combine body text
  const combinedBody = keepMsg.body + "\n" + mergeMsg.body;

  // Update the keep message with combined body
  const { error: updateError } = await supabase
    .from("messages")
    .update({ body: combinedBody })
    .eq("id", keepId);

  if (updateError) return { success: false, error: updateError.message };

  // Re-parent any children of mergeMsg to keepMsg
  const { error: reparentError } = await supabase
    .from("messages")
    .update({ parent_id: keepId })
    .eq("parent_id", mergeId);

  if (reparentError) return { success: false, error: reparentError.message };

  // Delete the merged message
  const { error: deleteError } = await supabase
    .from("messages")
    .delete()
    .eq("id", mergeId);

  if (deleteError) return { success: false, error: deleteError.message };

  revalidatePath("/");
  return { success: true };
}

export async function splitMessage(
  messageId: string,
  splitIndex: number
): Promise<ActionResult> {
  const { user, supabase } = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: msg } = await supabase
    .from("messages")
    .select("*")
    .eq("id", messageId)
    .single();

  if (!msg) return { success: false, error: "Message not found" };

  const firstHalf = msg.body.slice(0, splitIndex).trim();
  const secondHalf = msg.body.slice(splitIndex).trim();

  if (!firstHalf || !secondHalf) {
    return { success: false, error: "Split would create empty message" };
  }

  // Update original with first half
  const { error: updateError } = await supabase
    .from("messages")
    .update({ body: firstHalf })
    .eq("id", messageId);

  if (updateError) return { success: false, error: updateError.message };

  // Insert second half as sibling (same parent)
  const { data: newMsg, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id: msg.conversation_id,
      parent_id: msg.parent_id,
      sender_id: msg.sender_id,
      body: secondHalf,
      created_at: msg.created_at,
    })
    .select()
    .single();

  if (insertError) return { success: false, error: insertError.message };

  revalidatePath("/");
  return { success: true, message: newMsg };
}
