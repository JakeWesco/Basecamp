-- All-in cost: the costs a hunter pays to others, shown on quotes as
-- estimate ranges so the total is honest (flights, permits, dip and pack,
-- taxidermy, shipping, tips, insurance).
--
--  * cost_estimates is the outfitter's list, managed by admins in Settings.
--    Only active ones appear on quotes. They are estimates, not prices: a
--    change shows on every quote straight away.
--  * A quote can leave some out (quotes.excluded_costs), e.g. no taxidermy on
--    a cull hunt. Admins and agents can do that on quotes they can edit.
--  * Hunters see them through public.shared_quote(token).

create table public.cost_estimates (
  id           uuid primary key default gen_random_uuid(),
  outfitter_id uuid not null references public.outfitters (id) on delete cascade,
  name         text not null check (length(btrim(name)) between 1 and 120),
  note         text check (note is null or length(note) <= 300),
  basis        text not null default 'per_person' check (basis in
                 ('per_person', 'per_hunter', 'per_observer', 'per_trophy', 'per_trip', 'per_hunter_day')),
  low          numeric(12, 2) not null check (low >= 0),
  high         numeric(12, 2) not null,
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (high >= low)
);
create index cost_estimates_outfitter_idx on public.cost_estimates (outfitter_id, sort_order);
create unique index cost_estimates_name_unique on public.cost_estimates (outfitter_id, lower(btrim(name)));

create trigger cost_estimates_touch before update on public.cost_estimates
  for each row execute function public.touch_updated_at();

alter table public.quotes add column excluded_costs uuid[] not null default '{}';

alter table public.cost_estimates enable row level security;

create policy cost_estimates_select on public.cost_estimates
  for select to authenticated using (private.has_role(outfitter_id, array['admin', 'agent']::public.member_role[]));
create policy cost_estimates_insert on public.cost_estimates
  for insert to authenticated with check (private.has_role(outfitter_id, array['admin']::public.member_role[]));
create policy cost_estimates_update on public.cost_estimates
  for update to authenticated
  using (private.has_role(outfitter_id, array['admin']::public.member_role[]))
  with check (private.has_role(outfitter_id, array['admin']::public.member_role[]));
create policy cost_estimates_delete on public.cost_estimates
  for delete to authenticated using (private.has_role(outfitter_id, array['admin']::public.member_role[]));

revoke all on public.cost_estimates from anon;
grant select, insert, update, delete on public.cost_estimates to authenticated;

-- The hunter page: as before, plus the active estimates this quote includes.
create or replace function public.shared_quote(token text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'quote', jsonb_build_object(
      'hunter_name', q.hunter_name,
      'arrival_date', q.arrival_date,
      'hunting_days', q.hunting_days,
      'hunters', q.hunters,
      'observers', q.observers,
      'season', q.season,
      'currency', q.currency,
      'discount_percent', q.discount_percent,
      'notes', q.notes,
      'shared_at', q.shared_at,
      'locked_at', q.locked_at,
      'updated_at', q.updated_at
    ),
    'outfitter', jsonb_build_object(
      'name', o.name,
      'email', o.email,
      'phone', o.phone,
      'website', o.website,
      'logo_url', o.logo_url,
      'brand_primary', o.brand_primary,
      'brand_accent', o.brand_accent
    ),
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
               'kind', l.kind,
               'description', l.description,
               'unit', l.unit,
               'price_type', l.price_type,
               'unit_price', l.unit_price,
               'quantity', l.quantity,
               'is_free', l.is_free
             ) order by l.sort_order, l.created_at)
      from public.quote_lines l
      where l.quote_id = q.id
    ), '[]'::jsonb),
    'costs', coalesce((
      select jsonb_agg(jsonb_build_object(
               'name', c.name,
               'note', c.note,
               'basis', c.basis,
               'low', c.low,
               'high', c.high
             ) order by c.sort_order, c.name)
      from public.cost_estimates c
      where c.outfitter_id = q.outfitter_id and c.is_active and not (c.id = any (q.excluded_costs))
    ), '[]'::jsonb)
  )
  from public.quotes q
  join public.outfitters o on o.id = q.outfitter_id
  where token ~ '^[0-9a-f]{64}$' and q.share_token = token
$$;
revoke all on function public.shared_quote(text) from public;
grant execute on function public.shared_quote(text) to anon, authenticated;
