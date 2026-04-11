-- ============================================
-- Seed data for TreeMessages
-- Run AFTER two users have signed up via magic link.
-- Replace the UUIDs below with actual auth.users IDs.
-- ============================================

-- Step 1: Look up the two user IDs from profiles
-- (These CTEs pull the first two profiles by created_at)
do $$
declare
  alice_id uuid;
  bob_id uuid;
  conv_id uuid;
  -- Root 1: Weekend plans
  r1 uuid;
  r1_c1 uuid;   -- Beach sounds great
  r1_c1_c1 uuid; -- Let's go Saturday
  r1_c1_c1_c1 uuid; -- Perfect, snacks
  r1_c1_c2 uuid; -- Or maybe Sunday
  r1_c1_c2_c1 uuid; -- Sunday works
  r1_c2 uuid;   -- Hiking instead
  r1_c2_c1 uuid; -- Mount Tam
  r1_c2_c1_c1 uuid; -- Sunset trail
  r1_c2_c1_c2 uuid; -- Waterfall loop
  -- Root 2: Book recommendation
  r2 uuid;
  r2_c1 uuid;
  r2_c1_c1 uuid;
  -- Root 3: App idea
  r3 uuid;
  r3_c1 uuid;
  r3_c1_c1 uuid;
  r3_c2 uuid;
begin
  -- Get the two users (ordered by signup)
  select id into alice_id from profiles order by created_at asc limit 1;
  select id into bob_id from profiles order by created_at asc offset 1 limit 1;

  if alice_id is null or bob_id is null then
    raise exception 'Need exactly 2 profiles to seed. Sign up both users first.';
  end if;

  -- Create conversation
  conv_id := gen_random_uuid();
  insert into conversations (id, title) values (conv_id, 'Shared Space');

  -- Add members
  insert into conversation_members (conversation_id, user_id) values
    (conv_id, alice_id),
    (conv_id, bob_id);

  -- ==========================================
  -- Root 1: Weekend plans (deep branching tree)
  -- ==========================================
  r1 := gen_random_uuid();
  insert into messages (id, conversation_id, parent_id, sender_id, body, created_at) values
    (r1, conv_id, null, alice_id, 'What should we do this weekend? I''m open to anything outdoors.', now() - interval '3 days');

  -- Branch A: Beach
  r1_c1 := gen_random_uuid();
  insert into messages (id, conversation_id, parent_id, sender_id, body, created_at) values
    (r1_c1, conv_id, r1, bob_id, 'Beach sounds great! The weather forecast looks perfect.', now() - interval '3 days' + interval '1 hour');

  -- Branch A → Saturday
  r1_c1_c1 := gen_random_uuid();
  insert into messages (id, conversation_id, parent_id, sender_id, body, created_at) values
    (r1_c1_c1, conv_id, r1_c1, alice_id, 'Let''s go Saturday morning, we can grab coffee on the way.', now() - interval '3 days' + interval '2 hours');

  r1_c1_c1_c1 := gen_random_uuid();
  insert into messages (id, conversation_id, parent_id, sender_id, body, created_at) values
    (r1_c1_c1_c1, conv_id, r1_c1_c1, bob_id, 'Perfect, I''ll bring snacks and sunscreen.', now() - interval '3 days' + interval '3 hours');

  -- Branch A → Sunday (sibling of Saturday branch)
  r1_c1_c2 := gen_random_uuid();
  insert into messages (id, conversation_id, parent_id, sender_id, body, created_at) values
    (r1_c1_c2, conv_id, r1_c1, alice_id, 'Or maybe Sunday instead? Saturday might rain after all.', now() - interval '2 days');

  r1_c1_c2_c1 := gen_random_uuid();
  insert into messages (id, conversation_id, parent_id, sender_id, body, created_at) values
    (r1_c1_c2_c1, conv_id, r1_c1_c2, bob_id, 'Sunday works better for me actually. Less crowded too.', now() - interval '2 days' + interval '1 hour');

  -- Branch B: Hiking (sibling of Beach)
  r1_c2 := gen_random_uuid();
  insert into messages (id, conversation_id, parent_id, sender_id, body, created_at) values
    (r1_c2, conv_id, r1, bob_id, 'How about hiking instead? I''ve been wanting to get back on the trails.', now() - interval '2 days' + interval '5 hours');

  r1_c2_c1 := gen_random_uuid();
  insert into messages (id, conversation_id, parent_id, sender_id, body, created_at) values
    (r1_c2_c1, conv_id, r1_c2, alice_id, 'Mount Tam trail? It''s about 2 hours round trip.', now() - interval '2 days' + interval '6 hours');

  -- Two sibling responses to Mount Tam
  r1_c2_c1_c1 := gen_random_uuid();
  insert into messages (id, conversation_id, parent_id, sender_id, body, created_at) values
    (r1_c2_c1_c1, conv_id, r1_c2_c1, bob_id, 'Yes! The sunset trail is incredible this time of year.', now() - interval '2 days' + interval '7 hours');

  r1_c2_c1_c2 := gen_random_uuid();
  insert into messages (id, conversation_id, parent_id, sender_id, body, created_at) values
    (r1_c2_c1_c2, conv_id, r1_c2_c1, bob_id, 'Or the waterfall loop — it''s shorter but really scenic.', now() - interval '2 days' + interval '8 hours');

  -- ==========================================
  -- Root 2: Book recommendation (simple chain)
  -- ==========================================
  r2 := gen_random_uuid();
  insert into messages (id, conversation_id, parent_id, sender_id, body, created_at) values
    (r2, conv_id, null, bob_id, 'Read any good books lately? I need something for the flight next week.', now() - interval '1 day');

  r2_c1 := gen_random_uuid();
  insert into messages (id, conversation_id, parent_id, sender_id, body, created_at) values
    (r2_c1, conv_id, r2, alice_id, 'The Glass Bead Game by Hesse — it''s dense but beautiful. Perfect for a long flight.', now() - interval '1 day' + interval '2 hours');

  r2_c1_c1 := gen_random_uuid();
  insert into messages (id, conversation_id, parent_id, sender_id, body, created_at) values
    (r2_c1_c1, conv_id, r2_c1, bob_id, 'Added to my list! I''ll grab it at the airport bookstore.', now() - interval '1 day' + interval '3 hours');

  -- ==========================================
  -- Root 3: App idea (branching alternatives)
  -- ==========================================
  r3 := gen_random_uuid();
  insert into messages (id, conversation_id, parent_id, sender_id, body, created_at) values
    (r3, conv_id, null, alice_id, 'I want to build a side project. What kind of app should we make?', now() - interval '5 hours');

  -- Branch A: Tree messaging
  r3_c1 := gen_random_uuid();
  insert into messages (id, conversation_id, parent_id, sender_id, body, created_at) values
    (r3_c1, conv_id, r3, alice_id, 'What about a tree-based messaging app? Conversations that branch.', now() - interval '4 hours');

  r3_c1_c1 := gen_random_uuid();
  insert into messages (id, conversation_id, parent_id, sender_id, body, created_at) values
    (r3_c1_c1, conv_id, r3_c1, bob_id, 'Like what we''re using right now? Very meta. I love it.', now() - interval '3 hours');

  -- Branch B: Recipe organizer (sibling)
  r3_c2 := gen_random_uuid();
  insert into messages (id, conversation_id, parent_id, sender_id, body, created_at) values
    (r3_c2, conv_id, r3, bob_id, 'A recipe organizer that auto-generates grocery lists from meal plans.', now() - interval '2 hours');

  raise notice 'Seed complete! Conversation: %, Alice: %, Bob: %', conv_id, alice_id, bob_id;
end;
$$;
