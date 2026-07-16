-- Hybrid retrieval: fuse pgvector semantic ranking with Postgres full-text
-- ranking using Reciprocal Rank Fusion (RRF). Combining the two is more robust
-- than either alone — vectors catch meaning ("something to sit on" → chair),
-- full-text nails exact terms (brand names, model numbers) that embeddings blur.

-- Full-text search vector over title + description, kept in sync automatically.
alter table public.items
  add column if not exists fts tsvector
  generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored;

create index if not exists items_fts_idx on public.items using gin (fts);

-- Returns the same shape as match_items (so the client maps it identically),
-- plus a fused rank_score. Each retrieval arm contributes 1/(k + rank); the
-- sum ranks the final list. k damps the influence of low-ranked hits.
create or replace function public.hybrid_search_items(
  query_text text,
  query_embedding text,
  p_lat double precision default null,
  p_lng double precision default null,
  match_count int default 40,
  rrf_k int default 50
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
  similarity double precision,
  rank_score double precision
)
language sql
stable
as $$
  with vec as (
    select id,
           row_number() over (order by embedding <=> query_embedding::vector) as rn,
           1 - (embedding <=> query_embedding::vector) as sim
    from public.items
    where embedding is not null
    order by embedding <=> query_embedding::vector
    limit 60
  ),
  kw as (
    select id,
           row_number() over (
             order by ts_rank(fts, websearch_to_tsquery('english', query_text)) desc
           ) as rn
    from public.items
    where query_text is not null and query_text <> ''
      and fts @@ websearch_to_tsquery('english', query_text)
    limit 60
  ),
  fused as (
    select coalesce(v.id, k.id) as id,
           coalesce(1.0 / (rrf_k + v.rn), 0) + coalesce(1.0 / (rrf_k + k.rn), 0) as rrf,
           v.sim as sim
    from vec v
    full outer join kw k on v.id = k.id
  )
  select i.id, i.title, i.description, i.category, i.image_url, i.lat, i.lng,
         i.location_name, i.co2_saved, i.status, i.owner_name, i.owner_id,
         i.claimed_by, i.created_at,
         case
           when p_lat is not null and p_lng is not null then
             st_distance(i.geog, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
         end as distance_m,
         f.sim as similarity,
         f.rrf as rank_score
  from fused f
  join public.items i on i.id = f.id
  order by (i.status = 'available') desc, f.rrf desc
  limit match_count;
$$;
