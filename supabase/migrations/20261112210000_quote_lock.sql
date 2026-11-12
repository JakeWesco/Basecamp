-- Quote lock: a quote's prices are held for 14 days from when it goes to the
-- hunter (marked as sent, or its share link is created, whichever is first).
-- Line prices are already copied onto the quote when a line is added, so
-- changing the price list never changes a quote. The lock adds the date the
-- hunter can rely on, and fixes the exchange rate to that day.
--
--  * locked_at is set by the database, never by the app: any value sent is
--    replaced with now(), and it can't be cleared. "Update to today's prices"
--    re-locks it from now.
--  * The 14 days live in the app (src/lib/quote-lock.ts), so they can become
--    an outfitter setting later without touching data.

alter table public.quotes add column locked_at timestamptz;

create function private.quote_lock_rules()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.locked_at := null;
    return new;
  end if;

  if new.locked_at is distinct from old.locked_at then
    -- Re-locking ("update to today's prices") always starts now; clearing isn't allowed.
    new.locked_at := case when new.locked_at is null then old.locked_at else now() end;
  elsif old.locked_at is null and (new.status = 'sent' or new.share_token is not null) then
    new.locked_at := now();
  end if;
  return new;
end;
$$;
revoke all on function private.quote_lock_rules() from public, anon, authenticated;

create trigger quotes_lock_rules before insert or update on public.quotes
  for each row execute function private.quote_lock_rules();

-- The hunter page needs the lock date: same lookup as before, plus locked_at.
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
    ), '[]'::jsonb)
  )
  from public.quotes q
  join public.outfitters o on o.id = q.outfitter_id
  where token ~ '^[0-9a-f]{64}$' and q.share_token = token
$$;
revoke all on function public.shared_quote(text) from public;
grant execute on function public.shared_quote(text) to anon, authenticated;
