import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { countDescendants } from "@/lib/tree-utils";
import type { RootTopic, DbMessage } from "@/lib/types";
import { RootList } from "@/components/overview/root-list";
import { APP_NAME } from "@/lib/constants";

export default async function OverviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get user's conversation membership
  const { data: memberships } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">
          No conversations yet. Ask the other person to set up the shared space.
        </p>
      </div>
    );
  }

  const conversationId = memberships[0].conversation_id;

  // Fetch conversation title
  const { data: conversation } = await supabase
    .from("conversations")
    .select("title")
    .eq("id", conversationId)
    .single();

  // Fetch all messages for counting
  const { data: allMessages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const messages: DbMessage[] = allMessages ?? [];

  // Fetch profiles
  const { data: profileRows } = await supabase.from("profiles").select("*");

  const profiles: Record<
    string,
    { email: string; display_name: string | null }
  > = {};
  for (const p of profileRows ?? []) {
    profiles[p.id] = { email: p.email, display_name: p.display_name };
  }

  // Build root topics with stats
  const roots = messages.filter((m) => m.parent_id === null);
  const directChildren = messages.filter((m) =>
    roots.some((r) => r.id === m.parent_id)
  );

  const childrenByRoot: Record<string, DbMessage[]> = {};
  for (const child of directChildren) {
    const key = child.parent_id!;
    childrenByRoot[key] = childrenByRoot[key] ?? [];
    childrenByRoot[key].push(child);
  }

  const topics: RootTopic[] = roots.map((root) => {
    const profile = profiles[root.sender_id];
    const branchCount = (childrenByRoot[root.id] ?? []).length;
    const totalReplies = countDescendants(root.id, messages);

    return {
      message: root,
      sender_display_name: profile?.display_name ?? null,
      sender_email: profile?.email ?? "unknown",
      total_replies: totalReplies,
      branch_count: branchCount,
    };
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{APP_NAME}</h1>
          <p className="text-sm text-gray-500">
            {conversation?.title ?? "Conversation"}
          </p>
        </div>
        <a
          href="/auth/signout"
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Sign out
        </a>
      </header>

      <RootList
        topics={topics}
        conversationId={conversationId}
        childrenByRoot={childrenByRoot}
        profiles={profiles}
      />
    </div>
  );
}
