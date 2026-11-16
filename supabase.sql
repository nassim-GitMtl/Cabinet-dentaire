-- Carnet dentaire : table de synchronisation. À exécuter une seule fois dans Supabase (SQL Editor).
create table if not exists public.carnet_items (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text        not null,
  id         text        not null,
  data       jsonb       not null,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);
create index if not exists carnet_items_user_updated on public.carnet_items (user_id, updated_at);

-- Chaque compte ne voit et ne modifie que ses propres lignes.
alter table public.carnet_items enable row level security;
drop policy if exists carnet_proprietaire on public.carnet_items;
create policy carnet_proprietaire on public.carnet_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.carnet_items from anon;
grant select, insert, update, delete on public.carnet_items to authenticated;

-- La date de modification est fixée par le serveur.
create or replace function public.carnet_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists carnet_touch on public.carnet_items;
create trigger carnet_touch before insert or update on public.carnet_items
  for each row execute function public.carnet_touch();
