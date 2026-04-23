-- Support threaded echo replies while preserving predictable delete semantics.

alter table public.echoes
  add column if not exists parent_id uuid references public.echoes (id) on delete set null;

alter table public.echoes
  add column if not exists root_id uuid references public.echoes (id) on delete cascade;

comment on column public.echoes.parent_id is
  'Direct parent echo id for replies. Null means a top-level echo.';

comment on column public.echoes.root_id is
  'Top-level echo id for a reply thread. Null means the row itself is top-level.';

create index if not exists echoes_parent_id_idx on public.echoes (parent_id);
create index if not exists echoes_root_id_idx on public.echoes (root_id);

alter table public.echoes
  drop constraint if exists echoes_reply_root_required;

alter table public.echoes
  add constraint echoes_reply_root_required
  check (
    (parent_id is null and root_id is null) or
    (parent_id is not null and root_id is not null)
  );
