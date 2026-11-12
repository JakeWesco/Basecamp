// All-in cost: the other costs a hunter pays (to airlines, taxidermists,
// shippers, staff), as estimate ranges, and the all-in total. Pure
// functions, tested in tests/ui/costs.test.ts.

export const BASES = ["per_person", "per_hunter", "per_observer", "per_trophy", "per_trip", "per_hunter_day"] as const;
export type Basis = (typeof BASES)[number];

export const BASIS_LABEL: Record<Basis, string> = {
  per_person: "per person",
  per_hunter: "per hunter",
  per_observer: "per observer",
  per_trophy: "per trophy",
  per_trip: "per trip",
  per_hunter_day: "per hunter per day",
};

export type CostEstimate = { id?: string; name: string; note: string | null; basis: Basis; low: number; high: number };

export type Trip = {
  hunting_days: number;
  hunters: number;
  observers: number;
  /** Trophies on the quote: the quantities of its trophy fee lines. */
  trophies: number;
};

/** How many of a cost this trip needs. */
export function costQuantity(basis: Basis, trip: Trip): number {
  switch (basis) {
    case "per_person":
      return trip.hunters + trip.observers;
    case "per_hunter":
      return trip.hunters;
    case "per_observer":
      return trip.observers;
    case "per_trophy":
      return trip.trophies;
    case "per_hunter_day":
      return trip.hunters * trip.hunting_days;
    case "per_trip":
      return 1;
  }
}

export type CostLine = CostEstimate & { quantity: number; lowTotal: number; highTotal: number };

export type AllIn = {
  lines: CostLine[];
  /** The other costs together. */
  otherLow: number;
  otherHigh: number;
  /** Quote total plus the other costs. */
  low: number;
  high: number;
};

/** The quote total plus every other cost this trip needs (costs that don't apply, like observers when there are none, drop out). */
export function allIn(quoteTotal: number, costs: CostEstimate[], trip: Trip): AllIn {
  const lines = costs
    .map((c) => {
      const quantity = costQuantity(c.basis, trip);
      return { ...c, quantity, lowTotal: Math.round(c.low * quantity), highTotal: Math.round(c.high * quantity) };
    })
    .filter((l) => l.quantity > 0 && l.highTotal > 0);
  const otherLow = lines.reduce((s, l) => s + l.lowTotal, 0);
  const otherHigh = lines.reduce((s, l) => s + l.highTotal, 0);
  return { lines, otherLow, otherHigh, low: Math.round(quoteTotal + otherLow), high: Math.round(quoteTotal + otherHigh) };
}

// ---------------------------------------------------------------------------
// The Settings form
// ---------------------------------------------------------------------------

export type CostFieldErrors = Partial<Record<"name" | "note" | "basis" | "low" | "high" | "form", string>>;

function amount(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const s = raw.replace(/[\s,$]/g, "");
  return /^\d+(\.\d{1,2})?$/.test(s) ? Number(s) : null;
}

export function checkCost(input: Record<string, unknown>): { ok: true; value: Omit<CostEstimate, "id"> } | { ok: false; errors: CostFieldErrors } {
  const errors: CostFieldErrors = {};
  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";
  if (!name) errors.name = "Enter a name, like Flights or Shipping trophies home.";
  else if (name.length > 120) errors.name = "That name is too long. Keep it under 120 characters.";
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length > 300) errors.note = "Keep the note under 300 characters.";
  const basis = BASES.includes(input.basis as Basis) ? (input.basis as Basis) : null;
  if (!basis) errors.basis = "Choose what the cost is per.";
  const low = amount(input.low);
  const high = amount(input.high);
  if (low === null) errors.low = "Enter the lowest likely amount, in digits.";
  if (high === null) errors.high = "Enter the highest likely amount, in digits.";
  if (low !== null && high !== null && high < low) errors.high = "The highest amount can't be below the lowest.";
  if (Object.keys(errors).length || !basis || low === null || high === null) return { ok: false, errors };
  return { ok: true, value: { name, note: note || null, basis, low, high } };
}
