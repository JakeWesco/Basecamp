import { describe, expect, it } from "vitest";
import { checkDiscount, checkQuantity, checkQuoteDetails, defaultQuantity, lineTotal, quoteTotals } from "../../src/lib/quotes";

const fixed = (unit_price: number, quantity = 1, is_free = false) =>
  ({ price_type: "fixed", unit_price, quantity, is_free }) as const;

describe("quote maths", () => {
  it("adds up priced lines and takes the discount off", () => {
    const lines = [fixed(380, 7), fixed(3600), fixed(200, 7, true), { price_type: "on_request", unit_price: null, quantity: 1, is_free: false } as const];
    const t = quoteTotals(lines, 10);
    expect(t.subtotal).toBe(380 * 7 + 3600);
    expect(t.discount).toBe(626);
    expect(t.total).toBe(6260 - 626);
    expect(t.freeValue).toBe(1400);
    expect(t.onRequest).toBe(1);
  });

  it("rounds to cents and never discounts more than everything", () => {
    expect(quoteTotals([fixed(33.33, 3)], 0).total).toBe(99.99);
    expect(quoteTotals([fixed(100)], 150).total).toBe(0);
    expect(lineTotal({ price_type: "cost_price", unit_price: null, quantity: 40, is_free: false })).toBe(0);
  });

  it("charges per day rates for every hunter, every day", () => {
    expect(defaultQuantity("per_day", { hunting_days: 7, hunters: 2 })).toBe(14);
    expect(defaultQuantity("per_trip", { hunting_days: 7, hunters: 2 })).toBe(1);
  });
});

describe("quote form", () => {
  const good = { hunterName: " Anna  Kowalska ", hunterEmail: "anna@example.pl", hunterPhone: "+48 501 234 567", days: "7", hunters: "2", observers: "1" };

  it("accepts a normal quote and tidies it", () => {
    const r = checkQuoteDetails(good);
    expect(r.ok && r.value).toMatchObject({ hunter_name: "Anna Kowalska", hunting_days: 7, hunters: 2, observers: 1, arrival_date: null });
  });

  it("says what is wrong, in plain words", () => {
    const r = checkQuoteDetails({ ...good, hunterName: "", hunterEmail: "anna@", days: "0", hunters: "two" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.hunterName).toBe("Enter the hunter's name.");
      expect(r.errors.hunterEmail).toBe("That email address looks incomplete.");
      expect(r.errors.days).toMatch(/from 1 to 60/);
      expect(r.errors.hunters).toMatch(/from 1 to 20/);
    }
  });

  it("checks discounts and quantities", () => {
    expect(checkDiscount("10%")).toEqual({ ok: true, value: 10 });
    expect(checkDiscount("")).toEqual({ ok: true, value: 0 });
    expect(checkDiscount("120").ok).toBe(false);
    expect(checkQuantity("14")).toEqual({ ok: true, value: 14 });
    expect(checkQuantity("0").ok).toBe(false);
  });
});
