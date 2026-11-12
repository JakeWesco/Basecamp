import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrast, luminance, NIGHT_CARD } from "../../src/lib/brand-colors";

// All text must meet 4.5:1, in the light and the dark theme. Checks every
// text and background pairing the components use, from globals.css.

const css = readFileSync(join(__dirname, "..", "..", "src", "app", "globals.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector + " {");
  if (start < 0) throw new Error(`${selector} block missing`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--([a-z-]+): (#[0-9a-f]{6});/gi)].map((m) => [m[1], m[2].toLowerCase()]));
}

const light = block(":root");
const dark = block(':root[data-theme="dark"]');
const darkBySystem = block(':root:not([data-theme="light"])');

const PAIRS: [string, string][] = [
  ["ink", "paper"],
  ["ink", "card"],
  ["ink", "sand"],
  ["ink", "sand-tint"],
  ["muted", "paper"],
  ["muted", "card"],
  ["muted", "sand-tint"],
  ["olive", "paper"],
  ["olive", "card"],
  ["olive", "sand-tint"],
  ["olive-dark", "sand-tint"],
  ["on-olive", "olive"],
  ["on-olive", "olive-dark"],
  ["on-clay", "clay"],
  ["on-clay", "clay-dark"],
  ["on-error", "error"],
  ["on-error", "error-dark"],
  ["on-ink", "ink"],
  ["clay", "card"],
  ["success", "card"],
  ["success", "paper"],
  ["success", "success-tint"],
  ["warning", "card"],
  ["warning", "paper"],
  ["warning", "warning-tint"],
  ["error", "card"],
  ["error", "paper"],
  ["error", "error-tint"],
];

const ratio = (theme: Record<string, string>, fg: string, bg: string) => {
  if (!theme[fg] || !theme[bg]) throw new Error(`token --${fg} or --${bg} missing`);
  return contrast(luminance(theme[fg]), luminance(theme[bg]));
};

describe("contrast, light theme", () => {
  it.each(PAIRS)("%s on %s is at least 4.5:1", (fg, bg) => {
    expect(ratio(light, fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("contrast, dark theme", () => {
  it.each(PAIRS)("%s on %s is at least 4.5:1", (fg, bg) => {
    expect(ratio(dark, fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("defines every light token in dark too", () => {
    const missing = Object.keys(light).filter((k) => !(k in dark));
    expect(missing).toEqual([]);
  });

  it("uses the same values when dark comes from the device setting", () => {
    expect(darkBySystem).toEqual(dark);
  });

  it("brand helper knows the dark card's luminance", () => {
    expect(luminance(dark.card)).toBeCloseTo(NIGHT_CARD, 3);
  });
});
