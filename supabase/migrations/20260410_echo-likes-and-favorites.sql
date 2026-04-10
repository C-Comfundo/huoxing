-- Echo 点赞表 & 文章收藏表
-- likes: 用户对回响（echo）的点赞
-- favorites: 用户对文章的收藏

----------------------------------------------------------------------
-- 1. likes（回响点赞）
----------------------------------------------------------------------
create table if not exists public.likes (
  echo_id  uuid not null references public.echoes (id) on delete cascade,
  user_id  uuid not null references auth.users  (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (echo_id, user_id)
);

comment on table  public.likes is '回响（echo）点赞记录，每个用户对同一条回响只能点赞一次';
comment on column public.likes.echo_id is '被点赞的回响 ID';
comment on column public.likes.user_id is '点赞者的用户 ID';

create index if not exists likes_echo_id_idx on public.likes (echo_id);
create index if not exists likes_user_id_idx on public.likes (user_id);

alter table public.likes enable row level security;

-- 所有人可读
drop policy if exists likes_public_select on public.likes;
create policy likes_public_select
  on public.likes for select
  using (true);

-- 登录用户可插入自己的记录
drop policy if exists likes_insert_own on public.likes;
create policy likes_insert_own
  on public.likes for insert
  with check (auth.uid() = user_id);

-- 登录用户可删除自己的记录
drop policy if exists likes_delete_own on public.likes;
create policy likes_delete_own
  on public.likes for delete
  using (auth.uid() = user_id);

----------------------------------------------------------------------
-- 2. favorites（文章收藏）
----------------------------------------------------------------------
create table if not exists public.favorites (
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id    uuid not null references auth.users   (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

comment on table  public.favorites is '用户文章收藏记录，每个用户对同一篇文章只能收藏一次';
comment on column public.favorites.article_id is '被收藏的文章 ID';
comment on column public.favorites.user_id    is '收藏者的用户 ID';

create index if not exists favorites_article_id_idx on public.favorites (article_id);
create index if not exists favorites_user_id_idx    on public.favorites (user_id);

alter table public.favorites enable row level security;

-- 所有人可读
drop policy if exists favorites_public_select on public.favorites;
create policy favorites_public_select
  on public.favorites for select
  using (true);

-- 登录用户可插入自己的记录
drop policy if exists favorites_insert_own on public.favorites;
create policy favorites_insert_own
  on public.favorites for insert
  with check (auth.uid() = user_id);

-- 登录用户可删除自己的记录
drop policy if exists favorites_delete_own on public.favorites;
create policy favorites_delete_own
  on public.favorites for delete
  using (auth.uid() = user_id);
