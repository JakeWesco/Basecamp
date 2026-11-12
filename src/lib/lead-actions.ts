"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checkLead, checkLostReason, formatPhone, LEAD_STATUSES, type LeadFieldErrors, type LeadStatus } from "@/lib/leads";
import { readChosenPackage } from "@/lib/planner";

// Lead actions for admins and agents. RLS decides whose leads each person
// can see and change (CLAUDE.md, Roles); these actions check the input and
// say what went wrong in plain words.

export type LeadFormState = { ok: boolean; errors: LeadFieldErrors; message?: string; savedId?: string };
export type ActionResult = { ok: boolean; error?: string; message?: string };

const GENERIC = "That didn't save. Check your connection and try again.";
const base = (area: unknown) => (area === "admin" ? "/admin/leads" : "/agent/leads");

function dbMessage(error: { code?: string; message?: string } | null) {
  return error?.code === "P0001" && error.message ? error.message : GENERIC;
}

/** Adds a lead or saves changes. "again" in the form keeps you on the add form for the next hunter. */
export async function saveLead(_prev: LeadFormState, form: FormData): Promise<LeadFormState> {
  const checked = checkLead({
    fullName: form.get("fullName"),
    email: form.get("email"),
    phone: form.get("phone"),
    country: form.get("country"),
    source: form.get("source"),
    roughDates: form.get("roughDates"),
    budget: form.get("budget"),
    hunters: form.get("hunters"),
    observers: form.get("observers"),
    notes: form.get("notes"),
    temperature: form.get("temperature"),
    consent: form.get("consent"),
  });
  if (!checked.ok) return { ok: false, errors: checked.errors };
  const me = await requireStaff();
  const supabase = await createClient();
  const area = form.get("area");
  const id = String(form.get("id") ?? "");
  const species = [...new Set(form.getAll("species").map(String))].filter((s) => /^[0-9a-f-]{36}$/i.test(s));

  let leadId = id;
  if (id) {
    const { error, count } = await supabase.from("leads").update(checked.value, { count: "exact" }).eq("id", id);
    if (error || !count) return { ok: false, errors: { form: error ? dbMessage(error) : "That lead was not found. Refresh the page." } };
    const { error: clearError } = await supabase.from("lead_species").delete().eq("lead_id", id);
    if (clearError) return { ok: false, errors: { form: GENERIC } };
  } else {
    const { data, error } = await supabase
      .from("leads")
      .insert({ ...checked.value, outfitter_id: me.outfitterId, created_by: me.userId })
      .select("id")
      .single();
    if (error || !data) return { ok: false, errors: { form: dbMessage(error) } };
    leadId = data.id;
  }
  if (species.length) {
    const { error } = await supabase
      .from("lead_species")
      .insert(species.map((species_id) => ({ lead_id: leadId, species_id, outfitter_id: me.outfitterId })));
    if (error) return { ok: false, errors: { form: "The lead was saved, but not the species. Open it and try again." } };
  }

  revalidatePath(base(area));
  if (id) {
    revalidatePath(`${base(area)}/${id}`);
    return { ok: true, errors: {}, message: "Lead saved" };
  }
  if (form.get("again") === "1") return { ok: true, errors: {}, message: `${checked.value.full_name} added`, savedId: leadId };
  redirect(`${base(area)}/${leadId}`);
}

export async function setLeadStatus(area: string, leadId: string, status: LeadStatus, reason?: string): Promise<ActionResult> {
  if (!LEAD_STATUSES.includes(status)) return { ok: false, error: "Choose a status." };
  let lost_reason: string | null = null;
  if (status === "lost") {
    const r = checkLostReason(reason);
    if (!r.ok) return { ok: false, error: r.error };
    lost_reason = r.value;
  }
  await requireStaff();
  const supabase = await createClient();
  const { error, count } = await supabase.from("leads").update({ status, lost_reason }, { count: "exact" }).eq("id", leadId);
  if (error || !count) return { ok: false, error: error ? dbMessage(error) : "That lead was not found. Refresh the page." };
  revalidatePath(base(area));
  revalidatePath(`${base(area)}/${leadId}`);
  return { ok: true, message: "Status saved" };
}

export async function deleteLead(area: string, leadId: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error, count } = await supabase.from("leads").delete({ count: "exact" }).eq("id", leadId);
  if (error || !count) return { ok: false, error: error ? dbMessage(error) : "That lead was not found. Refresh the page." };
  revalidatePath(base(area));
  redirect(base(area));
}

/** One click: a new quote filled in from the lead, linked to it. */
export async function quoteFromLead(area: string, leadId: string): Promise<ActionResult> {
  const me = await requireStaff();
  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, full_name, email, phone, hunters, observers, status")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return { ok: false, error: "That lead was not found. Refresh the page." };
  // A planner lead brings the package the hunter picked (admins only, by RLS).
  const { data: request } = await supabase.from("planner_requests").select("plan, chosen").eq("lead_id", lead.id).maybeSingle();
  const pkg = request ? readChosenPackage(request.plan, request.chosen as number | null) : null;
  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({
      outfitter_id: me.outfitterId,
      created_by: me.userId,
      lead_id: lead.id,
      hunter_name: lead.full_name,
      hunter_email: lead.email,
      hunter_phone: lead.phone ? formatPhone(lead.phone) : null,
      hunters: pkg?.hunters ?? lead.hunters ?? 1,
      observers: pkg?.observers ?? lead.observers ?? 0,
      ...(pkg ? { hunting_days: pkg.hunting_days } : {}),
    })
    .select("id")
    .single();
  if (error || !quote) return { ok: false, error: dbMessage(error) };
  if (pkg) {
    // One line at a time: something removed from the price list since is skipped, not fatal.
    // The database prices each line from today's price list.
    for (const r of pkg.rates) {
      await supabase.from("quote_lines").insert({ quote_id: quote.id, kind: "rate", rate_id: r.rate_id, quantity: r.quantity, sort_order: 1 });
    }
    for (const t of pkg.trophies) {
      await supabase.from("quote_lines").insert({ quote_id: quote.id, kind: "trophy_fee", species_id: t.species_id, quantity: t.quantity, sort_order: 2 });
    }
  }
  if (lead.status === "new" || lead.status === "contacted") {
    await supabase.from("leads").update({ status: "quoted" }).eq("id", lead.id);
  }
  revalidatePath(base(area));
  const quotes = area === "admin" ? "/admin/quotes" : "/agent/quotes";
  revalidatePath(quotes);
  redirect(`${quotes}/${quote.id}`);
}
