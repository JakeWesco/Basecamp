// The hunt planner: what the AI suggests, priced by us. The AI only picks
// rates and animals by id and writes the words; every number comes from the
// price list through the same maths as a quote. Pure functions, tested in
// tests/ui/planner.test.ts.

import { allIn, type CostEstimate } from "./costs";
import type { Unit } from "./prices";
import { defaultQuantity, quoteTotals } from "./quotes";
import type { Rates } from "./currency";
import { COUNTRIES, normalisePhone } from "./leads";

export const LANGUAGES = ["en", "de", "pl", "es", "fr"] as const;
export type Language = (typeof LANGUAGES)[number];
/** Each language in its own words, for the switch. */
export const LANGUAGE_NAME: Record<Language, string> = {
  en: "English",
  de: "Deutsch",
  pl: "Polski",
  es: "Español",
  fr: "Français",
};

export function pickLanguage(...candidates: (string | null | undefined)[]): Language {
  for (const c of candidates) {
    const code = (c ?? "").toLowerCase().slice(0, 2);
    if ((LANGUAGES as readonly string[]).includes(code)) return code as Language;
  }
  return "en";
}

/** The first supported language in an Accept-Language header. */
export function languageFromHeader(header: string | null): Language | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { code: tag.toLowerCase().slice(0, 2), q: q ? Number(q) : 1 };
    })
    .filter((x) => (LANGUAGES as readonly string[]).includes(x.code) && x.q > 0)
    .sort((a, b) => b.q - a.q);
  return ranked.length ? (ranked[0].code as Language) : null;
}

export const MAX_REQUEST = 1000;

// ---------------------------------------------------------------------------
// The price list as the planner sees it (from public.planner_start)
// ---------------------------------------------------------------------------

export type CatalogueSpecies = { id: string; name: string; notes: string | null; amount: number | null; on_request: boolean };
export type CatalogueRate = {
  id: string;
  name: string;
  unit: Unit;
  price_type: "fixed" | "cost_price" | "on_request";
  amount: number | null;
};
export type Catalogue = {
  outfitter: string;
  country_code: string;
  currency: string;
  season: string;
  species: CatalogueSpecies[];
  rates: CatalogueRate[];
  costs: CostEstimate[];
};

const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

export function parseCatalogue(raw: unknown): Catalogue | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.currency !== "string" || !Array.isArray(c.species) || !Array.isArray(c.rates)) return null;
  return {
    outfitter: String(c.outfitter ?? ""),
    country_code: String(c.country_code ?? ""),
    currency: c.currency,
    season: String(c.season ?? ""),
    species: (c.species as Record<string, unknown>[]).map((s) => ({
      id: String(s.id),
      name: String(s.name),
      notes: s.notes == null ? null : String(s.notes),
      amount: num(s.amount),
      on_request: Boolean(s.on_request),
    })),
    rates: (c.rates as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      name: String(r.name),
      unit: r.unit as Unit,
      price_type: r.price_type as CatalogueRate["price_type"],
      amount: num(r.amount),
    })),
    costs: ((c.costs as Record<string, unknown>[] | undefined) ?? []).map((x) => ({
      name: String(x.name),
      note: x.note == null ? null : String(x.note),
      basis: x.basis as CostEstimate["basis"],
      low: Number(x.low),
      high: Number(x.high),
    })),
  };
}

// ---------------------------------------------------------------------------
// What the AI returns (the shape is enforced by structured outputs)
// ---------------------------------------------------------------------------

export type AiPackage = {
  title: string;
  pitch: string;
  hunting_days: number;
  rate_ids: string[];
  /** One entry per animal: the same id twice is two animals. */
  species_ids: string[];
  itinerary: string[];
};

export type AiPlan = {
  hunters: number;
  observers: number;
  hunting_days: number;
  when: string | null;
  budget_amount: number | null;
  budget_currency: string | null;
  summary: string;
  note: string | null;
  packages: AiPackage[];
};

// ---------------------------------------------------------------------------
// The priced plan: what the hunter sees and what is stored
// ---------------------------------------------------------------------------

export type PlanLine = {
  id: string;
  name: string;
  unit: Unit;
  price_type: "fixed" | "cost_price" | "on_request";
  unit_price: number | null;
  quantity: number;
  total: number;
};

export type PricedPackage = {
  title: string;
  pitch: string;
  hunting_days: number;
  itinerary: string[];
  rates: (PlanLine & { rate_id: string })[];
  trophies: (PlanLine & { species_id: string })[];
  total: number;
  onRequest: number;
  atCost: number;
  /** Null when the hunter gave no budget. */
  fitsBudget: boolean | null;
  /** The quote plus the outfitter's other costs, when it has any switched on. */
  wholeTrip: { low: number; high: number } | null;
};

export type PricedPlan = {
  language: Language;
  currency: string;
  season: string;
  trip: { hunters: number; observers: number; hunting_days: number; when: string | null };
  /** In the outfitter's currency, when the hunter named one. */
  budget: number | null;
  /** As the hunter said it, e.g. "€15,000". */
  budgetText: string | null;
  summary: string;
  note: string | null;
  packages: PricedPackage[];
};

const clamp = (n: unknown, min: number, max: number, fallback: number) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(Math.max(v, min), max) : fallback;
};
const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");
const cents = (n: number) => Math.round(n * 100) / 100;

/** A budget in another currency, in the outfitter's. Rates are "1 base = rate units". */
export function budgetInBase(amount: number | null, from: string | null, base: string, rates: Rates | null): number | null {
  if (amount === null || !Number.isFinite(amount) || amount <= 0) return null;
  const code = (from ?? base).toUpperCase();
  if (code === base) return amount;
  const rate = rates?.rates[code];
  return rate ? Math.round(amount / rate) : null;
}

/**
 * Prices each package from the price list. Unknown ids are dropped, so a
 * confused or tricked AI can't add anything that isn't for sale. A package
 * left with nothing in it is dropped too. At most three packages.
 */
export function pricePlan(
  ai: AiPlan,
  catalogue: Catalogue,
  language: Language,
  budget: { amount: number | null; text: string | null },
): PricedPlan {
  const rates = new Map(catalogue.rates.map((r) => [r.id, r]));
  const species = new Map(catalogue.species.map((s) => [s.id, s]));
  const hunters = clamp(ai.hunters, 1, 20, 1);
  const observers = clamp(ai.observers, 0, 20, 0);
  const tripDays = clamp(ai.hunting_days, 1, 30, 7);

  const packages = (ai.packages ?? [])
    .map((p): PricedPackage | null => {
      const days = clamp(p.hunting_days, 1, 30, tripDays);
      const trip = { hunting_days: days, hunters, observers };

      const rateLines = [...new Set(p.rate_ids ?? [])]
        .map((id) => rates.get(id))
        .filter((r): r is CatalogueRate => Boolean(r))
        // No observer days without observers.
        .filter((r) => !(observers === 0 && /observer/i.test(r.name)))
        .map((r) => {
          const quantity = defaultQuantity(r.unit, trip, r.name);
          const unit_price = r.price_type === "fixed" ? r.amount : null;
          return {
            rate_id: r.id,
            id: r.id,
            name: r.name,
            unit: r.unit,
            price_type: r.price_type,
            unit_price,
            quantity,
            total: r.price_type === "fixed" ? cents((unit_price ?? 0) * quantity) : 0,
          };
        });

      const counts = new Map<string, number>();
      for (const id of (p.species_ids ?? []).slice(0, 40)) if (species.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
      const trophyLines = [...counts].map(([id, quantity]) => {
        const s = species.get(id)!;
        const price_type = s.on_request || s.amount === null ? ("on_request" as const) : ("fixed" as const);
        const unit_price = price_type === "fixed" ? s.amount : null;
        return {
          species_id: id,
          id,
          name: s.name,
          unit: "per_item" as Unit,
          price_type,
          unit_price,
          quantity,
          total: price_type === "fixed" ? cents((unit_price ?? 0) * quantity) : 0,
        };
      });

      if (!rateLines.length && !trophyLines.length) return null;
      const totals = quoteTotals(
        [...rateLines, ...trophyLines].map((l) => ({ price_type: l.price_type, unit_price: l.unit_price, quantity: l.quantity, is_free: false })),
        0,
      );
      const trophies = trophyLines.reduce((s, l) => s + l.quantity, 0);
      const whole = catalogue.costs.length ? allIn(totals.total, catalogue.costs, { ...trip, trophies }) : null;
      return {
        title: clean(p.title, 80) || "Package",
        pitch: clean(p.pitch, 400),
        hunting_days: days,
        itinerary: (p.itinerary ?? []).map((d) => clean(d, 200)).filter(Boolean).slice(0, 30),
        rates: rateLines,
        trophies: trophyLines,
        total: totals.total,
        onRequest: totals.onRequest,
        atCost: totals.atCost,
        fitsBudget: budget.amount === null ? null : totals.total <= budget.amount,
        wholeTrip: whole && whole.lines.length ? { low: whole.low, high: whole.high } : null,
      };
    })
    .filter((p): p is PricedPackage => p !== null)
    .slice(0, 3);

  return {
    language,
    currency: catalogue.currency,
    season: catalogue.season,
    trip: { hunters, observers, hunting_days: tripDays, when: clean(ai.when, 100) || null },
    budget: budget.amount,
    budgetText: budget.text,
    summary: clean(ai.summary, 600),
    note: clean(ai.note, 600) || null,
    packages,
  };
}

/** The budget as the hunter said it, for the summary line. */
export function budgetText(amount: number | null, currency: string | null, locale = "en-US"): string | null {
  if (amount === null || !Number.isFinite(amount) || amount <= 0) return null;
  const code = (currency ?? "").toUpperCase();
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: /^[A-Z]{3}$/.test(code) ? code : "USD", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return String(Math.round(amount));
  }
}

// ---------------------------------------------------------------------------
// The contact form a hunter fills in to send a package
// ---------------------------------------------------------------------------

export type ContactErrors = Partial<Record<"name" | "email" | "phone" | "form", ContactProblem>>;
export type ContactProblem = "nameMissing" | "nameLong" | "emailBad" | "phoneBad" | "phoneCountry" | "contactMissing";

export type Contact = { name: string; email: string | null; phone: string | null; country: string | null; consent: boolean };

/** Checks the form. Problems are codes, so the page can say them in the hunter's language. */
export function checkContact(input: Record<string, unknown>): { ok: true; value: Contact } | { ok: false; errors: ContactErrors } {
  const text = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");
  const errors: ContactErrors = {};
  const name = text(input.name);
  if (!name) errors.name = "nameMissing";
  else if (name.length > 120) errors.name = "nameLong";
  const countryRaw = text(input.country).toUpperCase();
  const country = COUNTRIES.some((c) => c.code === countryRaw) ? countryRaw : null;
  const email = text(input.email).toLowerCase();
  if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))) errors.email = "emailBad";
  const rawPhone = text(input.phone);
  let phone: string | null = null;
  if (rawPhone) {
    const p = normalisePhone(rawPhone, country);
    if (p === "needs-country") errors.phone = "phoneCountry";
    else if (p === null) errors.phone = "phoneBad";
    else phone = p;
  }
  if (!email && !rawPhone) errors.form = "contactMissing";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, email: email || null, phone, country, consent: input.consent === "on" || input.consent === true } };
}

// ---------------------------------------------------------------------------
// Reading a stored plan back (staff side). It was written by a signed-out
// visitor, so every field is checked and anything odd is dropped. Prices in
// it are what the hunter saw; a quote made from it is priced afresh.
// ---------------------------------------------------------------------------

export type ChosenPackage = {
  title: string;
  hunting_days: number;
  hunters: number;
  observers: number;
  currency: string;
  total: number | null;
  itinerary: string[];
  rates: { rate_id: string; name: string; quantity: number }[];
  trophies: { species_id: string; name: string; quantity: number }[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readChosenPackage(plan: unknown, chosen: number | null): ChosenPackage | null {
  if (!plan || typeof plan !== "object" || chosen === null) return null;
  const p = plan as Record<string, unknown>;
  const pkg = Array.isArray(p.packages) ? (p.packages[chosen] as Record<string, unknown> | undefined) : undefined;
  if (!pkg || typeof pkg !== "object") return null;
  const trip = (p.trip ?? {}) as Record<string, unknown>;
  const items = <K extends "rate_id" | "species_id">(list: unknown, key: K) =>
    (Array.isArray(list) ? list : [])
      .filter((l): l is Record<string, unknown> => Boolean(l) && typeof l === "object" && UUID.test(String((l as Record<string, unknown>)[key])))
      .slice(0, 40)
      .map((l) => ({ [key]: String(l[key]), name: clean(l.name, 120) || "Unnamed", quantity: clamp(l.quantity, 1, 999, 1) }) as { name: string; quantity: number } & Record<K, string>);
  const total = Number(pkg.total);
  return {
    title: clean(pkg.title, 80) || "Package",
    hunting_days: clamp(pkg.hunting_days, 1, 30, 7),
    hunters: clamp(trip.hunters, 1, 20, 1),
    observers: clamp(trip.observers, 0, 20, 0),
    currency: /^[A-Z]{3}$/.test(String(p.currency)) ? String(p.currency) : "USD",
    total: Number.isFinite(total) && total >= 0 ? total : null,
    itinerary: (Array.isArray(pkg.itinerary) ? pkg.itinerary : []).map((d) => clean(d, 200)).filter(Boolean).slice(0, 30),
    rates: items(pkg.rates, "rate_id"),
    trophies: items(pkg.trophies, "species_id"),
  };
}
