-- Allow multiple drawings per issue, and link comments to specific drawings.
--
-- Changes:
-- 1. Remove UNIQUE on issue_drawings.issue_id
-- 2. Add sort_order to issue_drawings with composite unique (issue_id, sort_order)
-- 3. Add drawing_id to issue_drawing_comments, backfill, set NOT NULL
-- 4. Update RLS policies for comments to check drawing_id
-- 5. Update has_published_issue_drawing to work with multiple drawings

-- ============================================================
-- 1. Remove the UNIQUE constraint on issue_drawings.issue_id
-- ============================================================

alter table public.issue_drawings
  drop constraint if exists issue_drawings_issue_id_key;

-- ============================================================
-- 2. Add sort_order to issue_drawings
-- ============================================================

alter table public.issue_drawings
  add column if not exists sort_order integer not null default 0;

alter table public.issue_drawings
  add constraint issue_drawings_issue_sort_unique
  unique (issue_id, sort_order);

create index if not exists issue_drawings_issue_sort_idx
  on public.issue_drawings (issue_id, sort_order asc);

comment on column public.issue_drawings.sort_order is
  'Order of the drawing within its issue. 0 = first artwork, 1 = second, etc.';

-- ============================================================
-- 3. Add drawing_id to issue_drawing_comments
-- ============================================================

alter table public.issue_drawing_comments
  add column if not exists drawing_id uuid references public.issue_drawings (id) on delete cascade;

-- Backfill: set drawing_id to the first (lowest sort_order) drawing of the same issue
update public.issue_drawing_comments c
set drawing_id = (
  select d.id
  from public.issue_drawings d
  where d.issue_id = c.issue_id
  order by d.sort_order asc, d.created_at asc
  limit 1
)
where c.drawing_id is null;

-- Now make it NOT NULL
alter table public.issue_drawing_comments
  alter column drawing_id set not null;

create index if not exists issue_drawing_comments_drawing_id_idx
  on public.issue_drawing_comments (drawing_id);

-- ============================================================
-- 4. Update RLS policies for comments to check via drawing_id
-- ============================================================

-- Helper: check if a specific drawing belongs to a published issue
create or replace function public.is_published_drawing(p_drawing_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.issue_drawings d
    join public.issues i on i.id = d.issue_id
    where d.id = p_drawing_id
      and i.published_at is not null
      and i.published_at <= now()
  );
$$;

-- SELECT policy
drop policy if exists issue_drawing_comments_public_select on public.issue_drawing_comments;
create policy issue_drawing_comments_public_select
on public.issue_drawing_comments
for select
to anon, authenticated
using (public.is_published_drawing(drawing_id));

-- INSERT policy
drop policy if exists issue_drawing_comments_insert_own on public.issue_drawing_comments;
create policy issue_drawing_comments_insert_own
on public.issue_drawing_comments
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.is_published_drawing(drawing_id)
);

-- DELETE policy
drop policy if exists issue_drawing_comments_delete_own on public.issue_drawing_comments;
create policy issue_drawing_comments_delete_own
on public.issue_drawing_comments
for delete
to authenticated
using (
  auth.uid() = user_id
  and public.is_published_drawing(drawing_id)
);

-- Comment likes: update SELECT policy to check via drawing
drop policy if exists issue_drawing_comment_likes_public_select
  on public.issue_drawing_comment_likes;
create policy issue_drawing_comment_likes_public_select
on public.issue_drawing_comment_likes
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.issue_drawing_comments c
    where c.id = comment_id
      and public.is_published_drawing(c.drawing_id)
  )
);

-- Comment likes: update INSERT policy
drop policy if exists issue_drawing_comment_likes_insert_own
  on public.issue_drawing_comment_likes;
create policy issue_drawing_comment_likes_insert_own
on public.issue_drawing_comment_likes
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.issue_drawing_comments c
    where c.id = comment_id
      and public.is_published_drawing(c.drawing_id)
  )
);

-- Comment likes: update DELETE policy
drop policy if exists issue_drawing_comment_likes_delete_own
  on public.issue_drawing_comment_likes;
create policy issue_drawing_comment_likes_delete_own
on public.issue_drawing_comment_likes
for delete
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.issue_drawing_comments c
    where c.id = comment_id
      and public.is_published_drawing(c.drawing_id)
  )
);
