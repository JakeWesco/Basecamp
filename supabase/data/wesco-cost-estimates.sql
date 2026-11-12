-- Starting list of "other costs to plan for" for Wesco Safaris (USD).
-- These are typical ranges for a hunt in South Africa, written by Claude as a
-- starting point, NOT Wesco's own figures. They are all switched OFF: an admin
-- checks each one in Settings and switches it on before hunters see it.
-- Safe to run more than once.

insert into public.cost_estimates (outfitter_id, name, note, basis, low, high, is_active, sort_order)
select o.id, c.name, c.note, c.basis, c.low, c.high, false, c.ord
from public.outfitters o
cross join (values
  ('Flights to South Africa', 'Return flight, paid to your airline. Depends on where and when you fly.', 'per_person', 1200.00, 2200.00, 1),
  ('Firearm import permit', 'If you bring your own rifle. Arranged in advance through a permit service.', 'per_hunter', 100.00, 250.00, 2),
  ('Travel insurance', 'Including medical cover and firearms in transit.', 'per_person', 100.00, 300.00, 3),
  ('Dip and pack', 'Preparing each trophy for export, paid to the dip and pack company.', 'per_trophy', 150.00, 300.00, 4),
  ('Taxidermy in South Africa', 'Only if you want mounts done here. Shoulder mounts; full mounts cost more.', 'per_trophy', 600.00, 1200.00, 5),
  ('Shipping trophies home', 'Crate and air freight to your country. Depends on size and destination.', 'per_trip', 1500.00, 3500.00, 6),
  ('Tips for the hunting team', 'For your professional hunter, trackers and camp staff. A guide only, never required.', 'per_hunter_day', 60.00, 120.00, 7)
) as c(name, note, basis, low, high, ord)
where o.slug = 'wesco-safaris'
on conflict (outfitter_id, lower(btrim(name))) do nothing;
