import { describe, expect, it } from "vitest";
import { allIn, checkCost, costQuantity, type CostEstimate } from "../../src/lib/costs";

const trip = { hunting_days: 7, hunters: 2, observers: 1, trophies: 3 };

describe("how many of each cost", () => {
  it("counts people, hunters, observers, trophies, days and trips", () => {
    expect(costQuantity("per_person", trip)).toBe(3);
    expect(costQuantity("per_hunter", trip)).toBe(2);
    expect(costQuantity("per_observer", trip)).toBe(1);
    expect(costQuantity("per_trophy", trip)).toBe(3);
    expect(costQuantity("per_hunter_day", trip)).toBe(14);
    expect(costQuantity("per_trip", trip)).toBe(1);
  });
});

describe("all-in estimate", () => {
  const costs: CostEstimate[] = [
    { name: "Flights", note: null, basis: "per_person", low: 1200, high: 2200 },
    { name: "Dip and pack", note: null, basis: "per_trophy", low: 150, high: 300 },
    { name: "Shipping", note: null, basis: "per_trip", low: 1500, high: 3500 },
    { name: "Observer visa", note: null, basis: "per_observer", low: 50, high: 50 },
  ];

  it("adds the other costs to the quote total as a range", () => {
    const a = allIn(7800, costs, trip);
    expect(a.lines.map((l) => [l.name, l.lowTotal, l.highTotal])).toEqual([
      ["Flights", 3600, 6600],
      ["Dip and pack", 450, 900],
      ["Shipping", 1500, 3500],
      ["Observer visa", 50, 50],
    ]);
    expect(a.otherLow).toBe(5600);
    expect(a.otherHigh).toBe(11050);
    expect([a.low, a.high]).toEqual([13400, 18850]);
  });

  it("leaves out costs that don't apply, like observers when there are none", () => {
    const a = allIn(1000, costs, { ...trip, observers: 0, trophies: 0 });
    expect(a.lines.map((l) => l.name)).toEqual(["Flights", "Shipping"]);
  });

  it("with no other costs, the all-in total is the quote total", () => {
    expect(allIn(7800, [], trip)).toMatchObject({ low: 7800, high: 7800, lines: [] });
  });
});

describe("settings form", () => {
  it("accepts a cost and tidies it", () => {
    expect(checkCost({ name: " Flights ", basis: "per_person", low: "1,200", high: "2200", note: "" })).toEqual({
      ok: true,
      value: { name: "Flights", note: null, basis: "per_person", low: 1200, high: 2200 },
    });
  });

  it("says what is wrong", () => {
    const r = checkCost({ name: "", basis: "weekly", low: "abc", high: "" });
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["basis", "high", "low", "name"]);
    const flipped = checkCost({ name: "X", basis: "per_trip", low: "500", high: "100" });
    expect(!flipped.ok && flipped.errors.high).toBe("The highest amount can't be below the lowest.");
  });
});
