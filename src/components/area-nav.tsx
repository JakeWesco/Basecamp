"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { cx, motion, press } from "@/components/ui";
import { Gear, House, Palette, Receipt, Tag, Tray, UsersThree, type IconProps } from "@/components/ui/icons";
import { NAV, TOOLS as TOOL_ITEMS, type NavIcon, type NavItem } from "./nav-items";

type Item = { label: string; href?: string; icon: ComponentType<IconProps> };

const ICONS: Record<NavIcon, ComponentType<IconProps>> = { House, Tray, Receipt, UsersThree, Tag, Gear, Palette };
const withIcons = (items: NavItem[]): Item[] => items.map((i) => ({ ...i, icon: ICONS[i.icon] }));

const ITEMS = { admin: withIcons(NAV.admin), agent: withIcons(NAV.agent) };
const TOOLS = { admin: withIcons(TOOL_ITEMS.admin), agent: withIcons(TOOL_ITEMS.agent) };

/** The area home matches only itself; sections also match their sub pages (a quote under Quotes). */
function isCurrent(pathname: string, href: string) {
  if (pathname === href) return true;
  const isAreaHome = href.split("/").length === 2;
  return !isAreaHome && pathname.startsWith(href + "/");
}

/** Desktop sidebar list. */
export function SidebarNav({ area }: { area: "admin" | "agent" }) {
  const pathname = usePathname();
  const row = "flex min-h-11 items-center gap-3 rounded-full px-4 py-2 text-base";
  const render = (item: Item) => {
    const Icon = item.icon;
    if (!item.href)
      return (
        <li key={item.label}>
          <span aria-disabled="true" className={cx(row, "cursor-not-allowed text-muted")}>
            <Icon className="size-5" />
            <span className="flex flex-col">
              {item.label}
              <span className="text-xs">Coming soon</span>
            </span>
          </span>
        </li>
      );
    const current = isCurrent(pathname, item.href);
    return (
      <li key={item.label}>
        <Link
          href={item.href}
          aria-current={current ? "page" : undefined}
          className={cx(
            row,
            "font-medium",
            current ? "bg-olive text-on-olive" : "text-ink is-hover:bg-sand-tint",
            motion,
            press,
          )}
        >
          <Icon className="size-5" />
          {item.label}
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label="Main" className="flex flex-col gap-6">
      <ul className="flex flex-col gap-1">{ITEMS[area].map(render)}</ul>
      {TOOLS[area].length > 0 && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="px-4 text-xs font-semibold tracking-wider text-muted uppercase">Tools</p>
          <ul className="flex flex-col gap-1">{TOOLS[area].map(render)}</ul>
        </div>
      )}
    </nav>
  );
}

/** Phone bottom tab bar. Every tab is at least 44px tall and wide. */
export function TabBar({ area }: { area: "admin" | "agent" }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex">
        {ITEMS[area].map((item) => {
          const Icon = item.icon;
          const cell = "flex min-h-16 min-w-11 flex-col items-center justify-center gap-1 px-1 py-2 text-xs";
          if (!item.href)
            return (
              <li key={item.label} className="flex-1">
                <span aria-disabled="true" className={cx(cell, "text-muted opacity-60")}>
                  <Icon className="size-6" />
                  {item.label}
                  <span className="sr-only">, coming soon</span>
                </span>
              </li>
            );
          const current = isCurrent(pathname, item.href);
          return (
            <li key={item.label} className="flex-1">
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cx(cell, "font-semibold", current ? "text-olive" : "text-ink", motion, press)}
              >
                <span className={cx("flex h-8 w-14 items-center justify-center rounded-full", current && "bg-sand-tint", motion)}>
                  <Icon className="size-6" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
