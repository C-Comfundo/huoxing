-- Allow authenticated users to delete their own echoes.

drop policy if exists echoes_delete_own on public.echoes;
create policy echoes_delete_own
on public.echoes
for delete
to authenticated
using (auth.uid() = user_id);
