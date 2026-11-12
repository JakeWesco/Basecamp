import { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingLabel, SectionHeading, Skeleton, SkeletonTable } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Rate, SpeciesFee } from "@/lib/prices";
import { PriceList } from "./price-list";

export const metadata: Metadata = { title: "Prices" };

async function Prices() {
  const me = await requireRole("admin");
  const supabase = await createClient();

  const { data: outfitter } = await supabase
    .from("outfitters")
    .select("active_season, default_currency")
    .eq("id", me.outfitterId)
    .single();
  const season = outfitter?.active_season?.trim() || "Current";
  const currency = outfitter?.default_currency ?? "USD";

  const [{ data: rates }, { data: species }, { data: fees }] = await Promise.all([
    supabase
      .from("rates")
      .select("id, name, unit, price_type, amount, sort_order")
      .eq("outfitter_id", me.outfitterId)
      .eq("season", season)
      .order("sort_order")
      .order("name"),
    supabase
      .from("species")
      .select("id, name, is_published, sort_order")
      .eq("outfitter_id", me.outfitterId)
      .order("sort_order")
      .order("name"),
    supabase
      .from("trophy_fees")
      .select("id, species_id, amount, on_request")
      .eq("outfitter_id", me.outfitterId)
      .eq("season", season),
  ]);

  const feeBySpecies = new Map((fees ?? []).map((f) => [f.species_id as string, f]));
  const rows: SpeciesFee[] = (species ?? []).map((s) => {
    const fee = feeBySpecies.get(s.id as string);
    return {
      speciesId: s.id as string,
      name: s.name as string,
      isPublished: s.is_published as boolean,
      feeId: (fee?.id as string) ?? null,
      amount: fee?.amount == null ? null : Number(fee.amount),
      onRequest: Boolean(fee?.on_request),
    };
  });
  const rateRows: Rate[] = (rates ?? []).map((r) => ({
    ...(r as Rate),
    amount: r.amount == null ? null : Number(r.amount),
  }));

  return (
    <>
      <SectionHeading
        level={1}
        eyebrow="Admin"
        title="Prices"
        description={`The ${season} season, in ${currency}. Agents quote from these prices and can't change them.`}
      />
      <PriceList rates={rateRows} fees={rows} currency={currency} season={season} />
    </>
  );
}

function PricesSkeleton() {
  return (
    <>
      <LoadingLabel>Loading prices</LoadingLabel>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-12 w-72 max-w-full" />
      <SkeletonTable rows={6} columns={3} />
    </>
  );
}

export default function PricesPage() {
  return (
    <div className="flex flex-col gap-8">
      <Suspense fallback={<PricesSkeleton />}>
        <Prices />
      </Suspense>
    </div>
  );
}
