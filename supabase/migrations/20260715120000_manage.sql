-- Let a claimer release their own reservation (item goes back on the map).
create or replace function public.release_claim(p_item_id uuid)
returns public.items
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.items;
begin
  update public.items
    set status = 'available', claimed_by = null
    where id = p_item_id and claimed_by = auth.uid() and status = 'claimed'
    returning * into rec;
  if rec.id is null then
    raise exception 'Not your reservation to release';
  end if;
  return rec;
end;
$$;
