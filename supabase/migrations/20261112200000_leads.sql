-- Lead inbox: hunters who might book (CLAUDE.md, Roles).
--  * Admins see and edit every lead of their outfitter; agents only the leads
--    they created; clients none.
--  * A lead needs a name and at least an email or a phone number. Phones are
--    stored in international format (+ and country code, digits only).
--  * Marketing consent is off unless ticked, and records when it was given.
--  * Quotes can be made from a lead (quotes.lead_id). You can only link a
--    quote to a lead you can see.

create table public.leads (
  id                uuid primary key default gen_random_uuid(),
  outfitter_id      uuid not null references public.outfitters (id) on delete cascade,
  created_by        uuid not null,
  full_name         text not null check (length(btrim(full_name)) between 1 and 120),
  email             text check (email is null or (length(email) <= 200 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$')),
  phone             text check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$'),
  country_code      char(2) check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  source            text check (source is null or source in
                      ('show', 'referral', 'website', 'whatsapp', 'social_media', 'past_client', 'agent', 'other')),
  rough_dates       text check (rough_dates is null or length(rough_dates) <= 100),
  budget_band       text check (budget_band is null or budget_band in
                      ('under_5000', '5000_10000', '10000_20000', '20000_40000', 'over_40000')),
  hunters           integer check (hunters is null or hunters between 1 and 20),
  observers         integer check (observers is null or observers between 0 and 20),
  notes             text check (notes is null or length(notes) <= 2000),
  temperature       text not null default 'warm' check (temperature in ('hot', 'warm', 'cold')),
  status            text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'booked', 'lost')),
  lost_reason       text check (lost_reason is null or length(lost_reason) <= 200),
  marketing_consent boolean not null default false,
  consent_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, outfitter_id),
  check (email is not null or phone is not null),
  check (status <> 'lost' or length(btrim(coalesce(lost_reason, ''))) > 0)
);
create index leads_outfitter_idx on public.leads (outfitter_id, created_at desc);
create index leads_created_by_idx on public.leads (created_by);

-- Species a lead is interested in, from the outfitter's price list.
create table public.lead_species (
  lead_id      uuid not null,
  species_id   uuid not null,
  outfitter_id uuid not null,
  primary key (lead_id, species_id),
  foreign key (lead_id, outfitter_id) references public.leads (id, outfitter_id) on delete cascade,
  foreign key (species_id, outfitter_id) references public.species (id, outfitter_id) on delete cascade
);
create index lead_species_lead_idx on public.lead_species (lead_id, outfitter_id);
create index lead_species_species_idx on public.lead_species (species_id, outfitter_id);

-- Quotes made from a lead. Deleting the lead keeps the quote.
alter table public.quotes add column lead_id uuid;
alter table public.quotes
  add constraint quotes_lead_fkey foreign key (lead_id, outfitter_id)
  references public.leads (id, outfitter_id) on delete set null (lead_id);
create index quotes_lead_idx on public.quotes (lead_id, outfitter_id);

create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

-- Rules ------------------------------------------------------------------------
create function private.lead_rules()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce((select auth.uid()), new.created_by);
  else
    new.created_by := old.created_by;
    new.outfitter_id := old.outfitter_id;
  end if;
  new.email := nullif(lower(btrim(new.email)), '');
  new.lost_reason := case when new.status = 'lost' then nullif(btrim(new.lost_reason), '') end;
  if new.marketing_consent and (tg_op = 'INSERT' or not old.marketing_consent) then
    new.consent_at := now();
  elsif not new.marketing_consent then
    new.consent_at := null;
  else
    new.consent_at := old.consent_at;
  end if;
  return new;
end;
$$;

-- A quote can only point at a lead its maker can see (runs as that user).
create function private.quote_lead_rules()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.lead_id is not null
     and (tg_op = 'INSERT' or new.lead_id is distinct from old.lead_id)
     and not exists (select 1 from public.leads l where l.id = new.lead_id and l.outfitter_id = new.outfitter_id) then
    raise exception using errcode = 'P0001', message = 'That lead was not found. Refresh the page and try again.';
  end if;
  return new;
end;
$$;

revoke all on function private.lead_rules() from public, anon, authenticated;
revoke all on function private.quote_lead_rules() from public, anon, authenticated;

create trigger leads_rules before insert or update on public.leads
  for each row execute function private.lead_rules();
create trigger quotes_lead_rules before insert or update on public.quotes
  for each row execute function private.quote_lead_rules();

-- Row-level security -----------------------------------------------------------
alter table public.leads        enable row level security;
alter table public.lead_species enable row level security;

create policy leads_select on public.leads
  for select to authenticated using (
    private.has_role(outfitter_id, array['admin']::public.member_role[])
    or (created_by = (select auth.uid()) and private.has_role(outfitter_id, array['agent']::public.member_role[]))
  );
create policy leads_insert on public.leads
  for insert to authenticated with check (
    created_by = (select auth.uid())
    and private.has_role(outfitter_id, array['admin', 'agent']::public.member_role[])
  );
create policy leads_update on public.leads
  for update to authenticated
  using (
    private.has_role(outfitter_id, array['admin']::public.member_role[])
    or (created_by = (select auth.uid()) and private.has_role(outfitter_id, array['agent']::public.member_role[]))
  )
  with check (
    private.has_role(outfitter_id, array['admin']::public.member_role[])
    or (created_by = (select auth.uid()) and private.has_role(outfitter_id, array['agent']::public.member_role[]))
  );
create policy leads_delete on public.leads
  for delete to authenticated using (
    private.has_role(outfitter_id, array['admin']::public.member_role[])
    or (created_by = (select auth.uid()) and private.has_role(outfitter_id, array['agent']::public.member_role[]))
  );

-- Interests follow their lead.
create policy lead_species_select on public.lead_species
  for select to authenticated using (exists (select 1 from public.leads l where l.id = lead_id));
create policy lead_species_insert on public.lead_species
  for insert to authenticated with check (exists (select 1 from public.leads l where l.id = lead_id));
create policy lead_species_update on public.lead_species
  for update to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_id))
  with check (exists (select 1 from public.leads l where l.id = lead_id));
create policy lead_species_delete on public.lead_species
  for delete to authenticated using (exists (select 1 from public.leads l where l.id = lead_id));

revoke all on public.leads, public.lead_species from anon;
grant select, insert, update, delete on public.leads, public.lead_species to authenticated;
