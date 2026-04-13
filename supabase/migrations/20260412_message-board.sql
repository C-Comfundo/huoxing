create table if not exists public.board_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  author_display_name text not null default '用户',
  created_at timestamptz not null default now(),
  constraint board_messages_content_not_empty check (char_length(btrim(content)) > 0),
  constraint board_messages_content_length check (char_length(content) <= 300)
);

create index if not exists board_messages_created_at_idx
  on public.board_messages (created_at desc);

comment on table public.board_messages is '公开留言板消息，仅注册用户可发布';
comment on column public.board_messages.author_display_name is '作者展示名快照，避免前台读取 profiles';

alter table public.board_messages enable row level security;

drop policy if exists board_messages_public_select on public.board_messages;
create policy board_messages_public_select
on public.board_messages
for select
to anon, authenticated
using (true);

drop policy if exists board_messages_insert_own on public.board_messages;
create policy board_messages_insert_own
on public.board_messages
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists board_messages_delete_own on public.board_messages;
create policy board_messages_delete_own
on public.board_messages
for delete
to authenticated
using (auth.uid() = user_id);
