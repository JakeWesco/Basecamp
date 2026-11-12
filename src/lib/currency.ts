// Showing a quote in another currency. Pure functions, tested in
// tests/ui/quote-lock.test.ts. Rates come from src/lib/fx.ts.

/** Currencies a hunter can view a quote in, besides the outfitter's own. */
export const VIEW_CURRENCIES = ["USD", "EUR", "GBP", "ZAR"] as const;

export type Rates = {
  /** The day the rates are from (YYYY-MM-DD). */
  date: string;
  base: string;
  /** 1 unit of base = rate units of the currency. */
  rates: Record<string, number>;
};

/** Reads the rates service's answer; null if it isn't what we expect. */
export function parseRates(json: unknown, base: string): Rates | null {
  if (!json || typeof json !== "object") return null;
  const j = json as { base?: unknown; date?: unknown; rates?: unknown };
  if (j.base !== base || typeof j.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(j.date) || !j.rates || typeof j.rates !== "object") return null;
  const rates: Record<string, number> = {};
  for (const [code, value] of Object.entries(j.rates as Record<string, unknown>)) {
    if (/^[A-Z]{3}$/.test(code) && typeof value === "number" && Number.isFinite(value) && value > 0) rates[code] = value;
  }
  return { date: j.date, base, rates: { ...rates, [base]: 1 } };
}

/**
 * An amount in another currency, rounded to whole units: it is a guide for
 * the hunter, not what they pay. Null if there's no rate.
 */
export function convert(amount: number, to: string, rates: Rates | null, cents = false): number | null {
  if (!rates) return null;
  const rate = rates.rates[to];
  if (!rate) return null;
  // Unit prices keep cents, so "14 × €270.74" adds up to the line total.
  return cents ? Math.round(amount * rate * 100) / 100 : Math.round(amount * rate);
}

/** The currencies this quote can be shown in: its own first, then the others there are rates for. */
export function viewCurrencies(base: string, rates: Rates | null): string[] {
  const others = VIEW_CURRENCIES.filter((c) => c !== base && rates?.rates[c]);
  return [base, ...others];
}
