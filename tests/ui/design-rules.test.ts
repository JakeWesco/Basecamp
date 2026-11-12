import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Guard rails for spacing, type sizes and UI copy (see CLAUDE.md, Design system).

const root = join(__dirname, "..", "..");
const src = join(root, "src");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}
const sources = files(src);
const tsx = sources.filter((f) => f.endsWith(".tsx"));

function scan(list: string[], test: (line: string) => string | null) {
  const offenders: string[] = [];
  for (const file of list) {
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (line.trim().startsWith("//") || line.trim().startsWith("*")) return;
        const hit = test(line);
        if (hit) offenders.push(`${relative(root, file)}:${i + 1}: ${hit}`);
      });
  }
  return offenders;
}

describe("spacing and type scale", () => {
  // 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96 px in Tailwind units (4px each).
  const ALLOWED = new Set(["0", "1", "2", "3", "4", "6", "8", "10", "12", "16", "20", "24"]);
  const SPACING =
    /(?<=^|[\s"'`:])-?(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left)-(\d+(?:\.\d+)?|px|\[[^\]]+\])(?=$|[\s"'`])/g;

  it("only uses spacing from the scale", () => {
    const offenders = scan(sources, (line) => {
      const bad = [...line.matchAll(SPACING)]
        .filter((m) => !(ALLOWED.has(m[1]) || (m[1].startsWith("[") && m[1].includes("safe-area"))))
        .map((m) => m[0]);
      return bad.length ? bad.join(", ") : null;
    });
    expect(offenders).toEqual([]);
  });

  it("only uses Tailwind's default font sizes, text-xs to text-6xl", () => {
    const offenders = scan(sources, (line) => {
      const m = line.match(/(?<=^|[\s"'`:])text-(?:\[\d[^\]]*\]|7xl|8xl|9xl)/);
      return m ? m[0] : null;
    });
    expect(offenders).toEqual([]);
  });
});

describe("UI copy", () => {
  it("has no dashes, exclamation marks or banned words in visible text", () => {
    const offenders = scan(tsx, (line) => {
      if (/[–—]/.test(line)) return "en or em dash";
      if (/\b(seamless(ly)?|elevate[sd]?|unlock(s|ed)?)\b/i.test(line)) return "banned word";
      // Text between tags, e.g. >Save now!<
      for (const m of line.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)) {
        const text = m[1];
        // Code between JSX tags (a condition like `a && !b ?`), not text.
        if (/&&|\|\||=>|\?\s|\(\w+\.|!\w+\./.test(text)) continue;
        if (/!/.test(text)) return `exclamation: ${text.trim()}`;
        if (/\s-\s|\w-\w/.test(text)) return `hyphen: ${text.trim()}`;
      }
      // Sentences in string props, e.g. title="Saved!"
      const sentence = line.match(/["'`]([A-Z][^"'`]*\s[^"'`]*!)["'`]/);
      if (sentence) return `exclamation: ${sentence[1]}`;
      return null;
    });
    expect(offenders).toEqual([]);
  });
});
