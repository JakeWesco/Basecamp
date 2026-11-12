-- Quotes, built from the price list (CLAUDE.md, Roles):
--  * Admins see and edit every quote; agents see and edit only their own;
--    clients see none (they get a share link later).
--  * Prices on rate and trophy fee lines always come from the price list for
--    the quote's season. Nobody types a price for them; only admins can add
--    a line that isn't on the price list.
--  * Agents can give a discount up to the outfitter's limit, and give free
--    only the extras the outfitter allows in Settings. Anything beyond that is
--    blocked here, in the database, with a clear message.
--  * Every discount and freebie records who gave it.

-- Agent limits, set by admins in Settings ------------------------------------
alter table public.outfitters
  add column agent_max_discount_percent numeric(5, 2) not null default 0
    check (agent_max_discount_percent between 0 and 100);
alter table public.rates
  add column agent_can_give_free boolean not null default false;

-- Quotes -----------------------------------------------------------------------
create table public.quotes (
  id                uuid primary key default gen_random_uuid(),
  outfitter_id      uuid not null references public.outfitters (id) on delete cascade,
  created_by        uuid not null,
  hunter_name       text not null check (length(btrim(hunter_name)) between 1 and 120),
  hunter_email      text check (hunter_email is null or length(hunter_email) <= 200),
  hunter_phone      text check (hunter_phone is null or length(hunter_phone) <= 40),
  arrival_date      date,
  hunting_days      integer not null default 7 check (hunting_days between 1 and 60),
  hunters           integer not null default 1 check (hunters between 1 and 20),
  observers         integer not null default 0 check (observers between 0 and 20),
  season            text not null,
  currency          char(3) not null,
  discount_percent  numeric(5, 2) not null default 0 check (discount_percent between 0 and 100),
  discount_given_by uuid,
  notes             text check (notes is null or length(notes) <= 2000),
  status            text not null default 'draft' check (status in ('draft', 'sent')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, outfitter_id)
);
create index quotes_outfitter_idx on public.quotes (outfitter_id, created_by);
create index quotes_created_by_idx on public.quotes (created_by);

create table public.quote_lines (
  id            uuid primary key default gen_random_uuid(),
  outfitter_id  uuid not null,
  quote_id      uuid not null,
  kind          text not null check (kind in ('rate', 'trophy_fee', 'custom')),
  rate_id       uuid references public.rates (id) on delete set null,
  species_id    uuid references public.species (id) on delete set null,
  description   text not null default '' check (length(description) <= 200),
  unit          text not null default 'per_item' check (unit in ('per_day', 'per_trip', 'per_round', 'per_item')),
  price_type    text not null default 'fixed' check (price_type in ('fixed', 'cost_price', 'on_request')),
  unit_price    numeric(12, 2),
  quantity      numeric(8, 2) not null default 1 check (quantity > 0 and quantity <= 10000),
  is_free       boolean not null default false,
  free_given_by uuid,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (quote_id, outfitter_id) references public.quotes (id, outfitter_id) on delete cascade,
  check ((price_type = 'fixed' and unit_price is not null and unit_price >= 0)
         or (price_type <> 'fixed' and unit_price is null))
);
create index quote_lines_quote_idx on public.quote_lines (quote_id, outfitter_id);
create index quote_lines_rate_idx on public.quote_lines (rate_id);
create index quote_lines_species_idx on public.quote_lines (species_id);

create trigger quotes_touch before update on public.quotes
  for each row execute function public.touch_updated_at();
create trigger quote_lines_touch before update on public.quote_lines
  for each row execute function public.touch_updated_at();

-- Rules ------------------------------------------------------------------------
-- Run as the signed-in user (security invoker), so they only see what RLS
-- lets that user see.

create function private.quote_rules()
returns trigger language plpgsql set search_path = '' as $$
declare
  max_pct numeric;
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce((select auth.uid()), new.created_by);
    select coalesce(nullif(btrim(o.active_season), ''), 'Current'), o.default_currency
      into new.season, new.currency
      from public.outfitters o where o.id = new.outfitter_id;
  else
    -- Who made it, for which outfitter, season and currency never change.
    new.created_by := old.created_by;
    new.outfitter_id := old.outfitter_id;
    new.season := old.season;
    new.currency := old.currency;
  end if;

  if new.discount_percent > 0
     and (tg_op = 'INSERT' or new.discount_percent is distinct from old.discount_percent) then
    if not private.has_role(new.outfitter_id, array['admin']::public.member_role[]) then
      select o.agent_max_discount_percent into max_pct from public.outfitters o where o.id = new.outfitter_id;
      if new.discount_percent > coalesce(max_pct, 0) then
        raise exception using
          errcode = 'P0001',
          message = case when coalesce(max_pct, 0) = 0
            then 'You can''t give a discount on this quote. Ask an admin.'
            else format('The highest discount you can give is %s%%. Ask an admin for more.', trim_scale(max_pct)) end;
      end if;
    end if;
    new.discount_given_by := (select auth.uid());
  elsif new.discount_percent = 0 then
    new.discount_given_by := null;
  end if;
  return new;
end;
$$;

create function private.quote_line_rules()
returns trigger language plpgsql set search_path = '' as $$
declare
  q record;
  is_admin boolean;
  r record;
  tf record;
begin
  select qq.id, qq.outfitter_id, qq.season into q from public.quotes qq where qq.id = new.quote_id;
  if q.id is null then
    raise exception using errcode = 'P0001', message = 'That quote was not found. Refresh the page and try again.';
  end if;
  new.outfitter_id := q.outfitter_id;
  is_admin := private.has_role(q.outfitter_id, array['admin']::public.member_role[]);

  if tg_op = 'INSERT'
     or new.kind is distinct from old.kind
     or new.rate_id is distinct from old.rate_id
     or new.species_id is distinct from old.species_id then
    if new.kind = 'rate' then
      select x.name, x.unit, x.price_type, x.amount into r
        from public.rates x
        where x.id = new.rate_id and x.outfitter_id = q.outfitter_id and x.season = q.season;
      if not found then
        raise exception using errcode = 'P0001', message = 'That rate is not on the price list for this season.';
      end if;
      new.description := r.name;
      new.unit := r.unit;
      new.price_type := r.price_type;
      new.unit_price := r.amount;
      new.species_id := null;
    elsif new.kind = 'trophy_fee' then
      select s.name, f.amount, f.on_request into tf
        from public.trophy_fees f join public.species s on s.id = f.species_id
        where f.species_id = new.species_id and f.outfitter_id = q.outfitter_id and f.season = q.season;
      if not found then
        raise exception using errcode = 'P0001', message = 'That species has no trophy fee for this season.';
      end if;
      new.description := tf.name;
      new.unit := 'per_item';
      new.price_type := case when tf.on_request then 'on_request' else 'fixed' end;
      new.unit_price := tf.amount;
      new.rate_id := null;
    elsif not is_admin then
      raise exception using errcode = 'P0001', message = 'Only an admin can add a line that is not on the price list.';
    end if;
  elsif not is_admin then
    -- Agents can change the quantity, never the price or what the line is.
    new.description := old.description;
    new.unit := old.unit;
    new.price_type := old.price_type;
    new.unit_price := old.unit_price;
  end if;

  if new.is_free then
    if tg_op = 'INSERT' or not old.is_free then
      if not is_admin and not (
        new.kind = 'rate' and exists (
          select 1 from public.rates x where x.id = new.rate_id and x.agent_can_give_free
        )
      ) then
        raise exception using errcode = 'P0001',
          message = format('You can''t give %s for free. Only the extras an admin allows in Settings can be free.', new.description);
      end if;
      new.free_given_by := (select auth.uid());
    end if;
  else
    new.free_given_by := null;
  end if;
  return new;
end;
$$;

revoke all on function private.quote_rules() from public, anon, authenticated;
revoke all on function private.quote_line_rules() from public, anon, authenticated;

create trigger quotes_rules before insert or update on public.quotes
  for each row execute function private.quote_rules();
create trigger quote_lines_rules before insert or update on public.quote_lines
  for each row execute function private.quote_line_rules();

-- Row-level security -----------------------------------------------------------
alter table public.quotes      enable row level security;
alter table public.quote_lines enable row level security;

-- Admins: every quote of their outfitter. Agents: only the ones they made.
create policy quotes_select on public.quotes
  for select to authenticated using (
    private.has_role(outfitter_id, array['admin']::public.member_role[])
    or (created_by = (select auth.uid()) and private.has_role(outfitter_id, array['agent']::public.member_role[]))
  );
create policy quotes_insert on public.quotes
  for insert to authenticated with check (
    created_by = (select auth.uid())
    and private.has_role(outfitter_id, array['admin', 'agent']::public.member_role[])
  );
create policy quotes_update on public.quotes
  for update to authenticated
  using (
    private.has_role(outfitter_id, array['admin']::public.member_role[])
    or (created_by = (select auth.uid()) and private.has_role(outfitter_id, array['agent']::public.member_role[]))
  )
  with check (
    private.has_role(outfitter_id, array['admin']::public.member_role[])
    or (created_by = (select auth.uid()) and private.has_role(outfitter_id, array['agent']::public.member_role[]))
  );
create policy quotes_delete on public.quotes
  for delete to authenticated using (
    private.has_role(outfitter_id, array['admin']::public.member_role[])
    or (created_by = (select auth.uid()) and private.has_role(outfitter_id, array['agent']::public.member_role[]))
  );

-- Lines follow their quote: if you can see the quote, you can work on its lines.
create policy quote_lines_select on public.quote_lines
  for select to authenticated using (exists (select 1 from public.quotes q where q.id = quote_id));
create policy quote_lines_insert on public.quote_lines
  for insert to authenticated with check (exists (select 1 from public.quotes q where q.id = quote_id));
create policy quote_lines_update on public.quote_lines
  for update to authenticated
  using (exists (select 1 from public.quotes q where q.id = quote_id))
  with check (exists (select 1 from public.quotes q where q.id = quote_id));
create policy quote_lines_delete on public.quote_lines
  for delete to authenticated using (exists (select 1 from public.quotes q where q.id = quote_id));

revoke all on public.quotes, public.quote_lines from anon;
grant select, insert, update, delete on public.quotes, public.quote_lines to authenticated;
