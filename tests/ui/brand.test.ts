import { describe, expect, it } from "vitest";
import {
  brandAttributes,
  brandStyle,
  contrast,
  luminance,
  nightVersion,
  NIGHT_CARD,
  textOn,
  validHex,
  validLogoUrl,
} from "../../src/lib/brand-colors";

describe("outfitter brand layer", () => {
  it("falls back to Basecamp's olive and clay when no colours are set", () => {
    expect(brandStyle({ primary: null, accent: null })).toEqual({});
    const attrs = brandAttributes({ primary: null, accent: null });
    expect(attrs["data-brand-primary"]).toBeUndefined();
    expect(attrs["data-brand-accent"]).toBeUndefined();
  });

  it("maps brand_primary to olive and brand_accent to clay", () => {
    const attrs = brandAttributes({ primary: "#123456", accent: "#AA3300" });
    const style = attrs.style as Record<string, string>;
    expect(attrs["data-brand-primary"]).toBe("");
    expect(attrs["data-brand-accent"]).toBe("");
    expect(style["--brand-olive"]).toBe("#123456");
    expect(style["--brand-clay"]).toBe("#aa3300");
    expect(style["--brand-on-olive"]).toBe("var(--card)");
    expect(style["--brand-olive-dark"]).toContain("color-mix");
  });

  it("puts ink text on light brand colours", () => {
    expect(textOn("#f2d64b")).toBe("dark");
    expect(textOn("#1a3d2b")).toBe("light");
    const style = brandStyle({ primary: "#f2d64b", accent: null }) as Record<string, string>;
    expect(style["--brand-on-olive"]).toBe("var(--ink)");
    expect(style["--brand-clay"]).toBeUndefined();
  });

  it("lifts dark brand colours so they read on the dark theme", () => {
    for (const hex of ["#123456", "#1a3d2b", "#000000", "#8b0000", "#4a5a3a", "#f2d64b"]) {
      const night = nightVersion(hex);
      expect(contrast(luminance(night), NIGHT_CARD)).toBeGreaterThanOrEqual(4.5);
    }
    // Colours that already read on dark stay as they are.
    expect(nightVersion("#f2d64b")).toBe("#f2d64b");
    const style = brandStyle({ primary: "#123456", accent: null }) as Record<string, string>;
    expect(style["--brand-olive-night"]).toBe(nightVersion("#123456"));
    expect(style["--brand-on-olive-night"]).toBe("var(--paper)");
  });

  it("ignores anything that is not #RRGGBB, so no CSS can be injected", () => {
    for (const bad of ["red", "#fff", "#12345g", "#123456;}body{display:none", "var(--x)", 42, null]) {
      expect(validHex(bad)).toBeNull();
    }
    expect(brandStyle({ primary: "#123456;}x{", accent: "blue" })).toEqual({});
  });

  it("only accepts https logo links", () => {
    expect(validLogoUrl("https://cdn.example.com/logo.png")).toBe("https://cdn.example.com/logo.png");
    expect(validLogoUrl("http://example.com/logo.png")).toBeNull();
    expect(validLogoUrl("javascript:alert(1)")).toBeNull();
    expect(validLogoUrl("not a url")).toBeNull();
  });
});
