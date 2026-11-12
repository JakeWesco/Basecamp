import "server-only";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Budget, LeadStatus, Source, Temperature } from "@/lib/leads";

export type Area = "admin" | "agent";

export type Lead = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  country_code: string | null;
  source: Source | null;
  rough_dates: string | null;
  budget_band: Budget | null;
  hunters: number | null;
  observers: number | null;
  notes: string | null;
  temperature: Temperature;
  status: LeadStatus;
  lost_reason: string | null;
  marketing_consent: boolean;
  consent_at: string | null;
  created_at: string;
  mine: boolean;
  species: { id: string; name: string }[];
  quotes: { id: string; status: "draft" | "sent"; updated_at: string }[];
};

export type SpeciesOption = { id: string; name: string };

const SELECT =
  "id, created_by, full_name, email, phone, country_code, source, rough_dates, budget_band, hunters, observers, notes, temperature, status, lost_reason, marketing_consent, consent_at, created_at, lead_species(species(id, name)), quotes(id, status, updated_at)";

function toLead(row: Record<string, unknown>, userId: string | undefined): Lead {
  const interests = (row.lead_species as { species: { id: string; name: string } | null }[] | null) ?? [];
  return {
    ...(row as unknown as Lead),
    mine: row.created_by === userId,
    species: interests.map((i) => i.species).filter((s): s is { id: string; name: string } => Boolean(s)),
    quotes: ((row.quotes as Lead["quotes"]) ?? []).sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
  };
}

/** Leads this person can see (RLS: admins all of the outfitter's, agents their own), newest first. */
export async function listLeads(area: Area): Promise<Lead[]> {
  const me = await requireRole(area);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("leads")
    .select(SELECT)
    .eq("outfitter_id", me.outfitterId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => toLead(r as Record<string, unknown>, auth.user?.id));
}

export async function loadLead(area: Area, id: string): Promise<{ lead: Lead; species: SpeciesOption[]; isAdmin: boolean }> {
  const me = await requireRole(area);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const [{ data }, species] = await Promise.all([
    supabase.from("leads").select(SELECT).eq("id", id).eq("outfitter_id", me.outfitterId).maybeSingle(),
    speciesOptions(me.outfitterId),
  ]);
  if (!data) notFound();
  return { lead: toLead(data as Record<string, unknown>, auth.user?.id), species, isAdmin: me.role === "admin" };
}

/** The outfitter's species, for the "interested in" list. */
export async function speciesOptions(outfitterId: string): Promise<SpeciesOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("species").select("id, name").eq("outfitter_id", outfitterId).order("name");
  return (data ?? []).map((s) => ({ id: s.id as string, name: s.name as string }));
}

export async function newLeadContext(area: Area) {
  const me = await requireRole(area);
  return { species: await speciesOptions(me.outfitterId) };
}
