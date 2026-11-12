import { describe, expect, it } from "vitest";
import { checkFee, checkRate, feeLabel, formatMoney, parseAmount, rateLabel } from "../../src/lib/prices";

describe("money", () => {
  it("shows cents only when there are cents", () => {
    expect(formatMoney(3600, "USD")).toBe("$3,600");
    expect(formatMoney(3600.5, "USD")).toBe("$3,600.50");
    expect(formatMoney(1250, "ZAR")).toContain("1,250");
  });

  it("reads amounts the way people type them", () => {
    expect(parseAmount("1,250.50")).toBe(1250.5);
    expect(parseAmount("$1 250")).toBe(1250);
    expect(parseAmount("USD 380")).toBe(380);
    expect(parseAmount("12.345")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });

  it("labels rates and fees", () => {
    expect(rateLabel({ price_type: "fixed", amount: 380, unit: "per_day" }, "USD")).toBe("$380 per day");
    expect(rateLabel({ price_type: "cost_price", amount: null, unit: "per_round" }, "USD")).toBe("At cost");
    expect(feeLabel({ feeId: "x", onRequest: true, amount: null }, "USD")).toBe("On request");
    expect(feeLabel({ feeId: null, onRequest: false, amount: null }, "USD")).toBe("Not priced");
  });
});

describe("rate form", () => {
  it("accepts a fixed rate and tidies the name", () => {
    const r = checkRate({ name: "  Observer   per day ", unit: "per_day", priceType: "fixed", amount: "200" });
    expect(r).toEqual({ ok: true, value: { name: "Observer per day", unit: "per_day", price_type: "fixed", amount: 200 } });
  });

  it("drops the amount for cost price", () => {
    const r = checkRate({ name: "Ammunition", unit: "per_round", priceType: "cost_price", amount: "99" });
    expect(r.ok && r.value.amount).toBeNull();
  });

  it("explains what is missing", () => {
    const r = checkRate({ name: "", unit: "weekly", priceType: "fixed", amount: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.name).toMatch(/Enter a name/);
      expect(r.errors.unit).toBeDefined();
      expect(r.errors.amount).toMatch(/Enter an amount/);
    }
  });

  it("rejects amounts that aren't numbers or are far too high", () => {
    const bad = checkRate({ name: "x", unit: "per_day", priceType: "fixed", amount: "three hundred" });
    expect(!bad.ok && bad.errors.amount).toMatch(/doesn't look like a number/);
    const high = checkRate({ name: "x", unit: "per_day", priceType: "fixed", amount: "380000000" });
    expect(!high.ok && high.errors.amount).toMatch(/too high/);
  });
});

describe("trophy fee form", () => {
  it("accepts a fee or price on request", () => {
    expect(checkFee({ name: "Kudu", priceType: "fixed", amount: "3,600" })).toEqual({
      ok: true,
      value: { name: "Kudu", onRequest: false, amount: 3600, isPublished: true },
    });
    const por = checkFee({ name: "Lion", priceType: "on_request", amount: "5", published: "off" });
    expect(por).toEqual({ ok: true, value: { name: "Lion", onRequest: true, amount: null, isPublished: false } });
  });

  it("needs a name and an amount for a fixed fee", () => {
    const r = checkFee({ name: " ", priceType: "fixed", amount: "" });
    expect(!r.ok && r.errors).toMatchObject({ name: expect.any(String), amount: expect.any(String) });
  });
});
