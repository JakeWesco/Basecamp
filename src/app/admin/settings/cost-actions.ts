"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checkCost, type CostFieldErrors } from "@/lib/costs";

// Other costs to plan for: admins only (CLAUDE.md, Roles). RLS enforces the
// same in the database.

export type CostFormState = { ok: boolean; errors: CostFieldErrors; message?: string };
export type CostResult = { ok: boolean; error?: string; message?: string };

const GENERIC = "That didn't save. Check your connection and try again.";

function refresh() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/quotes", "layout");
  revalidatePath("/agent/quotes", "layout");
}

export async function saveCost(_prev: CostFormState, form: FormData): Promise<CostFormState> {
  const checked = checkCost({
    name: form.get("name"),
    note: form.get("note"),
    basis: form.get("basis"),
    low: form.get("low"),
    high: form.get("high"),
  });
  if (!checked.ok) return { ok: false, errors: checked.errors };
  const me = await requireRole("admin");
  const supabase = await createClient();
  const id = String(form.get("id") ?? "");
  const { error } = id
    ? await supabase.from("cost_estimates").update(checked.value).eq("id", id).eq("outfitter_id", me.outfitterId)
    : await supabase.from("cost_estimates").insert({ ...checked.value, outfitter_id: me.outfitterId, sort_order: 1000 });
  if (error?.code === "23505") return { ok: false, errors: { name: "You already have a cost with that name." } };
  if (error) return { ok: false, errors: { form: GENERIC } };
  refresh();
  return { ok: true, errors: {}, message: id ? "Cost saved" : "Cost added. Switch it on to show it on quotes." };
}

export async function setCostActive(id: string, active: boolean): Promise<CostResult> {
  const me = await requireRole("admin");
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("cost_estimates")
    .update({ is_active: active }, { count: "exact" })
    .eq("id", id)
    .eq("outfitter_id", me.outfitterId);
  if (error || !count) return { ok: false, error: GENERIC };
  refresh();
  return { ok: true, message: active ? "Now shown on quotes" : "No longer shown on quotes" };
}

export async function deleteCost(id: string): Promise<CostResult> {
  const me = await requireRole("admin");
  const supabase = await createClient();
  const { error, count } = await supabase.from("cost_estimates").delete({ count: "exact" }).eq("id", id).eq("outfitter_id", me.outfitterId);
  if (error || !count) return { ok: false, error: "That cost was not removed. Refresh the page and try again." };
  refresh();
  return { ok: true, message: "Cost removed" };
}
