"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ratesOn } from "@/lib/fx";
import { planWithClaude } from "@/lib/planner-ai";
import { LOCALE } from "@/lib/planner-copy";
import {
  budgetInBase,
  budgetText,
  checkContact,
  LANGUAGES,
  MAX_REQUEST,
  parseCatalogue,
  pricePlan,
  type ContactErrors,
  type Language,
  type PricedPlan,
} from "@/lib/planner";

// What the public planner page calls. The visitor is signed out; the
// database functions check everything again (see the planner migration).

export type PlanError = "tooShort" | "tooLong" | "busy" | "failed";
export type PlanResponse = { ok: true; id: string; plan: PricedPlan } | { ok: false; error: PlanError };

export type SendResponse = { ok: true } | { ok: false; errors: ContactErrors; error?: "expired" | "failed" };

/** A hash of the visitor's address and the outfitter, so limits work without keeping the address. */
async function visitorId(slug: string): Promise<string> {
  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256").update(`${ip}|${slug}`).digest("hex");
}

export async function planHunt(slug: string, language: string, raw: string): Promise<PlanResponse> {
  const lang = (LANGUAGES as readonly string[]).includes(language) ? (language as Language) : "en";
  const request = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (request.length < 10) return { ok: false, error: "tooShort" };
  if (request.length > MAX_REQUEST) return { ok: false, error: "tooLong" };

  const visitor = await visitorId(slug);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("planner_start", {
    p_slug: slug,
    p_visitor: visitor,
    p_language: lang,
    p_request: request,
  });
  if (error || !data) return { ok: false, error: "failed" };
  const started = data as { id?: string; error?: string; catalogue?: unknown };
  if (started.error === "busy") return { ok: false, error: "busy" };
  const catalogue = parseCatalogue(started.catalogue);
  if (!started.id || !catalogue) return { ok: false, error: "failed" };

  const ai = await planWithClaude(request, lang, catalogue);
  if (!ai.ok) return { ok: false, error: "failed" };

  const fx = ai.plan.budget_currency && ai.plan.budget_currency.toUpperCase() !== catalogue.currency
    ? await ratesOn(catalogue.currency, new Date().toISOString().slice(0, 10))
    : null;
  const plan = pricePlan(ai.plan, catalogue, lang, {
    amount: budgetInBase(ai.plan.budget_amount, ai.plan.budget_currency, catalogue.currency, fx),
    text: budgetText(ai.plan.budget_amount, ai.plan.budget_currency ?? catalogue.currency, LOCALE[lang]),
  });

  const { data: stored } = await supabase.rpc("planner_finish", { p_id: started.id, p_visitor: visitor, p_plan: plan });
  if (!stored) return { ok: false, error: "failed" };
  return { ok: true, id: started.id, plan };
}

export async function sendPackage(slug: string, id: string, pkg: number, form: FormData): Promise<SendResponse> {
  const checked = checkContact({
    name: form.get("name"),
    email: form.get("email"),
    phone: form.get("phone"),
    country: form.get("country"),
    consent: form.get("consent"),
  });
  if (!checked.ok) return { ok: false, errors: checked.errors };
  if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isInteger(pkg)) return { ok: false, errors: {}, error: "failed" };

  const supabase = await createClient();
  const c = checked.value;
  const { error } = await supabase.rpc("planner_submit", {
    p_id: id,
    p_visitor: await visitorId(slug),
    p_package: pkg,
    p_name: c.name,
    p_email: c.email ?? "",
    p_phone: c.phone ?? "",
    p_country: c.country ?? "",
    p_consent: c.consent,
  });
  if (error) return { ok: false, errors: {}, error: /expired/i.test(error.message ?? "") ? "expired" : "failed" };
  return { ok: true };
}
