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

-- ---------------------------------------------------------------------------
-- Journal des factures : chaque création, modification, suppression ou
-- restauration est consignée par le serveur. L'application peut le lire mais
-- ne peut ni le modifier ni l'effacer. Ce bloc peut être réexécuté sans risque.
-- ---------------------------------------------------------------------------
create table if not exists public.carnet_journal (
  seq     bigint generated always as identity primary key,
  user_id uuid        not null references auth.users (id) on delete cascade,
  item_id text        not null,
  action  text        not null,
  numero  text,
  data    jsonb       not null,
  at      timestamptz not null default now()
);
create index if not exists carnet_journal_user_at on public.carnet_journal (user_id, at desc);

alter table public.carnet_journal enable row level security;
drop policy if exists carnet_journal_lecture on public.carnet_journal;
create policy carnet_journal_lecture on public.carnet_journal
  for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.carnet_journal from anon, authenticated;
grant select on public.carnet_journal to authenticated;

create or replace function public.carnet_journaliser() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  act text;
begin
  if new.kind <> 'invoice' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.deleted then
      return new;
    end if;
    act := case when new.data ? 'archive' then 'suppression' else 'creation' end;
    insert into public.carnet_journal (user_id, item_id, action, numero, data)
    values (new.user_id, new.id, act, new.data ->> 'numero', new.data);
    return new;
  end if;
  if new.deleted = old.deleted
     and (new.data - 'maj' - 'modifieLe') is not distinct from (old.data - 'maj' - 'modifieLe') then
    return new;
  end if;
  act := case
    when new.deleted and not old.deleted then 'suppression'
    when (new.data ? 'archive') and not (old.data ? 'archive') then 'suppression'
    when not (new.data ? 'archive') and (old.data ? 'archive') then 'restauration'
    else 'modification'
  end;
  insert into public.carnet_journal (user_id, item_id, action, numero, data)
  values (new.user_id, new.id, act,
          coalesce(new.data ->> 'numero', old.data ->> 'numero'),
          case when new.deleted then old.data else new.data end);
  return new;
end $$;
revoke all on function public.carnet_journaliser() from public, anon, authenticated;
drop trigger if exists carnet_journaliser on public.carnet_items;
create trigger carnet_journaliser after insert or update on public.carnet_items
  for each row execute function public.carnet_journaliser();
