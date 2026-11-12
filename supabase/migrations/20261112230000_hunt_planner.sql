-- AI hunt planner: a public page per outfitter (/plan/<slug>) where a hunter
-- describes the hunt they want, in English, German, Polish, Spanish or
-- French, and gets two or three packages priced from the price list. If
-- they like one, they leave their details and it lands in the lead inbox.
--
--  * Off until an admin switches it on in Settings (outfitters.planner_enabled).
--  * Hunters are signed out, so they never touch tables directly. Four
--    functions do the work and check everything themselves:
--      planner_outfitter(slug)  name and brand for the page
--      planner_start(...)       limits, records the request, returns the price list
--      planner_finish(...)      stores the priced plan, once
--      planner_submit(...)      turns a chosen package into a lead, once
--  * Limits keep the AI bill small: 8 plans per visitor per hour, 300 per
--    outfitter per day. A visitor is a hash of their IP address, never the
--    address itself.
--  * Planner leads have no creator (created_by is null), so only admins see
--    them. Admins can read every request of their outfitter.
--  * The stored plan is written by a signed-out visitor, so the app treats
--    it as display text only. Making a quote from it uses the ids alone and
--    the database prices every line from the price list as usual.

alter table public.outfitters add column planner_enabled boolean not null default false;

-- Leads from the planner have no staff creator.
alter table public.leads alter column created_by drop not null;
alter table public.leads drop constraint leads_source_check;
alter table public.leads add constraint leads_source_check check (source is null or source in
  ('show', 'referral', 'website', 'whatsapp', 'social_media', 'past_client', 'agent', 'planner', 'other'));

create table public.planner_requests (
  id           uuid primary key default gen_random_uuid(),
  outfitter_id uuid not null references public.outfitters (id) on delete cascade,
  visitor      text not null check (visitor ~ '^[0-9a-f]{64}$'),
  language     text not null check (language in ('en', 'de', 'pl', 'es', 'fr')),
  request      text not null check (length(btrim(request)) between 1 and 1000),
  plan         jsonb check (plan is null or (jsonb_typeof(plan) = 'object' and pg_column_size(plan) <= 100000)),
  chosen       integer check (chosen is null or chosen between 0 and 2),
  lead_id      uuid,
  created_at   timestamptz not null default now(),
  foreign key (lead_id, outfitter_id) references public.leads (id, outfitter_id) on delete set null (lead_id)
);
create index planner_requests_outfitter_idx on public.planner_requests (outfitter_id, created_at desc);
create index planner_requests_visitor_idx on public.planner_requests (visitor, created_at desc);
create index planner_requests_lead_idx on public.planner_requests (lead_id, outfitter_id);

alter table public.planner_requests enable row level security;

create policy planner_requests_select on public.planner_requests
  for select to authenticated using (private.has_role(outfitter_id, array['admin']::public.member_role[]));

revoke all on public.planner_requests from anon, authenticated;
grant select on public.planner_requests to authenticated;

-- The page ------------------------------------------------------------------------
create function public.planner_outfitter(p_slug text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'name', o.name,
    'email', o.email,
    'phone', o.phone,
    'website', o.website,
    'logo_url', o.logo_url,
    'brand_primary', o.brand_primary,
    'brand_accent', o.brand_accent,
    'currency', o.default_currency,
    'language', o.default_language
  )
  from public.outfitters o
  where o.slug = p_slug and o.planner_enabled
$$;

-- Start a plan ---------------------------------------------------------------------
-- Returns {id, catalogue} or {error: 'off' | 'busy'}.
create function public.planner_start(p_slug text, p_visitor text, p_language text, p_request text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  o public.outfitters;
  v_season text;
  new_id uuid;
begin
  select * into o from public.outfitters where slug = p_slug and planner_enabled;
  if not found then
    return jsonb_build_object('error', 'off');
  end if;
  if p_visitor is null or p_visitor !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = 'P0001', message = 'Something went wrong. Refresh the page and try again.';
  end if;
  if (select count(*) from public.planner_requests r
      where r.visitor = p_visitor and r.created_at > now() - interval '1 hour') >= 8
     or (select count(*) from public.planner_requests r
         where r.outfitter_id = o.id and r.created_at > now() - interval '1 day') >= 300 then
    return jsonb_build_object('error', 'busy');
  end if;

  insert into public.planner_requests (outfitter_id, visitor, language, request)
  values (o.id, p_visitor, p_language, btrim(p_request))
  returning id into new_id;

  v_season := coalesce(nullif(btrim(o.active_season), ''), 'Current');
  return jsonb_build_object(
    'id', new_id,
    'catalogue', jsonb_build_object(
      'outfitter', o.name,
      'country_code', o.country_code,
      'currency', o.default_currency,
      'season', v_season,
      'species', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', s.id,
                 'name', s.name,
                 'notes', s.notes,
                 'amount', f.amount,
                 'on_request', f.on_request
               ) order by s.sort_order, s.name)
        from public.species s
        join public.trophy_fees f on f.species_id = s.id and f.season = v_season
        where s.outfitter_id = o.id and s.is_published
      ), '[]'::jsonb),
      'rates', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', r.id,
                 'name', r.name,
                 'unit', r.unit,
                 'price_type', r.price_type,
                 'amount', r.amount
               ) order by r.sort_order, r.name)
        from public.rates r
        where r.outfitter_id = o.id and r.season = v_season
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
        where c.outfitter_id = o.id and c.is_active
      ), '[]'::jsonb)
    )
  );
end;
$$;

-- Store the priced plan, once, soon after starting ----------------------------------
create function public.planner_finish(p_id uuid, p_visitor text, p_plan jsonb)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  n integer;
begin
  update public.planner_requests r
     set plan = p_plan
   where r.id = p_id and r.visitor = p_visitor and r.plan is null
     and r.created_at > now() - interval '15 minutes';
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

-- The hunter picks a package and leaves their details --------------------------------
create function public.planner_submit(
  p_id uuid, p_visitor text, p_package integer,
  p_name text, p_email text, p_phone text, p_country text, p_consent boolean
)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  r public.planner_requests;
  pkg jsonb;
  new_lead uuid;
begin
  select * into r from public.planner_requests
   where id = p_id and visitor = p_visitor and plan is not null and lead_id is null
     and created_at > now() - interval '1 day'
   for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'This plan has expired. Plan your hunt again and send it.';
  end if;
  pkg := r.plan -> 'packages' -> p_package;
  if p_package is null or p_package < 0 or pkg is null then
    raise exception using errcode = 'P0001', message = 'Pick one of the packages and try again.';
  end if;

  insert into public.leads (
    outfitter_id, created_by, full_name, email, phone, country_code, source,
    rough_dates, hunters, observers, notes, temperature, marketing_consent
  ) values (
    r.outfitter_id, null, btrim(p_name), nullif(btrim(p_email), ''), nullif(btrim(p_phone), ''),
    nullif(upper(btrim(p_country)), ''), 'planner',
    left(nullif(btrim(r.plan -> 'trip' ->> 'when'), ''), 100),
    case when (r.plan -> 'trip' ->> 'hunters') ~ '^[0-9]{1,2}$'
         then least(greatest((r.plan -> 'trip' ->> 'hunters')::integer, 1), 20) end,
    case when (r.plan -> 'trip' ->> 'observers') ~ '^[0-9]{1,2}$'
         then least((r.plan -> 'trip' ->> 'observers')::integer, 20) end,
    left('Hunt planner: ' || r.request, 2000),
    'hot',
    coalesce(p_consent, false)
  )
  returning id into new_lead;

  insert into public.lead_species (lead_id, species_id, outfitter_id)
  select distinct new_lead, s.id, r.outfitter_id
  from jsonb_array_elements(coalesce(pkg -> 'trophies', '[]'::jsonb)) t
  join public.species s on s.outfitter_id = r.outfitter_id
   and (t ->> 'species_id') ~ '^[0-9a-f-]{36}$' and s.id = (t ->> 'species_id')::uuid;

  update public.planner_requests set lead_id = new_lead, chosen = p_package where id = r.id;
  return true;
end;
$$;

revoke all on function public.planner_outfitter(text) from public;
revoke all on function public.planner_start(text, text, text, text) from public;
revoke all on function public.planner_finish(uuid, text, jsonb) from public;
revoke all on function public.planner_submit(uuid, text, integer, text, text, text, text, boolean) from public;
grant execute on function public.planner_outfitter(text) to anon, authenticated;
grant execute on function public.planner_start(text, text, text, text) to anon, authenticated;
grant execute on function public.planner_finish(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.planner_submit(uuid, text, integer, text, text, text, text, boolean) to anon, authenticated;
