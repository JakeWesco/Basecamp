-- Fixes for everything Supabase's security and performance advisors flagged
-- on the foundation migration. Behaviour of the policies is unchanged.
--
-- 1. bootstrap_admin, is_member and has_role were callable through the API
--    (/rest/v1/rpc/...) by signed-out and signed-in users. Supabase grants
--    EXECUTE to anon and authenticated directly, so the foundation's
--    "revoke ... from public" did not remove it. bootstrap_admin let any
--    signed-up user make themselves an outfitter's admin.
-- 2. The policy helpers move to a "private" schema that the API does not
--    expose. Policies still call them, so signed-in users keep EXECUTE.
-- 3. touch_updated_at gets a fixed search_path.
-- 4. Policies call (select auth.uid()) so Postgres evaluates it once per
--    query, not once per row.
-- 5. regions had two permissive SELECT policies (regions_select and the
--    "for all" regions_write); writes are now split per action.


-- 1. Lock bootstrap_admin to the SQL editor / service role ---------------------
revoke execute on function public.bootstrap_admin(text, text) from public, anon, authenticated;


-- 2. Policy helpers in a non-exposed schema ------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.is_member(target uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.outfitter_id = target and m.user_id = (select auth.uid()) and m.is_active
  );
$$;

create function private.has_role(target uuid, roles public.member_role[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.outfitter_id = target and m.user_id = (select auth.uid())
      and m.is_active and m.role = any (roles)
  );
$$;

revoke all on function private.is_member(uuid) from public, anon;
revoke all on function private.has_role(uuid, public.member_role[]) from public, anon;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.has_role(uuid, public.member_role[]) to authenticated;


-- 3. Fixed search_path on the trigger function ---------------------------------
alter function public.touch_updated_at() set search_path = '';
revoke execute on function public.touch_updated_at() from public, anon, authenticated;


-- 4 + 5. Recreate the policies on the private helpers --------------------------
drop policy outfitters_select  on public.outfitters;
drop policy outfitters_update  on public.outfitters;
drop policy memberships_select on public.memberships;
drop policy memberships_insert on public.memberships;
drop policy memberships_update on public.memberships;
drop policy memberships_delete on public.memberships;
drop policy regions_select     on public.regions;
drop policy regions_write      on public.regions;

create policy outfitters_select on public.outfitters
  for select to authenticated using (private.is_member(id));
create policy outfitters_update on public.outfitters
  for update to authenticated
  using (private.has_role(id, array['admin']::public.member_role[]))
  with check (private.has_role(id, array['admin']::public.member_role[]));

create policy memberships_select on public.memberships
  for select to authenticated
  using (user_id = (select auth.uid())
         or private.has_role(outfitter_id, array['admin']::public.member_role[]));
create policy memberships_insert on public.memberships
  for insert to authenticated
  with check (private.has_role(outfitter_id, array['admin']::public.member_role[]));
create policy memberships_update on public.memberships
  for update to authenticated
  using (user_id <> (select auth.uid())
         and private.has_role(outfitter_id, array['admin']::public.member_role[]))
  with check (user_id <> (select auth.uid())
              and private.has_role(outfitter_id, array['admin']::public.member_role[]));
create policy memberships_delete on public.memberships
  for delete to authenticated
  using (user_id <> (select auth.uid())
         and private.has_role(outfitter_id, array['admin']::public.member_role[]));

-- Staff (admin, agent) read; admins write. One policy per action.
create policy regions_select on public.regions
  for select to authenticated
  using (private.has_role(outfitter_id, array['admin','agent']::public.member_role[]));
create policy regions_insert on public.regions
  for insert to authenticated
  with check (private.has_role(outfitter_id, array['admin']::public.member_role[]));
create policy regions_update on public.regions
  for update to authenticated
  using (private.has_role(outfitter_id, array['admin']::public.member_role[]))
  with check (private.has_role(outfitter_id, array['admin']::public.member_role[]));
create policy regions_delete on public.regions
  for delete to authenticated
  using (private.has_role(outfitter_id, array['admin']::public.member_role[]));


-- The old public helpers are no longer used by any policy.
drop function public.is_member(uuid);
drop function public.has_role(uuid, public.member_role[]);
