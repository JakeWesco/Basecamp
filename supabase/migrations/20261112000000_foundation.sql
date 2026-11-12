-- Basecamp Phase 0: foundation.
-- Multi-tenant from day one: every tenant table carries outfitter_id and is
-- protected by row-level security. Membership decides what a user can see.


-- ---------------------------------------------------------------------------
-- Roles
-- admin  : outfitter staff, full access to their own outfitter
-- agent  : show/booking agents, limited access (rules added per table)
-- client : a hunter, sees only their own records
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('admin', 'agent', 'client');

-- ---------------------------------------------------------------------------
-- Outfitters (the tenant). Nothing here is South Africa specific: country,
-- currency, language and branding are all per outfitter.
-- ---------------------------------------------------------------------------
create table public.outfitters (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  slug                 text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  country_code         char(2) not null,                -- ISO 3166-1 alpha-2
  default_currency     char(3) not null default 'USD',  -- ISO 4217
  default_language     text not null default 'en',      -- BCP 47
  timezone             text not null default 'Africa/Johannesburg',
  email                text,
  phone                text,
  website              text,
  address              text,
  logo_url             text,
  brand_primary        text check (brand_primary ~ '^#[0-9A-Fa-f]{6}$'),
  brand_accent         text check (brand_accent ~ '^#[0-9A-Fa-f]{6}$'),
  payment_instructions text,   -- shown to clients; Basecamp takes no payments
  invoice_prefix       text not null default 'INV' check (invoice_prefix ~ '^[A-Z0-9]{1,6}$'),
  active_season        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Memberships: which user belongs to which outfitter, in which role.
-- A user can belong to more than one outfitter (e.g. an agent).
-- ---------------------------------------------------------------------------
create table public.memberships (
  id           uuid primary key default gen_random_uuid(),
  outfitter_id uuid not null references public.outfitters(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         public.member_role not null,
  full_name    text,
  is_active    boolean not null default true,   -- false = login blocked, data kept
  created_at   timestamptz not null default now(),
  unique (outfitter_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

-- ---------------------------------------------------------------------------
-- Regions / hunting areas' regions, per outfitter and country.
-- Replaces the fixed South African province list from the Wesco portal.
-- ---------------------------------------------------------------------------
create table public.regions (
  id           uuid primary key default gen_random_uuid(),
  outfitter_id uuid not null references public.outfitters(id) on delete cascade,
  country_code char(2) not null,
  name         text not null,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  unique (outfitter_id, country_code, name)
);
create index regions_outfitter_idx on public.regions (outfitter_id);

-- ---------------------------------------------------------------------------
-- Helper functions. SECURITY DEFINER so policies can check membership
-- without recursing into the memberships policies themselves.
-- ---------------------------------------------------------------------------
create or replace function public.is_member(target uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.outfitter_id = target and m.user_id = auth.uid() and m.is_active
  );
$$;

create or replace function public.has_role(target uuid, roles public.member_role[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.outfitter_id = target and m.user_id = auth.uid()
      and m.is_active and m.role = any (roles)
  );
$$;

revoke all on function public.is_member(uuid) from public;
revoke all on function public.has_role(uuid, public.member_role[]) from public;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.has_role(uuid, public.member_role[]) to authenticated;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger outfitters_touch before update on public.outfitters
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.outfitters  enable row level security;
alter table public.memberships enable row level security;
alter table public.regions     enable row level security;

-- Outfitters: members read their own outfitter; admins update it.
-- Creating outfitters happens server-side (service role) during onboarding.
create policy outfitters_select on public.outfitters
  for select to authenticated using (public.is_member(id));
create policy outfitters_update on public.outfitters
  for update to authenticated
  using (public.has_role(id, array['admin']::public.member_role[]))
  with check (public.has_role(id, array['admin']::public.member_role[]));

-- Memberships: everyone sees their own row; admins see and manage their team.
create policy memberships_select on public.memberships
  for select to authenticated
  using (user_id = auth.uid()
         or public.has_role(outfitter_id, array['admin']::public.member_role[]));
create policy memberships_insert on public.memberships
  for insert to authenticated
  with check (public.has_role(outfitter_id, array['admin']::public.member_role[]));
-- Admins manage other people's memberships, never their own (no self-demotion
-- or self-promotion, no locking yourself out).
create policy memberships_update on public.memberships
  for update to authenticated
  using (user_id <> auth.uid()
         and public.has_role(outfitter_id, array['admin']::public.member_role[]))
  with check (user_id <> auth.uid()
              and public.has_role(outfitter_id, array['admin']::public.member_role[]));
create policy memberships_delete on public.memberships
  for delete to authenticated
  using (user_id <> auth.uid()
         and public.has_role(outfitter_id, array['admin']::public.member_role[]));

-- Regions: staff (admin, agent) read; admins write. Clients see region names
-- through their own trip records later, not by listing them here.
create policy regions_select on public.regions
  for select to authenticated
  using (public.has_role(outfitter_id, array['admin','agent']::public.member_role[]));
create policy regions_write on public.regions
  for all to authenticated
  using (public.has_role(outfitter_id, array['admin']::public.member_role[]))
  with check (public.has_role(outfitter_id, array['admin']::public.member_role[]));

grant select, update on public.outfitters to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;
grant select, insert, update, delete on public.regions to authenticated;

-- ---------------------------------------------------------------------------
-- Bootstrap: attach an existing auth user to an outfitter as its first admin.
-- Run from the SQL editor (service role) after that person has signed up.
-- Not callable by app users.
-- ---------------------------------------------------------------------------
create or replace function public.bootstrap_admin(outfitter_slug text, user_email text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  o_id uuid;
  u_id uuid;
begin
  select id into o_id from public.outfitters where slug = outfitter_slug;
  if o_id is null then raise exception 'No outfitter with slug %', outfitter_slug; end if;
  select id into u_id from auth.users where lower(email) = lower(user_email);
  if u_id is null then raise exception 'No user with email % (sign up first)', user_email; end if;
  insert into public.memberships (outfitter_id, user_id, role)
  values (o_id, u_id, 'admin')
  on conflict (outfitter_id, user_id) do update set role = 'admin', is_active = true;
end;
$$;
revoke all on function public.bootstrap_admin(text, text) from public;
