-- ReLoop schema: hyperlocal give-away map
-- PostGIS geo queries + realtime + row-level security.

create extension if not exists postgis;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete set null,
  title text not null,
  description text not null default 'Free to a good home.',
  category text not null default 'Other',
  image_url text not null,
  lat double precision not null,
  lng double precision not null,
  -- Generated geography point kept in sync with lat/lng for spatial queries.
  geog geography(Point, 4326) generated always as (
    st_setsrid(st_makepoint(lng, lat), 4326)::geography
  ) stored,
  location_name text not null default 'Near you',
  co2_saved numeric not null default 5,
  status text not null default 'available' check (status in ('available', 'claimed')),
  claimed_by uuid references auth.users (id) on delete set null,
  owner_name text not null default 'Neighbour',
  created_at timestamptz not null default now()
);

create index if not exists items_geog_idx on public.items using gist (geog);
create index if not exists items_status_idx on public.items (status);
create index if not exists items_created_idx on public.items (created_at desc);

alter table public.items enable row level security;

-- Anyone (including anonymous visitors) can browse listings.
drop policy if exists items_read on public.items;
create policy items_read on public.items for select using (true);

-- Authenticated users can post items they own.
drop policy if exists items_insert on public.items;
create policy items_insert on public.items
  for insert to authenticated with check (auth.uid() = owner_id);

-- Owners can edit / remove their own items.
drop policy if exists items_update_own on public.items;
create policy items_update_own on public.items
  for update to authenticated using (auth.uid() = owner_id);

drop policy if exists items_delete_own on public.items;
create policy items_delete_own on public.items
  for delete to authenticated using (auth.uid() = owner_id);

-- Claiming is done through a SECURITY DEFINER RPC so a claimer doesn't need
-- broad update rights on other people's rows — it only flips an available item.
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
  return rec;
end;
$$;

-- Nearest available items within a radius, ordered by distance (real PostGIS).
create or replace function public.items_near(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision default 5000
)
returns table (
  id uuid,
  title text,
  description text,
  category text,
  image_url text,
  lat double precision,
  lng double precision,
  location_name text,
  co2_saved numeric,
  status text,
  owner_name text,
  created_at timestamptz,
  distance_m double precision
)
language sql
stable
as $$
  select i.id, i.title, i.description, i.category, i.image_url, i.lat, i.lng,
         i.location_name, i.co2_saved, i.status, i.owner_name, i.created_at,
         st_distance(i.geog, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_m
  from public.items i
  where st_dwithin(i.geog, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  order by distance_m asc;
$$;

-- Storage bucket for item photos (public read, authenticated write).
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do nothing;

drop policy if exists photos_read on storage.objects;
create policy photos_read on storage.objects
  for select using (bucket_id = 'item-photos');

drop policy if exists photos_insert on storage.objects;
create policy photos_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'item-photos');

-- Broadcast inserts/updates so new give-aways appear on everyone's map live.
alter publication supabase_realtime add table public.items;
