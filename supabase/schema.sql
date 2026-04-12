-- ============================================
-- TreeMessages Schema
-- ============================================

-- Profiles: synced from auth.users via trigger
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  created_at timestamptz default now() not null
);

-- Conversations: a shared message space
create table conversations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz default now() not null
);

-- Conversation members: links exactly two users to a conversation
create table conversation_members (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

-- Messages: tree nodes with parent_id for branching
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  parent_id uuid references messages(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Index for tree queries: children of a parent
create index idx_messages_parent_id on messages(parent_id);
-- Index for conversation message listing
create index idx_messages_conversation_id on messages(conversation_id);
-- Index for member lookups
create index idx_conversation_members_user_id on conversation_members(user_id);

-- ============================================
-- Auto-create profile on signup
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- Auto-update updated_at on messages
-- ============================================

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger messages_updated_at
  before update on messages
  for each row execute function public.update_updated_at();

-- ============================================
-- Row Level Security
-- ============================================

alter table profiles enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;

-- Profiles: authenticated users can read all profiles, update own
create policy "profiles_select"
  on profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (id = auth.uid());

-- Conversations: members can read their conversations
create policy "conversations_select_member"
  on conversations for select
  to authenticated
  using (
    exists (
      select 1 from conversation_members
      where conversation_members.conversation_id = conversations.id
        and conversation_members.user_id = auth.uid()
    )
  );

-- Conversation members: users can see their own memberships
create policy "conversation_members_select"
  on conversation_members for select
  to authenticated
  using (user_id = auth.uid());

-- Messages: members of the conversation can read messages
create policy "messages_select_member"
  on messages for select
  to authenticated
  using (
    exists (
      select 1 from conversation_members
      where conversation_members.conversation_id = messages.conversation_id
        and conversation_members.user_id = auth.uid()
    )
  );

-- Messages: members can insert messages (sender must be self)
create policy "messages_insert_member"
  on messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversation_members
      where conversation_members.conversation_id = messages.conversation_id
        and conversation_members.user_id = auth.uid()
    )
  );

-- ============================================
-- Enable realtime for messages
-- ============================================

alter publication supabase_realtime add table messages;
