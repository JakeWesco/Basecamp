"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checkDiscount } from "@/lib/quotes";

export type LimitsState = { ok: boolean; error?: string; message?: string };

/** Saves the agent limits: the highest discount and which extras can be free. Admins only. */
export async function saveAgentLimits(_prev: LimitsState, form: FormData): Promise<LimitsState> {
  const me = await requireRole("admin");
  const discount = checkDiscount(form.get("maxDiscount"));
  if (!discount.ok) return { ok: false, error: discount.error };

  const supabase = await createClient();
  const { data: outfitter } = await supabase.from("outfitters").select("active_season").eq("id", me.outfitterId).single();
  const season = outfitter?.active_season?.trim() || "Current";
  const free = form.getAll("freeRate").map(String);

  const { error } = await supabase
    .from("outfitters")
    .update({ agent_max_discount_percent: discount.value })
    .eq("id", me.outfitterId);
  if (error) return { ok: false, error: "The limits were not saved. Check your connection and try again." };

  const off = await supabase
    .from("rates")
    .update({ agent_can_give_free: false })
    .eq("outfitter_id", me.outfitterId)
    .eq("season", season);
  const on = free.length
    ? await supabase.from("rates").update({ agent_can_give_free: true }).eq("outfitter_id", me.outfitterId).in("id", free)
    : { error: null };
  if (off.error || on.error) return { ok: false, error: "The free extras were not saved. Check your connection and try again." };

  revalidatePath("/admin/settings");
  return { ok: true, message: "Agent limits saved" };
}

/** Switches the public hunt planner page on or off. Admins only. */
export async function setPlannerEnabled(on: boolean): Promise<LimitsState> {
  const me = await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("outfitters").update({ planner_enabled: on }).eq("id", me.outfitterId);
  if (error) return { ok: false, error: "The planner setting was not saved. Check your connection and try again." };
  revalidatePath("/admin/settings");
  return { ok: true, message: on ? "Hunt planner is on" : "Hunt planner is off" };
}
