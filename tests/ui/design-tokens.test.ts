import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Guard rails for the design system: colours live as tokens in globals.css
// and nowhere else, and motion always uses the Basecamp ease.

const root = join(__dirname, "..", "..");
const src = join(root, "src");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(tsx?|css)$/.test(name) ? [path] : [];
  });
}

const sources = files(src).filter((f) => !f.endsWith("globals.css"));

// Tailwind's built-in palette (bg-red-500, text-white, ...) bypasses the tokens.
const PALETTE =
  /\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|decoration|shadow|accent|caret|divide|placeholder)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})\b/;
const RAW = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/;

describe("design tokens", () => {
  it("no component or page hard-codes a colour", () => {
    const offenders: string[] = [];
    for (const file of sources) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (RAW.test(line) || PALETTE.test(line)) offenders.push(`${relative(root, file)}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(offenders).toEqual([]);
  });

  it("globals.css defines every colour token from the brief", () => {
    const css = readFileSync(join(src, "app", "globals.css"), "utf8");
    const tokens: Record<string, string> = {
      paper: "#f4f1ea",
      card: "#ffffff",
      ink: "#1e211c",
      muted: "#55594e",
      line: "#ddd7c8",
      olive: "#4a5a3a",
      "olive-dark": "#2f3b24",
      sand: "#c8b98f",
      "sand-tint": "#eae3d2",
      clay: "#b5562f",
      "clay-dark": "#8f4223",
    };
    for (const [name, hex] of Object.entries(tokens)) {
      expect(css.toLowerCase()).toContain(`--${name}: ${hex};`);
    }
    expect(css).toContain("--ease: cubic-bezier(0.32, 0.72, 0, 1)");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).not.toMatch(/gradient\(/);
  });

  it("no transition uses another curve or a duration outside 500-700ms", () => {
    const offenders: string[] = [];
    const bad = /\b(?:ease-(?:in|out|in-out|linear)|duration-(\d+))\b/g;
    for (const file of sources) {
      for (const m of readFileSync(file, "utf8").matchAll(bad)) {
        const ms = m[1] ? Number(m[1]) : null;
        if (ms === null || ms < 500 || ms > 700) offenders.push(`${relative(root, file)}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
