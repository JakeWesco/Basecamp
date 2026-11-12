-- Outfitter #1. Wesco is data, not branding: nothing in the app refers to it.
insert into public.outfitters
  (name, slug, country_code, default_currency, default_language, timezone,
   email, phone, website, invoice_prefix, active_season)
values
  ('Wesco Safaris', 'wesco-safaris', 'ZA', 'USD', 'en', 'Africa/Johannesburg',
   'jaco@wescosafaris.com', '+27 79 709 1179', 'wescosafaris.com', 'WS', '2026/2027')
on conflict (slug) do nothing;

insert into public.regions (outfitter_id, country_code, name, sort_order)
select o.id, 'ZA', r.name, r.ord
from public.outfitters o
cross join (values
  ('Northern Cape', 1), ('Free State', 2), ('Limpopo', 3),
  ('Eastern Cape', 4), ('Kalahari', 5)
) as r(name, ord)
where o.slug = 'wesco-safaris'
on conflict do nothing;
