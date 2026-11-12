import { describe, expect, it } from "vitest";
import {
  budgetInBase,
  budgetText,
  checkContact,
  languageFromHeader,
  LANGUAGES,
  pickLanguage,
  pricePlan,
  readChosenPackage,
  type AiPlan,
  type Catalogue,
} from "../../src/lib/planner";
import { fill, PLANNER_COPY, type PlannerCopy } from "../../src/lib/planner-copy";

// The hunt planner's maths and checks. The AI only picks ids; these prove the
// numbers come from the price list and nothing else gets in.

const ID = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const SINGLE = ID(1);
const SHARED = ID(2);
const OBSERVER = ID(3);
const RIFLE = ID(4);
const AMMO = ID(5);
const KUDU = ID(11);
const IMPALA = ID(12);
const LION = ID(13);

const catalogue: Catalogue = {
  outfitter: "Test Safaris",
  country_code: "ZA",
  currency: "USD",
  season: "2026/2027",
  rates: [
    { id: SINGLE, name: "1 client per day, 1 professional hunter", unit: "per_day", price_type: "fixed", amount: 380 },
    { id: SHARED, name: "2 clients per day, 1 professional hunter", unit: "per_day", price_type: "fixed", amount: 300 },
    { id: OBSERVER, name: "Observer", unit: "per_day", price_type: "fixed", amount: 200 },
    { id: RIFLE, name: "Rifle hire", unit: "per_day", price_type: "fixed", amount: 40 },
    { id: AMMO, name: "Ammunition", unit: "per_round", price_type: "cost_price", amount: null },
  ],
  species: [
    { id: KUDU, name: "Kudu", notes: null, amount: 3600, on_request: false },
    { id: IMPALA, name: "Impala", notes: null, amount: 850, on_request: false },
    { id: LION, name: "Lion", notes: null, amount: null, on_request: true },
  ],
  costs: [],
};

const ai = (over: Partial<AiPlan> = {}): AiPlan => ({
  hunters: 2,
  observers: 0,
  hunting_days: 7,
  when: "June",
  budget_amount: 15000,
  budget_currency: "USD",
  summary: "Two hunters for seven days in June.",
  note: null,
  packages: [
    { title: "Kudu week", pitch: "A classic.", hunting_days: 7, rate_ids: [SHARED], species_ids: [KUDU, IMPALA, IMPALA], itinerary: ["Arrive", "Hunt"] },
  ],
  ...over,
});

describe("pricing a plan", () => {
  it("prices from the list: shared rate × days × hunters, plus each animal", () => {
    const plan = pricePlan(ai(), catalogue, "en", { amount: 15000, text: "$15,000" });
    const [p] = plan.packages;
    expect(p.rates).toMatchObject([{ rate_id: SHARED, quantity: 14, unit_price: 300, total: 4200 }]);
    expect(p.trophies).toMatchObject([
      { species_id: KUDU, quantity: 1, total: 3600 },
      { species_id: IMPALA, quantity: 2, total: 1700 },
    ]);
    expect(p.total).toBe(9500);
    expect(p.fitsBudget).toBe(true);
    expect(plan.trip).toEqual({ hunters: 2, observers: 0, hunting_days: 7, when: "June" });
  });

  it("says when a package is over budget", () => {
    const plan = pricePlan(ai(), catalogue, "en", { amount: 9000, text: "$9,000" });
    expect(plan.packages[0].fitsBudget).toBe(false);
  });

  it("drops ids that aren't on the price list, and empty packages", () => {
    const plan = pricePlan(
      ai({
        packages: [
          { title: "Tricked", pitch: "", hunting_days: 7, rate_ids: ["made-up", SHARED], species_ids: ["elephant-free", KUDU], itinerary: [] },
          { title: "Nothing real", pitch: "", hunting_days: 7, rate_ids: ["x"], species_ids: ["y"], itinerary: [] },
        ],
      }),
      catalogue,
      "en",
      { amount: null, text: null },
    );
    expect(plan.packages).toHaveLength(1);
    expect(plan.packages[0].rates.map((r) => r.rate_id)).toEqual([SHARED]);
    expect(plan.packages[0].trophies.map((t) => t.species_id)).toEqual([KUDU]);
    expect(plan.packages[0].fitsBudget).toBeNull();
  });

  it("leaves out observer days when there are no observers, and charges them when there are", () => {
    const pkg = { title: "x", pitch: "", hunting_days: 5, rate_ids: [SINGLE, OBSERVER], species_ids: [], itinerary: [] };
    const none = pricePlan(ai({ hunters: 1, observers: 0, packages: [pkg] }), catalogue, "en", { amount: null, text: null });
    expect(none.packages[0].rates.map((r) => r.rate_id)).toEqual([SINGLE]);
    const two = pricePlan(ai({ hunters: 1, observers: 2, packages: [pkg] }), catalogue, "en", { amount: null, text: null });
    expect(two.packages[0].rates).toMatchObject([
      { rate_id: SINGLE, quantity: 5, total: 1900 },
      { rate_id: OBSERVER, quantity: 10, total: 2000 },
    ]);
  });

  it("keeps on request and at cost items out of the total", () => {
    const plan = pricePlan(
      ai({ packages: [{ title: "x", pitch: "", hunting_days: 7, rate_ids: [SHARED, AMMO], species_ids: [LION], itinerary: [] }] }),
      catalogue,
      "en",
      { amount: null, text: null },
    );
    const [p] = plan.packages;
    expect(p.total).toBe(4200);
    expect(p.onRequest).toBe(1);
    expect(p.atCost).toBe(1);
  });

  it("keeps silly numbers in range and stops at three packages", () => {
    const pkg = { title: "x", pitch: "", hunting_days: 400, rate_ids: [SINGLE], species_ids: [], itinerary: [] };
    const plan = pricePlan(ai({ hunters: 0, observers: -3, hunting_days: 0, packages: [pkg, pkg, pkg, pkg] }), catalogue, "en", {
      amount: null,
      text: null,
    });
    expect(plan.trip).toMatchObject({ hunters: 1, observers: 0, hunting_days: 1 });
    expect(plan.packages).toHaveLength(3);
    expect(plan.packages[0].hunting_days).toBe(30);
  });

  it("adds the whole trip estimate when the outfitter has other costs on", () => {
    const withCosts = { ...catalogue, costs: [{ name: "Flights", note: null, basis: "per_person" as const, low: 1000, high: 2000 }] };
    const plan = pricePlan(ai(), withCosts, "en", { amount: null, text: null });
    expect(plan.packages[0].wholeTrip).toEqual({ low: 11500, high: 13500 });
  });
});

describe("budgets in another currency", () => {
  const rates = { date: "2026-11-12", base: "USD", rates: { USD: 1, EUR: 0.9, ZAR: 18 } };
  it("converts to the outfitter's currency", () => {
    expect(budgetInBase(9000, "EUR", "USD", rates)).toBe(10000);
    expect(budgetInBase(15000, "usd", "USD", null)).toBe(15000);
    expect(budgetInBase(15000, null, "USD", null)).toBe(15000);
  });
  it("gives up rather than guess", () => {
    expect(budgetInBase(9000, "EUR", "USD", null)).toBeNull();
    expect(budgetInBase(9000, "XYZ", "USD", rates)).toBeNull();
    expect(budgetInBase(0, "USD", "USD", rates)).toBeNull();
    expect(budgetInBase(null, "USD", "USD", rates)).toBeNull();
  });
});

describe("the budget as the hunter said it", () => {
  it("is written the way people write money in their language", () => {
    expect(budgetText(15000, "USD")).toBe("$15,000");
    // German puts a non breaking space before the euro sign.
    expect(budgetText(10000, "EUR", "de-DE")).toBe("10.000 €");
    expect(budgetText(null, "USD")).toBeNull();
  });
});

describe("language", () => {
  it("takes the link's choice, then the browser's, then the outfitter's, then English", () => {
    expect(pickLanguage("de", "fr", "en")).toBe("de");
    expect(pickLanguage("xx", languageFromHeader("pl-PL,pl;q=0.9,en;q=0.8"), "en")).toBe("pl");
    expect(pickLanguage(null, languageFromHeader("ja,zh;q=0.8"), "es")).toBe("es");
    expect(pickLanguage(null, null, null)).toBe("en");
  });
  it("respects the order of preference in the header", () => {
    expect(languageFromHeader("en;q=0.5,fr;q=0.9")).toBe("fr");
    expect(languageFromHeader("de;q=0,es")).toBe("es");
  });
});

describe("the contact form", () => {
  it("needs a name and an email or a phone", () => {
    expect(checkContact({ name: "", email: "", phone: "" })).toEqual({
      ok: false,
      errors: { name: "nameMissing", form: "contactMissing" },
    });
  });
  it("puts a local phone number in international format using the country", () => {
    const r = checkContact({ name: "Anna", phone: "501 234 567", country: "PL", consent: "on" });
    expect(r).toEqual({ ok: true, value: { name: "Anna", email: null, phone: "+48501234567", country: "PL", consent: true } });
  });
  it("asks for the country when a local number has none", () => {
    expect(checkContact({ name: "Anna", phone: "0501 234 567" })).toMatchObject({ ok: false, errors: { phone: "phoneCountry" } });
  });
  it("rejects a broken email", () => {
    expect(checkContact({ name: "Anna", email: "anna@" })).toMatchObject({ ok: false, errors: { email: "emailBad" } });
  });
});

describe("reading a stored plan back", () => {
  const stored = pricePlan(ai(), catalogue, "en", { amount: 15000, text: "$15,000" });
  it("gives staff the chosen package", () => {
    expect(readChosenPackage(stored, 0)).toMatchObject({
      title: "Kudu week",
      hunting_days: 7,
      hunters: 2,
      observers: 0,
      total: 9500,
      rates: [{ rate_id: SHARED, quantity: 14 }],
      trophies: [
        { species_id: KUDU, quantity: 1 },
        { species_id: IMPALA, quantity: 2 },
      ],
    });
  });
  it("drops anything odd a visitor could have written", () => {
    const forged = {
      trip: { hunters: 9999 },
      currency: "<b>",
      packages: [{ title: 42, rates: [{ rate_id: "drop table", quantity: 5 }, { rate_id: SHARED, quantity: -4 }], trophies: "nope" }],
    };
    expect(readChosenPackage(forged, 0)).toMatchObject({
      title: "Package",
      hunters: 20,
      currency: "USD",
      total: null,
      rates: [{ rate_id: SHARED, quantity: 1 }],
      trophies: [],
    });
    expect(readChosenPackage(forged, 3)).toBeNull();
    expect(readChosenPackage(null, 0)).toBeNull();
  });
});

describe("planner copy", () => {
  const keys = (c: PlannerCopy) => Object.keys(c).sort();
  const strings = (value: unknown): string[] =>
    typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];

  it("every language has every line, with the same {words} to fill in", () => {
    const en = PLANNER_COPY.en;
    for (const lang of LANGUAGES) {
      const c = PLANNER_COPY[lang];
      expect(keys(c), lang).toEqual(keys(en));
      for (const k of Object.keys(en) as (keyof PlannerCopy)[]) {
        const slots = (v: unknown) => strings(v).flatMap((s) => s.match(/\{\w+\}/g) ?? []).sort();
        expect(slots(c[k]), `${lang}.${k}`).toEqual(slots(en[k]));
      }
    }
  });

  it("follows the copy rules in every language: no dashes, hyphens, exclamation marks or banned words", () => {
    const offenders = LANGUAGES.flatMap((lang) =>
      strings(PLANNER_COPY[lang])
        .filter((s) => /[–—!]|\w-\w|\s-\s|\b(seamless|elevate|unlock)/i.test(s))
        .map((s) => `${lang}: ${s}`),
    );
    expect(offenders).toEqual([]);
  });

  it("fills in words and leaves unknown ones", () => {
    expect(fill("Plan your hunt with {name} {x}", { name: "Wesco" })).toBe("Plan your hunt with Wesco {x}");
  });
});
