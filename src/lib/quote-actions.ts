"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checkDiscount, checkQuantity, checkQuoteDetails, type QuoteFieldErrors } from "@/lib/quotes";

// Quote actions for admins and agents. The database enforces the rules (RLS
// and the quote triggers): prices come from the price list, agents stay
// within their limits, and every discount and freebie records who gave it.
// Messages raised by those rules (code P0001) are written for people, so
// they are shown as they are.

export type QuoteFormState = { ok: boolean; errors: QuoteFieldErrors; message?: string };
export type ActionResult = { ok: boolean; error?: string; message?: string };

const GENERIC = "That didn't save. Check your connection and try again.";

function dbMessage(error: { code?: string; message?: string } | null): string {
  return error?.code === "P0001" && error.message ? error.message : GENERIC;
}

function base(form: FormData | null, area?: string) {
  const a = area ?? String(form?.get("area") ?? "");
  return a === "admin" ? "/admin/quotes" : "/agent/quotes";
}

function details(form: FormData) {
  return checkQuoteDetails({
    hunterName: form.get("hunterName"),
    hunterEmail: form.get("hunterEmail"),
    hunterPhone: form.get("hunterPhone"),
    arrivalDate: form.get("arrivalDate"),
    days: form.get("days"),
    hunters: form.get("hunters"),
    observers: form.get("observers"),
    notes: form.get("notes"),
  });
}

export async function createQuote(_prev: QuoteFormState, form: FormData): Promise<QuoteFormState> {
  const checked = details(form);
  if (!checked.ok) return { ok: false, errors: checked.errors };
  const me = await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes")
    .insert({ ...checked.value, outfitter_id: me.outfitterId, created_by: me.userId })
    .select("id")
    .single();
  if (error || !data) return { ok: false, errors: { form: dbMessage(error) } };
  const path = base(form);
  revalidatePath(path);
  redirect(`${path}/${data.id}`);
}

export async function updateQuoteDetails(_prev: QuoteFormState, form: FormData): Promise<QuoteFormState> {
  const checked = details(form);
  if (!checked.ok) return { ok: false, errors: checked.errors };
  await requireStaff();
  const supabase = await createClient();
  const id = String(form.get("id") ?? "");
  const { error, count } = await supabase.from("quotes").update(checked.value, { count: "exact" }).eq("id", id);
  if (error || !count) return { ok: false, errors: { form: error ? dbMessage(error) : "That quote was not found. Refresh the page." } };
  revalidatePath(`${base(form)}/${id}`);
  return { ok: true, errors: {}, message: "Details saved" };
}

export async function setDiscount(area: string, quoteId: string, raw: string): Promise<ActionResult> {
  const checked = checkDiscount(raw);
  if (!checked.ok) return { ok: false, error: checked.error };
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("quotes").update({ discount_percent: checked.value }).eq("id", quoteId);
  if (error) return { ok: false, error: dbMessage(error) };
  revalidatePath(`${base(null, area)}/${quoteId}`);
  return { ok: true, message: checked.value ? `Discount of ${checked.value}% saved` : "Discount removed" };
}

export async function setStatus(area: string, quoteId: string, status: "draft" | "sent"): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("quotes").update({ status }).eq("id", quoteId);
  if (error) return { ok: false, error: dbMessage(error) };
  revalidatePath(`${base(null, area)}/${quoteId}`);
  return { ok: true, message: status === "sent" ? "Marked as sent" : "Back to draft" };
}

/**
 * Brings every price-list line up to today's price list, keeping quantities
 * and freebies, and holds the prices again from today if the quote was
 * locked. New lines are added before the old ones go, so nothing is lost if
 * one fails.
 */
export async function refreshPrices(area: string, quoteId: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { data: quote } = await supabase.from("quotes").select("id, locked_at").eq("id", quoteId).maybeSingle();
  if (!quote) return { ok: false, error: "That quote was not found. Refresh the page." };
  const { data: lines } = await supabase
    .from("quote_lines")
    .select("id, kind, rate_id, species_id, quantity, is_free, sort_order, description")
    .eq("quote_id", quoteId)
    .in("kind", ["rate", "trophy_fee"]);

  const skipped: string[] = [];
  for (const l of lines ?? []) {
    const { error } = await supabase.from("quote_lines").insert({
      quote_id: quoteId,
      kind: l.kind,
      rate_id: l.rate_id,
      species_id: l.species_id,
      quantity: l.quantity,
      is_free: l.is_free,
      sort_order: l.sort_order,
    });
    if (error) {
      skipped.push(l.description as string);
      continue;
    }
    await supabase.from("quote_lines").delete().eq("id", l.id);
  }
  if (quote.locked_at) {
    // The database sets the lock to now; the value sent here is ignored.
    await supabase.from("quotes").update({ locked_at: new Date().toISOString() }).eq("id", quoteId);
  }
  revalidatePath(`${base(null, area)}/${quoteId}`);
  if (skipped.length)
    return {
      ok: false,
      error: `Updated, except ${skipped.join(", ")}: no longer on the price list for this season. Remove it or ask an admin.`,
    };
  return { ok: true, message: quote.locked_at ? "Prices updated and held again from today" : "Prices updated to today's price list" };
}

/** Includes or leaves out one of the outfitter's other costs on this quote. */
export async function setCostIncluded(area: string, quoteId: string, costId: string, include: boolean): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { data: quote } = await supabase.from("quotes").select("excluded_costs").eq("id", quoteId).maybeSingle();
  if (!quote) return { ok: false, error: "That quote was not found. Refresh the page." };
  const current = new Set((quote.excluded_costs as string[]) ?? []);
  if (include) current.delete(costId);
  else current.add(costId);
  const { error } = await supabase.from("quotes").update({ excluded_costs: [...current] }).eq("id", quoteId);
  if (error) return { ok: false, error: dbMessage(error) };
  revalidatePath(`${base(null, area)}/${quoteId}`);
  return { ok: true };
}

/** Turns the hunter link on (a fresh random link every time) or off. */
export async function setShareLink(area: string, quoteId: string, on: boolean): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  // The database replaces this placeholder with a new random token; nobody picks the link.
  const { error, count } = await supabase
    .from("quotes")
    .update({ share_token: on ? "0".repeat(64) : null }, { count: "exact" })
    .eq("id", quoteId);
  if (error || !count) return { ok: false, error: error ? dbMessage(error) : "That quote was not found. Refresh the page." };
  revalidatePath(`${base(null, area)}/${quoteId}`);
  return { ok: true, message: on ? "Link ready to share" : "Link turned off. The old link no longer works." };
}

export async function addLine(
  area: string,
  quoteId: string,
  line: { kind: "rate"; rateId: string; quantity: number } | { kind: "trophy_fee"; speciesId: string; quantity: number },
): Promise<ActionResult> {
  const qty = checkQuantity(String(line.quantity));
  if (!qty.ok) return { ok: false, error: qty.error };
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("quote_lines").insert({
    quote_id: quoteId,
    kind: line.kind,
    rate_id: line.kind === "rate" ? line.rateId : null,
    species_id: line.kind === "trophy_fee" ? line.speciesId : null,
    quantity: qty.value,
    sort_order: line.kind === "rate" ? 1 : 2,
  });
  if (error) return { ok: false, error: dbMessage(error) };
  revalidatePath(`${base(null, area)}/${quoteId}`);
  return { ok: true, message: "Added to the quote" };
}

export async function updateLine(
  area: string,
  quoteId: string,
  lineId: string,
  change: { quantity?: string; isFree?: boolean },
): Promise<ActionResult> {
  const update: Record<string, unknown> = {};
  if (change.quantity !== undefined) {
    const qty = checkQuantity(change.quantity);
    if (!qty.ok) return { ok: false, error: qty.error };
    update.quantity = qty.value;
  }
  if (change.isFree !== undefined) update.is_free = change.isFree;
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("quote_lines").update(update).eq("id", lineId).eq("quote_id", quoteId);
  if (error) return { ok: false, error: dbMessage(error) };
  revalidatePath(`${base(null, area)}/${quoteId}`);
  return { ok: true };
}

export async function removeLine(area: string, quoteId: string, lineId: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error, count } = await supabase.from("quote_lines").delete({ count: "exact" }).eq("id", lineId).eq("quote_id", quoteId);
  if (error || !count) return { ok: false, error: error ? dbMessage(error) : "That line was already removed. Refresh the page." };
  revalidatePath(`${base(null, area)}/${quoteId}`);
  return { ok: true, message: "Removed from the quote" };
}

export async function deleteQuote(area: string, quoteId: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error, count } = await supabase.from("quotes").delete({ count: "exact" }).eq("id", quoteId);
  if (error || !count) return { ok: false, error: error ? dbMessage(error) : "That quote was not found. Refresh the page." };
  const path = base(null, area);
  revalidatePath(path);
  redirect(path);
}
