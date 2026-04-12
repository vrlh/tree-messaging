import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BranchView } from "@/components/focus/branch-view";
import { APP_NAME } from "@/lib/constants";
import type { DbMessage } from "@/lib/types";

export default async function FocusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ node?: string }>;
}) {
  const { id: conversationId } = await params;
  const { node: nodeId } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify membership
  const { data: membership } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/");

  // Fetch conversation
  const { data: conversation } = await supabase
    .from("conversations")
    .select("title")
    .eq("id", conversationId)
    .single();

  // Fetch all messages
  const { data: allMessages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const messages: DbMessage[] = allMessages ?? [];

  // Determine which node to focus on
  let focusNodeId = nodeId ?? null;
  if (!focusNodeId && messages.length > 0) {
    // Default to the first root message
    const firstRoot = messages.find((m) => m.parent_id === null);
    focusNodeId = firstRoot?.id ?? messages[0].id;
  }

  if (!focusNodeId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">No messages in this conversation.</p>
      </div>
    );
  }

  // Fetch profiles
  const { data: profileRows } = await supabase.from("profiles").select("*");

  const profiles: Record<
    string,
    { email: string; display_name: string | null }
  > = {};
  for (const p of profileRows ?? []) {
    profiles[p.id] = { email: p.email, display_name: p.display_name };
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium
                       text-gray-600 hover:bg-gray-200 focus:outline-none
                       focus:ring-2 focus:ring-gray-400/30"
          >
            &larr; Overview
          </a>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {conversation?.title ?? APP_NAME}
            </h1>
            <p className="text-xs text-gray-500">Focus mode</p>
          </div>
        </div>
      </header>

      <BranchView
        conversationId={conversationId}
        initialMessages={messages}
        initialNodeId={focusNodeId}
        profiles={profiles}
      />
    </div>
  );
}
