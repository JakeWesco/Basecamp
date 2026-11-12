import { describe, expect, it } from "vitest";
import { NAV, TOOLS } from "../../src/components/nav-items";

// Roles (CLAUDE.md): agents never change prices, the price list or settings,
// and never see Prices or Settings in the navigation.

describe("navigation per role", () => {
  it("never shows Prices or Settings to agents", () => {
    const labels = [...NAV.agent, ...TOOLS.agent].map((i) => i.label.toLowerCase());
    const hrefs = [...NAV.agent, ...TOOLS.agent].map((i) => i.href ?? "");
    expect(labels).not.toContain("prices");
    expect(labels).not.toContain("settings");
    expect(hrefs.every((h) => h === "" || h.startsWith("/agent"))).toBe(true);
  });

  it("shows admins everything", () => {
    const labels = NAV.admin.map((i) => i.label);
    expect(labels).toEqual(expect.arrayContaining(["Dashboard", "Leads", "Quotes", "Clients", "Prices", "Settings"]));
  });
});
