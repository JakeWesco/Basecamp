-- Share links: each quote can have a private link a hunter opens without
-- logging in (CLAUDE.md rule 5, WhatsApp first).
--
--  * The link carries a 64 character random token (two v4 UUIDs, 244 random
--    bits). Nobody chooses it: any value the app sends is replaced by a fresh
--    one, so a link can't be guessed or picked. Setting it to null turns the
--    link off; turning it on again makes a new link.
--  * Hunters read the quote through public.shared_quote(token), the one
--    function in public that signed-out visitors may call. It returns only
--    what the hunter should see: no email or phone, no internal ids, and not
--    who on the team gave a discount or freebie (CLAUDE.md rule 7).

alter table public.quotes
  add column share_token text unique check (share_token is null or share_token ~ '^[0-9a-f]{64}$'),
  add column shared_at   timestamptz;

-- The quote rules from 20261112180000_quotes.sql, plus the share link.
create or replace function private.quote_rules()
returns trigger language plpgsql set search_path = '' as $$
declare
  max_pct numeric;
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce((select auth.uid()), new.created_by);
    select coalesce(nullif(btrim(o.active_season), ''), 'Current'), o.default_currency
      into new.season, new.currency
      from public.outfitters o where o.id = new.outfitter_id;
    -- A new quote has no link until someone creates one.
    new.share_token := null;
    new.shared_at := null;
  else
    -- Who made it, for which outfitter, season and currency never change.
    new.created_by := old.created_by;
    new.outfitter_id := old.outfitter_id;
    new.season := old.season;
    new.currency := old.currency;

    if new.share_token is distinct from old.share_token then
      if new.share_token is null then
        new.shared_at := null;
      else
        new.share_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
        new.shared_at := now();
      end if;
    else
      new.shared_at := old.shared_at;
    end if;
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
revoke all on function private.quote_rules() from public, anon, authenticated;

-- What a hunter sees through the link. Null when the link is wrong or off.
create function public.shared_quote(token text)
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
    ), '[]'::jsonb)
  )
  from public.quotes q
  join public.outfitters o on o.id = q.outfitter_id
  where token ~ '^[0-9a-f]{64}$' and q.share_token = token
$$;

revoke all on function public.shared_quote(text) from public;
grant execute on function public.shared_quote(text) to anon, authenticated;
