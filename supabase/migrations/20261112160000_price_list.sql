-- Price list: species, trophy fees per season, and daily rates and extras.
--
-- Prices belong to a season (e.g. '2026/2027', the outfitter's active_season)
-- so a client's quote can later lock to the season they booked in. Amounts
-- are in the outfitter's default_currency. A fee can be "price on request"
-- (no amount), and a rate can also be "at cost price" (ammunition).
--
-- Roles (CLAUDE.md): every member of the outfitter can read the price list
-- (agents quote from it, clients see published fees); only admins change it.

-- Species -------------------------------------------------------------------
create table public.species (
  id           uuid primary key default gen_random_uuid(),
  outfitter_id uuid not null references public.outfitters (id) on delete cascade,
  name         text not null check (length(btrim(name)) between 1 and 120),
  notes        text check (notes is null or length(notes) <= 500),
  is_published boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Lets trophy_fees prove a species belongs to the same outfitter.
  unique (id, outfitter_id)
);
create unique index species_name_unique on public.species (outfitter_id, lower(btrim(name)));

-- Trophy fees: one per species per season ------------------------------------
create table public.trophy_fees (
  id           uuid primary key default gen_random_uuid(),
  outfitter_id uuid not null references public.outfitters (id) on delete cascade,
  species_id   uuid not null,
  season       text not null check (length(btrim(season)) between 1 and 40),
  amount       numeric(12, 2),
  on_request   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (species_id, outfitter_id) references public.species (id, outfitter_id) on delete cascade,
  unique (species_id, season),
  check ((on_request and amount is null) or (not on_request and amount is not null and amount >= 0))
);
create index trophy_fees_outfitter_season_idx on public.trophy_fees (outfitter_id, season);

-- Daily rates and extras ------------------------------------------------------
create table public.rates (
  id           uuid primary key default gen_random_uuid(),
  outfitter_id uuid not null references public.outfitters (id) on delete cascade,
  season       text not null check (length(btrim(season)) between 1 and 40),
  name         text not null check (length(btrim(name)) between 1 and 120),
  unit         text not null default 'per_day'
                 check (unit in ('per_day', 'per_trip', 'per_round', 'per_item')),
  price_type   text not null default 'fixed'
                 check (price_type in ('fixed', 'cost_price', 'on_request')),
  amount       numeric(12, 2),
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check ((price_type = 'fixed' and amount is not null and amount >= 0)
         or (price_type <> 'fixed' and amount is null))
);
create index rates_outfitter_season_idx on public.rates (outfitter_id, season);

create trigger species_touch before update on public.species
  for each row execute function public.touch_updated_at();
create trigger trophy_fees_touch before update on public.trophy_fees
  for each row execute function public.touch_updated_at();
create trigger rates_touch before update on public.rates
  for each row execute function public.touch_updated_at();

-- Row-level security ------------------------------------------------------------
alter table public.species     enable row level security;
alter table public.trophy_fees enable row level security;
alter table public.rates       enable row level security;

create policy species_select on public.species
  for select to authenticated using (private.is_member(outfitter_id));
create policy species_insert on public.species
  for insert to authenticated with check (private.has_role(outfitter_id, array['admin']::public.member_role[]));
create policy species_update on public.species
  for update to authenticated
  using (private.has_role(outfitter_id, array['admin']::public.member_role[]))
  with check (private.has_role(outfitter_id, array['admin']::public.member_role[]));
create policy species_delete on public.species
  for delete to authenticated using (private.has_role(outfitter_id, array['admin']::public.member_role[]));

create policy trophy_fees_select on public.trophy_fees
  for select to authenticated using (private.is_member(outfitter_id));
create policy trophy_fees_insert on public.trophy_fees
  for insert to authenticated with check (private.has_role(outfitter_id, array['admin']::public.member_role[]));
create policy trophy_fees_update on public.trophy_fees
  for update to authenticated
  using (private.has_role(outfitter_id, array['admin']::public.member_role[]))
  with check (private.has_role(outfitter_id, array['admin']::public.member_role[]));
create policy trophy_fees_delete on public.trophy_fees
  for delete to authenticated using (private.has_role(outfitter_id, array['admin']::public.member_role[]));

create policy rates_select on public.rates
  for select to authenticated using (private.is_member(outfitter_id));
create policy rates_insert on public.rates
  for insert to authenticated with check (private.has_role(outfitter_id, array['admin']::public.member_role[]));
create policy rates_update on public.rates
  for update to authenticated
  using (private.has_role(outfitter_id, array['admin']::public.member_role[]))
  with check (private.has_role(outfitter_id, array['admin']::public.member_role[]));
create policy rates_delete on public.rates
  for delete to authenticated using (private.has_role(outfitter_id, array['admin']::public.member_role[]));

-- Only signed-in members, through the policies above. Nothing for anon.
revoke all on public.species, public.trophy_fees, public.rates from anon;
grant select, insert, update, delete on public.species, public.trophy_fees, public.rates to authenticated;
