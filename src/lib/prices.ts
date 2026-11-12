// The price list's shapes, how prices read on screen, and the checks every
// form runs before anything reaches the database. Pure functions: used by the
// server actions and tested in tests/ui/prices.test.ts.

export const UNITS = ["per_day", "per_trip", "per_round", "per_item"] as const;
export type Unit = (typeof UNITS)[number];
export const UNIT_LABEL: Record<Unit, string> = {
  per_day: "per day",
  per_trip: "per trip",
  per_round: "per round",
  per_item: "each",
};

export const RATE_PRICE_TYPES = ["fixed", "cost_price", "on_request"] as const;
export type RatePriceType = (typeof RATE_PRICE_TYPES)[number];

export type Rate = {
  id: string;
  name: string;
  unit: Unit;
  price_type: RatePriceType;
  amount: number | null;
  sort_order: number;
};

export type SpeciesFee = {
  speciesId: string;
  name: string;
  isPublished: boolean;
  feeId: string | null;
  amount: number | null;
  onRequest: boolean;
};

/** "US$ 3,600" or "US$ 3,600.50": cents only when there are cents. */
export function formatMoney(amount: number, currency: string): string {
  const whole = Number.isInteger(amount);
  // Southern African currencies the way people there write them: R 1,250 and N$ 1,250.
  const local: Record<string, string> = { ZAR: "R", NAD: "N$", BWP: "P" };
  try {
    if (local[currency]) {
      const n = new Intl.NumberFormat("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
      return `${amount < 0 ? "-" : ""}${local[currency]}${n}`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(whole ? 0 : 2)}`;
  }
}

export function rateLabel(rate: Pick<Rate, "price_type" | "amount" | "unit">, currency: string): string {
  if (rate.price_type === "cost_price") return "At cost";
  if (rate.price_type === "on_request") return "On request";
  return `${formatMoney(rate.amount ?? 0, currency)} ${UNIT_LABEL[rate.unit]}`;
}

export function feeLabel(fee: Pick<SpeciesFee, "onRequest" | "amount" | "feeId">, currency: string): string {
  if (!fee.feeId) return "Not priced";
  if (fee.onRequest) return "On request";
  return formatMoney(fee.amount ?? 0, currency);
}

// ---------------------------------------------------------------------------
// Form checks. Errors say what happened and what to do (CLAUDE.md, Copy).
// ---------------------------------------------------------------------------

export type FieldErrors = Partial<Record<"name" | "amount" | "unit" | "priceType" | "form", string>>;
export type Checked<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

const MAX_AMOUNT = 10_000_000;

/** Reads "1,250.50", "1250", "$1 250" as 1250.5. Null when it isn't a number. */
export function parseAmount(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[\s,$]/g, "").replace(/^[A-Za-z]{1,3}/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Number(cleaned);
}

function checkName(raw: unknown, what: string): string | FieldErrors {
  const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (!name) return { name: `Enter a name for this ${what}.` };
  if (name.length > 120) return { name: "That name is too long. Keep it under 120 characters." };
  return name;
}

function checkAmount(raw: unknown): number | FieldErrors {
  if (typeof raw !== "string" || raw.trim() === "") return { amount: "Enter an amount, or choose another price type." };
  const amount = parseAmount(raw);
  if (amount === null) return { amount: "That amount doesn't look like a number. Use digits only, like 1250 or 1250.50." };
  if (amount > MAX_AMOUNT) return { amount: "That amount looks too high. Check the number of zeros." };
  return amount;
}

export type RateInput = { name: string; unit: Unit; price_type: RatePriceType; amount: number | null };

export function checkRate(input: { name?: unknown; unit?: unknown; priceType?: unknown; amount?: unknown }): Checked<RateInput> {
  const errors: FieldErrors = {};
  const name = checkName(input.name, "rate");
  if (typeof name !== "string") Object.assign(errors, name);
  const unit = UNITS.includes(input.unit as Unit) ? (input.unit as Unit) : null;
  if (!unit) errors.unit = "Choose how this rate is charged.";
  const priceType = RATE_PRICE_TYPES.includes(input.priceType as RatePriceType) ? (input.priceType as RatePriceType) : null;
  if (!priceType) errors.priceType = "Choose a price type.";
  let amount: number | null = null;
  if (priceType === "fixed") {
    const a = checkAmount(input.amount);
    if (typeof a === "number") amount = a;
    else Object.assign(errors, a);
  }
  if (Object.keys(errors).length || typeof name !== "string" || !unit || !priceType) return { ok: false, errors };
  return { ok: true, value: { name, unit, price_type: priceType, amount } };
}

export type FeeInput = { name: string; onRequest: boolean; amount: number | null; isPublished: boolean };

export function checkFee(input: { name?: unknown; priceType?: unknown; amount?: unknown; published?: unknown }): Checked<FeeInput> {
  const errors: FieldErrors = {};
  const name = checkName(input.name, "species");
  if (typeof name !== "string") Object.assign(errors, name);
  const onRequest = input.priceType === "on_request";
  if (input.priceType !== "fixed" && !onRequest) errors.priceType = "Choose a fixed fee or price on request.";
  let amount: number | null = null;
  if (input.priceType === "fixed") {
    const a = checkAmount(input.amount);
    if (typeof a === "number") amount = a;
    else Object.assign(errors, a);
  }
  if (Object.keys(errors).length || typeof name !== "string") return { ok: false, errors };
  return { ok: true, value: { name, onRequest, amount, isPublished: input.published !== "off" } };
}
