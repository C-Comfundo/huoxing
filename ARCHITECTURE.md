# ARCHITECTURE.md

## Tech Stack

- **Frontend & Routing**: Next.js (App Router) + TypeScript
- **Database & Auth**: Supabase (PostgreSQL + Auth + RLS)
- **Email Service**: Resend
- **Deployment**: Cloudflare Workers (via OpenNext)

---

## Core Architecture Constraints

### 1. Permission Layering: Anon Key for Public, Service Role Key for Admin

All public read operations (article lists, article detail, issue lists) must use
the Anon Key so that RLS policies are enforced normally.

Service Role Key is only permitted for:
- Publishing / unpublishing articles in the editorial backend
- Managing submission records in the editorial backend
- Managing issues in the editorial backend

Never use the Service Role Key to bypass RLS for reads that should be
restricted.

### 2. Admin Authorization Is Centralized in getAdminAccess()

Every operation that requires admin identity must call `getAdminAccess()` in
`lib/admin-access.ts` first. Authorization logic must not be duplicated in
individual components or pages.

`getAdminAccess()` enforces a two-step check:
1. Confirm the user is authenticated via Supabase Auth
2. Query `profiles.is_admin` to confirm admin status

Both steps are required — neither alone is sufficient.

### 3. Content Visibility Is Controlled by Database Fields, Not Runtime Filtering

Articles use the `is_published` field; issues use the `published_at` timestamp
to control public visibility. All public-facing queries must filter unpublished
content at the SQL level (`.eq("is_published", true)`). Pulling drafts into the
application layer and filtering there is not allowed.

### 4. Write Operations Must Persist to the Database Before Calling External Services

Any operation that involves an external service (Resend, etc.) must follow this
sequence:
1. Write the record to the database with status `pending`
2. Call the external service
3. Update the status to `sent` or `failed` based on the result

Relying solely on the external service's return value to determine success is
not allowed. This ensures data is never silently lost if the external service
is unavailable, and enables retry logic.

### 5. Counter Fields Must Be Updated with Atomic Database Operations

Fields like `view_count` and `echo_count` must be incremented via atomic
database operations. Read → increment in application code → write back is
not allowed, as it creates race conditions under concurrent requests.

Recommended approach: use a Supabase RPC call to invoke a PostgreSQL function
that performs the atomic increment.

### 6. External Dependencies Must Have Error Handling

All calls to Supabase, Resend, and other external services must handle both
initialization failures and call failures. External service errors must never
propagate directly into a page crash or a 500 response.

---

## Database Change Rules

All database schema changes (creating tables, adding columns, modifying RLS,
adding policies) must go through migration files. Inlining DDL in application
code is not allowed. Ad-hoc changes made directly in the Supabase Dashboard
without a corresponding migration file are not allowed.

**Migration directory**: `supabase/migrations/`  
**File naming**: `YYYYMMDD_short-description.sql`  
**File contents**: DDL statements + `ENABLE ROW LEVEL SECURITY` + required
Policies

When a database change is needed, create the migration file in
`supabase/migrations/` and wait for human review before executing. Do not
attempt to connect to the database and run SQL directly.

Execution options (choose one):
- Supabase Dashboard → SQL Editor → paste and run
- Local Supabase CLI: `supabase db push`

---

## Frontend / Backend Collaboration Boundary

### What AI may modify
- Pages and route components under `app/`
- UI components under `components/`
- Utility functions and query logic under `lib/`
- Server Actions under `app/actions/`
- Migration files under `supabase/migrations/` (create only, never execute)

### What AI must not touch directly
- Any configuration inside the Supabase Dashboard
- Environment variables (`.env.local`)
- The contents of existing migration files (only new files may be added)

### Commit Guidelines
- Small, focused commits — one logical change per commit
- Commit messages must clearly state what changed and why
- Run `npm run lint` and `npm run build` before committing and ensure both pass