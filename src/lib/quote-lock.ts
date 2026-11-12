// How long a sent quote holds its prices, and where a quote stands.
// Pure functions, tested in tests/ui/quote-lock.test.ts.

/** Days a quote's prices are held after it goes to the hunter. */
export const LOCK_DAYS = 14;
const DAY = 24 * 60 * 60 * 1000;

export type LockState =
  | { state: "open" }
  | { state: "held"; lockedAt: Date; until: Date; daysLeft: number }
  | { state: "expired"; lockedAt: Date; until: Date };

export function lockState(lockedAt: string | null | undefined, now: Date = new Date()): LockState {
  if (!lockedAt) return { state: "open" };
  const locked = new Date(lockedAt);
  const until = new Date(locked.getTime() + LOCK_DAYS * DAY);
  if (now >= until) return { state: "expired", lockedAt: locked, until };
  return { state: "held", lockedAt: locked, until, daysLeft: Math.max(1, Math.ceil((until.getTime() - now.getTime()) / DAY)) };
}

/** "26 November 2026" */
export function longDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** The day whose exchange rate a quote uses: the lock day, or today. */
export function rateDay(lockedAt: string | null | undefined, now: Date = new Date()): string {
  return (lockedAt ? new Date(lockedAt) : now).toISOString().slice(0, 10);
}
