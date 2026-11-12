import type { CSSProperties } from "react";

// The outfitter's own brand layer. Everything a hunter sees (client area,
// quotes, brochures) uses the outfitter's colours instead of Basecamp's:
// olive becomes brand_primary and clay becomes brand_accent, so every
// component picks them up without changes. Missing or invalid values fall
// back to Basecamp's olive and clay (the tokens in globals.css).

export type Brand = {
  name: string;
  logoUrl: string | null;
  primary: string | null;
  accent: string | null;
};

const HEX = /^#[0-9a-f]{6}$/i;

/** A colour exactly as the database allows it (#RRGGBB), or null. */
export function validHex(value: unknown): string | null {
  return typeof value === "string" && HEX.test(value) ? value.toLowerCase() : null;
}

/** Only https logos, so a bad value can't run script or load over http. */
export function validLogoUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

/** WCAG relative luminance of #RRGGBB. */
export function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Luminance of the two text colours a brand fill can carry: white (card) and
// ink. Kept as numbers so no colour is written outside globals.css.
const WHITE = 1;
const INK = 0.0148;

/** Text on a filled brand colour: white or ink, whichever reads better. */
export function textOn(hex: string): "light" | "dark" {
  const l = luminance(hex);
  return contrast(l, WHITE) >= contrast(l, INK) ? "light" : "dark";
}

// Luminance of the dark theme's card, the lightest background brand text sits
// on at night. tests/ui/contrast.test.ts checks it matches globals.css.
export const NIGHT_CARD = 0.0159;

function toHex(rgb: number[]): string {
  return "#" + rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
}

/**
 * The brand colour for the dark theme: lifted towards white in small steps
 * until it reads at 4.5:1 on the dark card, so it works as text and as a fill
 * with near-black text. Colours that already read are left as they are.
 */
export function nightVersion(hex: string): string {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const candidate = toHex(rgb.map((c) => c + (255 - c) * t));
    if (contrast(luminance(candidate), NIGHT_CARD) >= 4.5) return candidate;
  }
  return toHex([255, 255, 255]);
}

function layer(hex: string | null, name: "olive" | "clay"): Record<string, string> {
  if (!hex) return {};
  const light = textOn(hex) === "light";
  const night = nightVersion(hex);
  return {
    // Light theme
    [`--brand-${name}`]: hex,
    // Hover: darker under white text, lighter under ink text, so it still reads.
    [`--brand-${name}-dark`]: `color-mix(in oklab, ${hex} 78%, var(${light ? "--ink" : "--card"}))`,
    [`--brand-on-${name}`]: light ? "var(--card)" : "var(--ink)",
    // Dark theme: the lifted colour, near-black text on fills, lighter hover.
    [`--brand-${name}-night`]: night,
    [`--brand-${name}-dark-night`]: `color-mix(in oklab, ${night} 78%, var(--ink))`,
    [`--brand-on-${name}-night`]: "var(--paper)",
  };
}

/** CSS variables for the outfitter's colours in both themes. Use with brandAttributes. */
export function brandStyle(brand: Pick<Brand, "primary" | "accent">): CSSProperties {
  return { ...layer(validHex(brand.primary), "olive"), ...layer(validHex(brand.accent), "clay") } as CSSProperties;
}

/**
 * Props for the element that wraps a hunter's page: the variables plus the
 * data attributes that make globals.css swap olive and clay for them. Unset
 * colours fall back to Basecamp's olive and clay in either theme.
 */
export function brandAttributes(brand: Pick<Brand, "primary" | "accent">) {
  return {
    style: brandStyle(brand),
    "data-brand-primary": validHex(brand.primary) ? "" : undefined,
    "data-brand-accent": validHex(brand.accent) ? "" : undefined,
  };
}
