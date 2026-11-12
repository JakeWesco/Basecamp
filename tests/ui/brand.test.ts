import { describe, expect, it } from "vitest";
import { brandStyle, textOn, validHex, validLogoUrl } from "../../src/lib/brand-colors";

describe("outfitter brand layer", () => {
  it("falls back to Basecamp's olive and clay when no colours are set", () => {
    expect(brandStyle({ primary: null, accent: null })).toEqual({});
  });

  it("maps brand_primary to olive and brand_accent to clay", () => {
    const style = brandStyle({ primary: "#123456", accent: "#AA3300" }) as Record<string, string>;
    expect(style["--olive"]).toBe("#123456");
    expect(style["--clay"]).toBe("#aa3300");
    expect(style["--on-olive"]).toBe("var(--card)");
    expect(style["--olive-dark"]).toContain("color-mix");
  });

  it("puts ink text on light brand colours", () => {
    expect(textOn("#f2d64b")).toBe("dark");
    expect(textOn("#1a3d2b")).toBe("light");
    const style = brandStyle({ primary: "#f2d64b", accent: null }) as Record<string, string>;
    expect(style["--on-olive"]).toBe("var(--ink)");
    expect(style["--clay"]).toBeUndefined();
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
