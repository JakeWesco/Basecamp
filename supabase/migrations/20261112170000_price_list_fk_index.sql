-- Advisor finding: trophy_fees' foreign key to species (species_id,
-- outfitter_id) had no covering index, so deleting a species or checking the
-- key scanned the table. Index it in the key's own column order.
create index trophy_fees_species_outfitter_idx on public.trophy_fees (species_id, outfitter_id);
