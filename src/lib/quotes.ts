// Quote maths and form checks. Pure functions, tested in tests/ui/quotes.test.ts.
// The database decides prices and limits; this only adds things up and checks
// what people type before it is sent.

import { parseAmount, type FieldErrors, type Unit } from "./prices";

export type LinePrice = {
  price_type: "fixed" | "cost_price" | "on_request";
  unit_price: number | null;
  quantity: number;
  is_free: boolean;
};

export type QuoteLine = LinePrice & {
  id: string;
  kind: "rate" | "trophy_fee" | "custom";
  rate_id: string | null;
  species_id: string | null;
  description: string;
  unit: Unit;
  free_given_by: string | null;
};

export type Quote = {
  id: string;
  created_by: string;
  hunter_name: string;
  hunter_email: string | null;
  hunter_phone: string | null;
  arrival_date: string | null;
  hunting_days: number;
  hunters: number;
  observers: number;
  season: string;
  currency: string;
  discount_percent: number;
  discount_given_by: string | null;
  notes: string | null;
  status: "draft" | "sent";
  updated_at: string;
  share_token: string | null;
  shared_at: string | null;
  locked_at: string | null;
};

const cents = (n: number) => Math.round(n * 100) / 100;

export function lineTotal(line: LinePrice): number {
  if (line.price_type !== "fixed" || line.is_free) return 0;
  return cents((line.unit_price ?? 0) * line.quantity);
}

export type Totals = {
  subtotal: number;
  discount: number;
  total: number;
  /** What the free lines would have cost. */
  freeValue: number;
  onRequest: number;
  atCost: number;
};

/** Subtotal of priced lines, minus the percentage discount. */
export function quoteTotals(lines: LinePrice[], discountPercent: number): Totals {
  let subtotal = 0;
  let freeValue = 0;
  let onRequest = 0;
  let atCost = 0;
  for (const l of lines) {
    if (l.price_type === "on_request") onRequest++;
    else if (l.price_type === "cost_price") atCost++;
    else if (l.is_free) freeValue += (l.unit_price ?? 0) * l.quantity;
    else subtotal += lineTotal(l);
  }
  subtotal = cents(subtotal);
  const discount = cents((subtotal * Math.min(Math.max(discountPercent, 0), 100)) / 100);
  return { subtotal, discount, total: cents(subtotal - discount), freeValue: cents(freeValue), onRequest, atCost };
}

/**
 * How many of a rate a quote needs by default: per day rates for every hunter,
 * every day; an observer rate for every observer, every day. People can change it.
 */
export function defaultQuantity(
  unit: Unit,
  quote: Pick<Quote, "hunting_days" | "hunters"> & { observers?: number },
  rateName = "",
): number {
  if (unit !== "per_day") return 1;
  const people = /observer/i.test(rateName) ? Math.max(quote.observers ?? 0, 1) : quote.hunters;
  return quote.hunting_days * people;
}

// ---------------------------------------------------------------------------
// Form checks. Errors say what happened and what to do.
// ---------------------------------------------------------------------------

export type QuoteFieldErrors = Partial<
  Record<"hunterName" | "hunterEmail" | "hunterPhone" | "arrivalDate" | "days" | "hunters" | "observers" | "discount" | "notes" | "form", string>
>;

export type QuoteDetails = {
  hunter_name: string;
  hunter_email: string | null;
  hunter_phone: string | null;
  arrival_date: string | null;
  hunting_days: number;
  hunters: number;
  observers: number;
  notes: string | null;
};

const text = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");

function wholeNumber(v: unknown, min: number, max: number): number | null {
  const s = text(v);
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= min && n <= max ? n : null;
}

export function checkQuoteDetails(input: Record<string, unknown>): { ok: true; value: QuoteDetails } | { ok: false; errors: QuoteFieldErrors } {
  const errors: QuoteFieldErrors = {};
  const name = text(input.hunterName);
  if (!name) errors.hunterName = "Enter the hunter's name.";
  else if (name.length > 120) errors.hunterName = "That name is too long. Keep it under 120 characters.";

  const email = text(input.hunterEmail);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.hunterEmail = "That email address looks incomplete.";
  if (email.length > 200) errors.hunterEmail = "That email address is too long.";

  const phone = text(input.hunterPhone);
  if (phone && !/^\+?[\d\s()]{6,25}$/.test(phone)) errors.hunterPhone = "That phone number looks wrong. Use digits, with the country code, like +49 151 2345 6789.";

  const date = text(input.arrivalDate);
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))) errors.arrivalDate = "Pick a date from the calendar.";

  const days = wholeNumber(input.days, 1, 60);
  if (days === null) errors.days = "Enter the number of hunting days, from 1 to 60.";
  const hunters = wholeNumber(input.hunters, 1, 20);
  if (hunters === null) errors.hunters = "Enter the number of hunters, from 1 to 20.";
  const observers = wholeNumber(input.observers ?? "0", 0, 20);
  if (observers === null) errors.observers = "Enter the number of observers, from 0 to 20.";

  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  if (notes.length > 2000) errors.notes = "Notes can be up to 2000 characters. Shorten them a little.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      hunter_name: name,
      hunter_email: email || null,
      hunter_phone: phone || null,
      arrival_date: date || null,
      hunting_days: days!,
      hunters: hunters!,
      observers: observers!,
      notes: notes || null,
    },
  };
}

/** A discount percentage: 0 to 100, up to two decimals. */
export function checkDiscount(raw: unknown): { ok: true; value: number } | { ok: false; error: string } {
  const s = text(raw).replace(/%$/, "");
  if (s === "") return { ok: true, value: 0 };
  const n = parseAmount(s);
  if (n === null || n > 100) return { ok: false, error: "Enter a discount from 0 to 100 percent." };
  return { ok: true, value: n };
}

/** A line quantity: more than 0, up to 10 000, up to two decimals. */
export function checkQuantity(raw: unknown): { ok: true; value: number } | { ok: false; error: string } {
  const n = parseAmount(text(raw));
  if (n === null || n <= 0 || n > 10_000) return { ok: false, error: "Enter a quantity above 0." };
  return { ok: true, value: n };
}

export type { FieldErrors };
