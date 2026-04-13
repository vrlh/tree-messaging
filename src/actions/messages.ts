"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult, CreateMessagePayload } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function createMessage(
  payload: CreateMessagePayload
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: membership } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", payload.conversation_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { success: false, error: "Not a member of this conversation" };
  }

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: payload.conversation_id,
      parent_id: payload.parent_id,
      sender_id: user.id,
      body: payload.body,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath(`/conversation/${payload.conversation_id}`);

  return { success: true, message };
}

export async function updateMessage(
  messageId: string,
  body: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: message, error } = await supabase
    .from("messages")
    .update({ body, edited: true })
    .eq("id", messageId)
    .eq("sender_id", user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");

  return { success: true, message };
}
