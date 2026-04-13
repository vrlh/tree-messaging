import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BranchView } from "@/components/focus/branch-view";
import { TreeView } from "@/components/tree/tree-view";
import { ForumView } from "@/components/forum/forum-view";
import { OrganizeView } from "@/components/organize/organize-view";
import { APP_NAME } from "@/lib/constants";
import type { DbMessage } from "@/lib/types";

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ node?: string; mode?: string }>;
}) {
  const { id: conversationId } = await params;
  const { node: nodeId, mode } = await searchParams;

  const viewMode = mode === "tree" ? "tree" : mode === "forum" ? "forum" : mode === "organize" ? "organize" : "focus";

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
  // For focus mode, default to first root if no node specified
  if (!focusNodeId && viewMode === "focus" && messages.length > 0) {
    const firstRoot = messages.find((m) => m.parent_id === null);
    focusNodeId = firstRoot?.id ?? messages[0].id;
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

  const nodeParam = focusNodeId ? `node=${focusNodeId}&` : "";
  const modeLinks = {
    focus: `/conversation/${conversationId}?${nodeParam}mode=focus`,
    tree: `/conversation/${conversationId}?${nodeParam}mode=tree`,
    forum: `/conversation/${conversationId}?${nodeParam}mode=forum`,
    organize: `/conversation/${conversationId}?mode=organize`,
  };

  const containerClass = viewMode === "tree"
    ? "max-w-full overflow-x-hidden"
    : "max-w-3xl";

  return (
    <div className={`mx-auto px-4 py-8 ${containerClass}`}>
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
            <p className="text-xs text-gray-500">
              {viewMode === "focus" ? "Focus mode" : viewMode === "tree" ? "Tree mode" : viewMode === "forum" ? "Forum mode" : "Organize mode"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(["focus", "tree", "forum", "organize"] as const).map((m) => (
            <a
              key={m}
              href={modeLinks[m]}
              className={`rounded-md px-2.5 py-1 text-xs font-medium focus:outline-none
                         focus:ring-2 focus:ring-gray-400/30 ${
                viewMode === m
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </a>
          ))}
          <span className="ml-1 text-xs text-gray-500">{user.email}</span>
        </div>
      </header>

      {viewMode === "focus" && focusNodeId ? (
        <BranchView
          conversationId={conversationId}
          initialMessages={messages}
          initialNodeId={focusNodeId}
          currentUserId={user.id}
          profiles={profiles}
        />
      ) : viewMode === "tree" ? (
        <TreeView
          conversationId={conversationId}
          initialMessages={messages}
          currentUserId={user.id}
          rootNodeId={focusNodeId}
          profiles={profiles}
        />
      ) : viewMode === "forum" ? (
        <ForumView
          conversationId={conversationId}
          initialMessages={messages}
          currentUserId={user.id}
          rootNodeId={focusNodeId}
          profiles={profiles}
        />
      ) : (
        <OrganizeView
          conversationId={conversationId}
          initialMessages={messages}
          currentUserId={user.id}
          profiles={profiles}
        />
      )}
    </div>
  );
}
