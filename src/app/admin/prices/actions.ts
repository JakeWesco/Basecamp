"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checkFee, checkRate, type FieldErrors } from "@/lib/prices";

// Every action checks the admin role here AND relies on RLS in the database
// (CLAUDE.md, Roles): agents and clients can never change prices.

export type FormState = { ok: boolean; errors: FieldErrors; message?: string };

const PATH = "/admin/prices";

async function adminContext() {
  const me = await requireRole("admin");
  const supabase = await createClient();
  const { data: outfitter } = await supabase
    .from("outfitters")
    .select("active_season")
    .eq("id", me.outfitterId)
    .single();
  const season = outfitter?.active_season?.trim() || "Current";
  return { me, supabase, season };
}

function failed(message: string): FormState {
  return { ok: false, errors: { form: message } };
}

const DUPLICATE = "23505";
// New rates and species go after the imported ones, then sort by name.
const NEW_ITEM_ORDER = 10_000;

export async function saveRate(_prev: FormState, form: FormData): Promise<FormState> {
  const checked = checkRate({
    name: form.get("name"),
    unit: form.get("unit"),
    priceType: form.get("priceType"),
    amount: form.get("amount"),
  });
  if (!checked.ok) return { ok: false, errors: checked.errors };
  const { me, supabase, season } = await adminContext();
  const id = String(form.get("id") ?? "");

  const { error } = id
    ? await supabase.from("rates").update(checked.value).eq("id", id).eq("outfitter_id", me.outfitterId)
    : await supabase.from("rates").insert({
        ...checked.value,
        outfitter_id: me.outfitterId,
        season,
        sort_order: NEW_ITEM_ORDER,
      });
  if (error) return failed("The rate was not saved. Check your connection and try again.");
  revalidatePath(PATH);
  return { ok: true, errors: {}, message: id ? "Rate updated" : "Rate added" };
}

export async function deleteRate(id: string): Promise<FormState> {
  const { me, supabase } = await adminContext();
  const { error, count } = await supabase
    .from("rates")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("outfitter_id", me.outfitterId);
  if (error || !count) return failed("The rate was not removed. Refresh the page and try again.");
  revalidatePath(PATH);
  return { ok: true, errors: {}, message: "Rate removed" };
}

export async function saveSpeciesFee(_prev: FormState, form: FormData): Promise<FormState> {
  const checked = checkFee({
    name: form.get("name"),
    priceType: form.get("priceType"),
    amount: form.get("amount"),
    published: form.get("published"),
  });
  if (!checked.ok) return { ok: false, errors: checked.errors };
  const { me, supabase, season } = await adminContext();
  const { name, onRequest, amount, isPublished } = checked.value;
  let speciesId = String(form.get("speciesId") ?? "");

  if (speciesId) {
    const { error } = await supabase
      .from("species")
      .update({ name, is_published: isPublished })
      .eq("id", speciesId)
      .eq("outfitter_id", me.outfitterId);
    if (error?.code === DUPLICATE) return { ok: false, errors: { name: "You already have a species with that name." } };
    if (error) return failed("The species was not saved. Check your connection and try again.");
  } else {
    const { data, error } = await supabase
      .from("species")
      .insert({ outfitter_id: me.outfitterId, name, is_published: isPublished, sort_order: NEW_ITEM_ORDER })
      .select("id")
      .single();
    if (error?.code === DUPLICATE) return { ok: false, errors: { name: "You already have a species with that name." } };
    if (error || !data) return failed("The species was not saved. Check your connection and try again.");
    speciesId = data.id;
  }

  const { error: feeError } = await supabase.from("trophy_fees").upsert(
    { outfitter_id: me.outfitterId, species_id: speciesId, season, amount, on_request: onRequest },
    { onConflict: "species_id,season" },
  );
  if (feeError) return failed("The trophy fee was not saved. Check your connection and try again.");
  revalidatePath(PATH);
  return { ok: true, errors: {}, message: form.get("speciesId") ? "Trophy fee updated" : "Species added" };
}

export async function deleteSpecies(speciesId: string): Promise<FormState> {
  const { me, supabase } = await adminContext();
  const { error, count } = await supabase
    .from("species")
    .delete({ count: "exact" })
    .eq("id", speciesId)
    .eq("outfitter_id", me.outfitterId);
  if (error || !count) return failed("The species was not removed. Refresh the page and try again.");
  revalidatePath(PATH);
  return { ok: true, errors: {}, message: "Species removed" };
}
