-- v2: wants + AI matching, notifications, pickup chat, leaderboard.

-- ── Notifications ─────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null, -- 'match' | 'claim' | 'message'
  title text not null,
  body text not null default '',
  item_id uuid references public.items (id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications
  for select to authenticated using (user_id = auth.uid());
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications
  for update to authenticated using (user_id = auth.uid());
alter publication supabase_realtime add table public.notifications;

-- ── Wants (requests) ──────────────────────────────────────────────────────
create table if not exists public.wants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null,
  embedding vector(1536),
  lat double precision,
  lng double precision,
  radius_m double precision default 10000,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists wants_embedding_idx
  on public.wants using hnsw (embedding vector_cosine_ops);
alter table public.wants enable row level security;
drop policy if exists wants_read on public.wants;
create policy wants_read on public.wants for select using (true);
drop policy if exists wants_insert on public.wants;
create policy wants_insert on public.wants
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists wants_delete on public.wants;
create policy wants_delete on public.wants
  for delete to authenticated using (user_id = auth.uid());

-- Notify users whose active wants semantically match a newly posted item.
create or replace function public.notify_matching_wants(p_item_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  it public.items;
  n int := 0;
begin
  select * into it from public.items where id = p_item_id;
  if it.embedding is null then return 0; end if;
  insert into public.notifications (user_id, type, title, body, item_id)
  select w.user_id, 'match', 'Match for “' || w.query || '”', it.title, it.id
  from public.wants w
  where w.active
    and w.embedding is not null
    and w.user_id <> coalesce(it.owner_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and (1 - (w.embedding <=> it.embedding)) > 0.28
    and (
      w.lat is null or it.lat is null
      or st_dwithin(
           st_setsrid(st_makepoint(w.lng, w.lat), 4326)::geography,
           st_setsrid(st_makepoint(it.lng, it.lat), 4326)::geography,
           coalesce(w.radius_m, 10000))
    );
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── Pickup chat ───────────────────────────────────────────────────────────
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_item_idx on public.messages (item_id, created_at);
alter table public.messages enable row level security;
-- Only the item's owner and its claimer can read/write the thread.
drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages
  for select to authenticated using (
    exists (
      select 1 from public.items i
      where i.id = item_id and (i.owner_id = auth.uid() or i.claimed_by = auth.uid())
    )
  );
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid() and exists (
      select 1 from public.items i
      where i.id = item_id and (i.owner_id = auth.uid() or i.claimed_by = auth.uid())
    )
  );
alter publication supabase_realtime add table public.messages;

-- A new message notifies the other participant.
create or replace function public.notify_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  it public.items;
  recipient uuid;
begin
  select * into it from public.items where id = new.item_id;
  recipient := case when new.sender_id = it.owner_id then it.claimed_by else it.owner_id end;
  if recipient is not null and recipient <> new.sender_id then
    insert into public.notifications (user_id, type, title, body, item_id)
    values (recipient, 'message', 'New message · ' || it.title, new.body, it.id);
  end if;
  return new;
end;
$$;
drop trigger if exists messages_notify on public.messages;
create trigger messages_notify after insert on public.messages
  for each row execute function public.notify_message();

-- ── Claim now also notifies the owner ─────────────────────────────────────
create or replace function public.claim_item(p_item_id uuid)
returns public.items
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.items;
begin
  update public.items
    set status = 'claimed', claimed_by = auth.uid()
    where id = p_item_id and status = 'available'
    returning * into rec;
  if rec.id is null then
    raise exception 'Item is no longer available';
  end if;
  if rec.owner_id is not null and rec.owner_id <> auth.uid() then
    insert into public.notifications (user_id, type, title, body, item_id)
    values (rec.owner_id, 'claim', 'Your item was reserved 🎉', rec.title, rec.id);
  end if;
  return rec;
end;
$$;

-- ── Leaderboard: top givers by items rehomed + CO2 saved ──────────────────
create or replace function public.leaderboard(p_limit int default 10)
returns table (owner_name text, given int, co2 numeric)
language sql
stable
as $$
  select owner_name, count(*)::int as given, sum(co2_saved) as co2
  from public.items
  where status = 'claimed'
  group by owner_name
  order by co2 desc
  limit p_limit;
$$;
