# TreeMessages

Private tree-based messaging app for exactly two people. Conversations branch like a tree — every message is a node with zero or one parent and zero or many children. Reply anywhere, branch from anything, navigate between sibling alternatives.

## Tech Stack

- **Next.js 15** (App Router, Server Components, Server Actions)
- **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (Postgres, Auth with magic links, Realtime)
- **Vercel** (deployment)

## Features

- **Overview mode** — see all root topics with branch/reply counts, expand to preview children
- **Focus mode** — view one branch path in detail, navigate ancestors, switch between sibling branches with left/right arrows
- **Real tree model** — messages linked by `parent_id`, not faked with quotes or threading
- **Realtime** — both users see new messages instantly via Supabase Realtime
- **Magic link auth** — only two allowlisted emails can access the app
- **RLS** — row-level security ensures conversation members can only access their data

## Local Development

### Prerequisites

- Node.js 20+
- A Supabase project ([supabase.com](https://supabase.com))

### 1. Clone and install

```bash
git clone <your-repo-url>
cd treeMessages
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ALLOWED_EMAIL_1=alice@example.com
NEXT_PUBLIC_ALLOWED_EMAIL_2=bob@example.com
```

### 3. Set up the database

In your Supabase dashboard, go to **SQL Editor** and run:

1. `supabase/schema.sql` — creates tables, triggers, RLS policies, and enables realtime

### 4. Configure Supabase Auth

In Supabase dashboard → **Authentication** → **Providers**:

1. Ensure **Email** provider is enabled
2. Enable **Confirm email** (for magic links)
3. Under **URL Configuration**, set **Site URL** to `http://localhost:3000`
4. Add `http://localhost:3000/auth/callback` to **Redirect URLs**

### 5. Run the dev server

```bash
npm run dev
```

Open `http://localhost:3000` and sign in with one of the allowed emails.

### 6. Seed data

After **both** allowed users have signed in at least once (so their profiles exist), run `supabase/seed.sql` in the SQL Editor. This creates a conversation with multiple branching root topics.

## Deployment to Vercel

### 1. Push to GitHub

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ALLOWED_EMAIL_1`
   - `NEXT_PUBLIC_ALLOWED_EMAIL_2`
4. Deploy

### 3. Update Supabase redirect URLs

In Supabase dashboard → **Authentication** → **URL Configuration**:

1. Set **Site URL** to your Vercel production URL (e.g., `https://your-app.vercel.app`)
2. Add `https://your-app.vercel.app/auth/callback` to **Redirect URLs**

### 4. Enable Realtime

In Supabase dashboard → **Database** → **Replication**:

Ensure the `messages` table is included in the `supabase_realtime` publication. The schema.sql does this, but verify it's active.

## Project Structure

```
src/
  app/
    page.tsx                    # Overview mode (server component)
    layout.tsx                  # Root layout
    login/page.tsx              # Magic link login
    auth/callback/route.ts      # Auth callback handler
    auth/signout/route.ts       # Sign-out handler
    conversation/[id]/page.tsx  # Focus mode (server component)
  components/
    auth/login-form.tsx         # Login form (client)
    overview/
      root-list.tsx             # Root topic list (client)
      root-card.tsx             # Expandable root card (client)
      new-root-form.tsx         # New topic composer (client)
    focus/
      branch-view.tsx           # Focus mode orchestrator (client)
      message-card.tsx          # Message display + actions (client)
      ancestor-chain.tsx        # Breadcrumb navigation (client)
      composer.tsx              # Reply/sibling composer (client)
  lib/
    types.ts                    # All TypeScript types
    constants.ts                # Allowed emails, app config
    tree-utils.ts               # Tree building + traversal
    supabase/
      client.ts                 # Browser Supabase client
      server.ts                 # Server Supabase client
      middleware.ts             # Middleware Supabase client
  actions/
    messages.ts                 # createMessage server action
  middleware.ts                 # Auth + allowlist route protection
supabase/
  schema.sql                    # Database schema + RLS
  seed.sql                      # Mock conversation data
```

## Deployment Checklist

- [ ] Supabase project created
- [ ] `schema.sql` executed in SQL Editor
- [ ] Email auth provider enabled with magic links
- [ ] Site URL and redirect URLs configured in Supabase
- [ ] Realtime enabled for `messages` table
- [ ] Environment variables set in Vercel
- [ ] Both users signed in at least once
- [ ] `seed.sql` executed after both users exist
- [ ] Verify RLS policies are active (check Supabase dashboard → Auth → Policies)
