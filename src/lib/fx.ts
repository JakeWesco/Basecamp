import "server-only";
import { cacheLife } from "next/cache";
import { parseRates, VIEW_CURRENCIES, type Rates } from "./currency";

// Exchange rates from the European Central Bank, through Frankfurter
// (api.frankfurter.dev, free, no key). Only currency codes and a date are
// sent. A past day's rates never change, so they are cached for good;
// today's for a few hours. If the service is down, quotes show in their own
// currency only.

const API = "https://api.frankfurter.dev/v1";

async function fetchRates(base: string, day: string): Promise<Rates | null> {
  "use cache";
  const today = new Date().toISOString().slice(0, 10);
  if (day < today) cacheLife("max");
  else cacheLife("hours");
  const to = VIEW_CURRENCIES.filter((c) => c !== base).join(",");
  try {
    const res = await fetch(`${API}/${day}?from=${encodeURIComponent(base)}&to=${to}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return parseRates(await res.json(), base);
  } catch {
    return null;
  }
}

/** Rates for a day (YYYY-MM-DD), or today's. Null when the service can't be reached. */
export async function ratesOn(base: string, day: string): Promise<Rates | null> {
  if (!/^[A-Z]{3}$/.test(base) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const today = new Date().toISOString().slice(0, 10);
  return fetchRates(base, day > today ? today : day);
}
