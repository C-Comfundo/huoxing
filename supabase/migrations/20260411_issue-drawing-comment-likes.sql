create table if not exists public.issue_drawing_comment_likes (
  comment_id uuid not null references public.issue_drawing_comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

comment on table public.issue_drawing_comment_likes is
  '点赞画里有话评论的记录，每个用户对同一条评论只能点赞一次。';

create index if not exists issue_drawing_comment_likes_comment_id_idx
  on public.issue_drawing_comment_likes (comment_id);

create index if not exists issue_drawing_comment_likes_user_id_idx
  on public.issue_drawing_comment_likes (user_id);

alter table public.issue_drawing_comment_likes enable row level security;

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
      and public.has_published_issue_drawing(c.issue_id)
  )
);

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
      and public.has_published_issue_drawing(c.issue_id)
  )
);

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
      and public.has_published_issue_drawing(c.issue_id)
  )
);
