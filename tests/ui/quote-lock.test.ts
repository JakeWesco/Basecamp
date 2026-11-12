import { describe, expect, it } from "vitest";
import { convert, parseRates, viewCurrencies } from "../../src/lib/currency";
import { LOCK_DAYS, lockState, rateDay } from "../../src/lib/quote-lock";

describe("quote lock", () => {
  const sent = "2026-11-12T10:00:00Z";

  it("is open until the quote goes to the hunter", () => {
    expect(lockState(null)).toEqual({ state: "open" });
  });

  it("holds prices for 14 days, counting days left", () => {
    expect(LOCK_DAYS).toBe(14);
    const s = lockState(sent, new Date("2026-11-13T10:00:00Z"));
    expect(s.state).toBe("held");
    if (s.state === "held") {
      expect(s.until.toISOString()).toBe("2026-11-26T10:00:00.000Z");
      expect(s.daysLeft).toBe(13);
    }
    const lastHour = lockState(sent, new Date("2026-11-26T09:00:00Z"));
    expect(lastHour.state === "held" && lastHour.daysLeft).toBe(1);
  });

  it("expires after 14 days", () => {
    expect(lockState(sent, new Date("2026-11-26T10:00:00Z")).state).toBe("expired");
  });

  it("uses the lock day's exchange rate, or today's", () => {
    expect(rateDay(sent)).toBe("2026-11-12");
    expect(rateDay(null, new Date("2026-12-01T08:00:00Z"))).toBe("2026-12-01");
  });
});

describe("currency", () => {
  const json = { amount: 1, base: "USD", date: "2026-11-12", rates: { EUR: 0.90245, GBP: 0.7544, ZAR: 16.715 } };

  it("reads the rates service and ignores anything odd", () => {
    const r = parseRates(json, "USD");
    expect(r).toEqual({ date: "2026-11-12", base: "USD", rates: { EUR: 0.90245, GBP: 0.7544, ZAR: 16.715, USD: 1 } });
    expect(parseRates({ ...json, base: "EUR" }, "USD")).toBeNull();
    expect(parseRates({ ...json, rates: { EUR: "0.9", XX: 1, GBP: -1 } }, "USD")?.rates).toEqual({ USD: 1 });
    expect(parseRates("<html>", "USD")).toBeNull();
  });

  it("converts to whole units, and says nothing without a rate", () => {
    const r = parseRates(json, "USD");
    expect(convert(7020, "EUR", r)).toBe(6335);
    expect(convert(7020, "ZAR", r)).toBe(117339);
    expect(convert(7020, "USD", r)).toBe(7020);
    expect(convert(300, "EUR", r, true)).toBe(270.74);
    expect(convert(7020, "JPY", r)).toBeNull();
    expect(convert(7020, "EUR", null)).toBeNull();
  });

  it("lists the quote's own currency first", () => {
    expect(viewCurrencies("USD", parseRates(json, "USD"))).toEqual(["USD", "EUR", "GBP", "ZAR"]);
    expect(viewCurrencies("USD", null)).toEqual(["USD"]);
  });
});
