import { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingLabel, SectionHeading, SkeletonCard } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AgentLimitsForm } from "./agent-limits-form";
import { CostEstimatesCard, type CostRow } from "./cost-estimates-card";

export const metadata: Metadata = { title: "Settings" };

async function Settings() {
  const me = await requireRole("admin");
  const supabase = await createClient();
  const { data: outfitter } = await supabase
    .from("outfitters")
    .select("active_season, default_currency, agent_max_discount_percent")
    .eq("id", me.outfitterId)
    .single();
  const season = outfitter?.active_season?.trim() || "Current";
  const [{ data: rates }, { data: costs }] = await Promise.all([
    supabase
      .from("rates")
      .select("id, name, agent_can_give_free")
      .eq("outfitter_id", me.outfitterId)
      .eq("season", season)
      .order("sort_order")
      .order("name"),
    supabase
      .from("cost_estimates")
      .select("id, name, note, basis, low, high, is_active")
      .eq("outfitter_id", me.outfitterId)
      .order("sort_order")
      .order("name"),
  ]);

  return (
    <>
      <AgentLimitsForm
        maxDiscount={Number(outfitter?.agent_max_discount_percent ?? 0)}
        rates={(rates ?? []).map((r) => ({ id: r.id as string, name: r.name as string, free: Boolean(r.agent_can_give_free) }))}
      />
      <CostEstimatesCard
        currency={outfitter?.default_currency ?? "USD"}
        costs={(costs ?? []).map((c) => ({ ...(c as CostRow), low: Number(c.low), high: Number(c.high) }))}
      />
    </>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeading level={1} eyebrow="Admin" title="Settings" description="Rules for your team and what hunters see on quotes. Only admins see this page." />
      <Suspense
        fallback={
          <>
            <LoadingLabel>Loading settings</LoadingLabel>
            <SkeletonCard />
            <SkeletonCard />
          </>
        }
      >
        <Settings />
      </Suspense>
    </div>
  );
}
