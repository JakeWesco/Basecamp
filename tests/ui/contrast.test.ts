import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrast, luminance } from "../../src/lib/brand-colors";

// All text must meet 4.5:1. Checks every text and background pairing the
// components use, from the values in globals.css.

const css = readFileSync(join(__dirname, "..", "..", "src", "app", "globals.css"), "utf8");
const token = (name: string) => {
  const m = css.match(new RegExp(`--${name}: (#[0-9a-f]{6});`, "i"));
  if (!m) throw new Error(`token --${name} missing`);
  return m[1];
};

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

describe("contrast", () => {
  it.each(PAIRS)("%s on %s is at least 4.5:1", (fg, bg) => {
    expect(contrast(luminance(token(fg)), luminance(token(bg)))).toBeGreaterThanOrEqual(4.5);
  });
});
