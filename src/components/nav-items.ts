// Navigation per role. Roles rules (CLAUDE.md, "Roles"): agents never see
// Prices or Settings. tests/ui/nav.test.ts checks this.
// Dashboard, Leads, Quotes, Prices and Settings are built. The rest show as "Coming soon" so the shape of the
// app is visible from day one.

export type NavIcon = "House" | "Tray" | "Receipt" | "UsersThree" | "Tag" | "Gear" | "Palette";
export type NavItem = { label: string; href?: string; icon: NavIcon };
export type StaffArea = "admin" | "agent";

export const NAV: Record<StaffArea, NavItem[]> = {
  admin: [
    { label: "Dashboard", href: "/admin", icon: "House" },
    { label: "Leads", href: "/admin/leads", icon: "Tray" },
    { label: "Quotes", href: "/admin/quotes", icon: "Receipt" },
    { label: "Clients", icon: "UsersThree" },
    { label: "Prices", href: "/admin/prices", icon: "Tag" },
    { label: "Settings", href: "/admin/settings", icon: "Gear" },
  ],
  agent: [
    { label: "Dashboard", href: "/agent", icon: "House" },
    { label: "Leads", href: "/agent/leads", icon: "Tray" },
    { label: "Quotes", href: "/agent/quotes", icon: "Receipt" },
    { label: "Clients", icon: "UsersThree" },
  ],
};

export const TOOLS: Record<StaffArea, NavItem[]> = {
  admin: [{ label: "Design system", href: "/admin/design", icon: "Palette" }],
  agent: [],
};
