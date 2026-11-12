-- Wesco Safaris 2026/2027 price list, from Wesco_Safaris_2026-2027_Price_List.pdf
-- (Free State / Northern Cape, South Africa; amounts in USD, Wesco's default
-- currency). "POR" in the PDF is stored as price on request.
--
-- Safe to run more than once: it only adds what is missing and never
-- overwrites a price that was changed in the app afterwards.
-- Run once against the live database after the price_list migration.

-- Daily rates and extras
insert into public.rates (outfitter_id, season, name, unit, price_type, amount, sort_order)
select o.id, '2026/2027', r.name, r.unit, r.price_type, r.amount, r.ord
from public.outfitters o
cross join (values
  ('1 client per day, 1 professional hunter',   'per_day',   'fixed',      380.00, 1),
  ('2 clients per day, 1 professional hunter',  'per_day',   'fixed',      300.00, 2),
  ('Observer',                                   'per_day',   'fixed',      200.00, 3),
  ('Side trip transfer or sightseeing',          'per_trip',  'fixed',      150.00, 4),
  ('Rifle hire, big bore or small bore',         'per_day',   'fixed',       40.00, 5),
  ('Ammunition, small or big bore',              'per_round', 'cost_price',   null, 6)
) as r(name, unit, price_type, amount, ord)
where o.slug = 'wesco-safaris'
  and not exists (
    select 1 from public.rates x
    where x.outfitter_id = o.id and x.season = '2026/2027' and lower(x.name) = lower(r.name)
  );

-- Species, in the order of the PDF
insert into public.species (outfitter_id, name, sort_order)
select o.id, s.name, s.ord
from public.outfitters o
cross join (values
  ('Aoudad (Barbary sheep)', 1), ('Baboon', 2), ('Blesbuck, common', 3), ('Blesbuck, white', 4),
  ('Buffalo, 42" and under', 5), ('Buffalo, over 42"', 6),
  ('Bushbuck (Eastern Cape Province)', 7), ('Bushpig (Eastern Cape Province)', 8),
  ('Caracal', 9), ('Common reedbuck', 10), ('Common duiker', 11), ('Crocodile', 12),
  ('Eland, Cape', 13), ('Elephant', 14), ('Gemsbuck, common', 15), ('Giraffe', 16),
  ('Lechwe', 17), ('Lion', 18), ('Hippo', 19), ('Hyena, spotted', 20),
  ('Impala', 21), ('Impala, black', 22), ('Impala, white flanked', 23), ('Impala, saddle back', 24),
  ('Jackal', 25), ('Kudu, Cape (under 52")', 26), ('Klipspringer (Limpopo area)', 27),
  ('Mountain reedbuck', 28), ('Nyala', 29), ('Red hartebeest', 30), ('Roan antelope', 31),
  ('Sable antelope', 32), ('Springbuck, common', 33), ('Springbuck, white', 34),
  ('Springbuck, copper', 35), ('Springbuck, black', 36), ('Steenbuck', 37), ('Tsessebe', 38),
  ('Vervet monkey', 39), ('Warthog', 40), ('Waterbuck', 41),
  ('Wildebeest, blue', 42), ('Wildebeest, black', 43), ('Wildebeest, golden', 44),
  ('Zebra, Burchell', 45), ('Zebra, Hartmann', 46)
) as s(name, ord)
where o.slug = 'wesco-safaris'
on conflict (outfitter_id, lower(btrim(name))) do nothing;

-- Trophy fees for 2026/2027 (null amount = price on request)
insert into public.trophy_fees (outfitter_id, species_id, season, amount, on_request)
select o.id, sp.id, '2026/2027', f.amount, f.amount is null
from public.outfitters o
join (values
  ('Aoudad (Barbary sheep)', 3250.00), ('Baboon', 400.00), ('Blesbuck, common', 780.00),
  ('Blesbuck, white', 1000.00), ('Buffalo, 42" and under', 12000.00), ('Buffalo, over 42"', 14000.00),
  ('Bushbuck (Eastern Cape Province)', 1100.00), ('Bushpig (Eastern Cape Province)', 1150.00),
  ('Caracal', 850.00), ('Common reedbuck', 2000.00), ('Common duiker', 550.00), ('Crocodile', null),
  ('Eland, Cape', 4000.00), ('Elephant', null), ('Gemsbuck, common', 1800.00), ('Giraffe', 4000.00),
  ('Lechwe', 2900.00), ('Lion', null), ('Hippo', null), ('Hyena, spotted', null),
  ('Impala', 850.00), ('Impala, black', 2800.00), ('Impala, white flanked', 2980.00),
  ('Impala, saddle back', 2500.00), ('Jackal', 350.00), ('Kudu, Cape (under 52")', 3600.00),
  ('Klipspringer (Limpopo area)', 1400.00), ('Mountain reedbuck', 950.00), ('Nyala', 3150.00),
  ('Red hartebeest', 1660.00), ('Roan antelope', 7300.00), ('Sable antelope', 5500.00),
  ('Springbuck, common', 680.00), ('Springbuck, white', 1000.00), ('Springbuck, copper', 850.00),
  ('Springbuck, black', 850.00), ('Steenbuck', 450.00), ('Tsessebe', 2500.00),
  ('Vervet monkey', 100.00), ('Warthog', 600.00), ('Waterbuck', 2800.00),
  ('Wildebeest, blue', 1390.00), ('Wildebeest, black', 1500.00), ('Wildebeest, golden', 3000.00),
  ('Zebra, Burchell', 1650.00), ('Zebra, Hartmann', 1800.00)
) as f(name, amount) on true
join public.species sp on sp.outfitter_id = o.id and sp.name = f.name
where o.slug = 'wesco-safaris'
on conflict (species_id, season) do nothing;
