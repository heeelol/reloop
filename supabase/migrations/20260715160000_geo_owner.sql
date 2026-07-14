-- Include owner_id / claimed_by in geo + semantic results so the client can
-- detect ownership (enables pickup chat + "this is your listing" from the map).

drop function if exists public.items_near(double precision, double precision, double precision);
create function public.items_near(
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
  owner_id uuid,
  claimed_by uuid,
  created_at timestamptz,
  distance_m double precision
)
language sql
stable
as $$
  select i.id, i.title, i.description, i.category, i.image_url, i.lat, i.lng,
         i.location_name, i.co2_saved, i.status, i.owner_name, i.owner_id, i.claimed_by,
         i.created_at,
         st_distance(i.geog, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_m
  from public.items i
  where st_dwithin(i.geog, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  order by distance_m asc;
$$;

drop function if exists public.match_items(text, double precision, double precision, int);
create function public.match_items(
  query_embedding text,
  p_lat double precision default null,
  p_lng double precision default null,
  match_count int default 40
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
  owner_id uuid,
  claimed_by uuid,
  created_at timestamptz,
  distance_m double precision,
  similarity double precision
)
language sql
stable
as $$
  select i.id, i.title, i.description, i.category, i.image_url, i.lat, i.lng,
         i.location_name, i.co2_saved, i.status, i.owner_name, i.owner_id, i.claimed_by,
         i.created_at,
         case
           when p_lat is not null and p_lng is not null then
             st_distance(i.geog, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
         end as distance_m,
         1 - (i.embedding <=> query_embedding::vector) as similarity
  from public.items i
  where i.embedding is not null
  order by (i.status = 'available') desc, i.embedding <=> query_embedding::vector
  limit match_count;
$$;
