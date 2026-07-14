-- Semantic "search by need": embed each item and match queries by meaning.

create extension if not exists vector;

alter table public.items
  add column if not exists embedding vector(1536);

-- HNSW index — no training step needed, works well on small/growing datasets.
create index if not exists items_embedding_idx
  on public.items using hnsw (embedding vector_cosine_ops);

-- Match items by cosine similarity to a query embedding.
-- query_embedding is passed as text ('[...]') and cast to vector to avoid
-- PostgREST array-casting issues. Available items are surfaced first.
create or replace function public.match_items(
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
  created_at timestamptz,
  distance_m double precision,
  similarity double precision
)
language sql
stable
as $$
  select i.id, i.title, i.description, i.category, i.image_url, i.lat, i.lng,
         i.location_name, i.co2_saved, i.status, i.owner_name, i.created_at,
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
