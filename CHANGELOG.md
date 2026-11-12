# Changelog

## 2026-11-12 · Dark mode and roles (branch design-system)
- Dark theme in `globals.css`: warm near-black paper, slightly lighter cards, warm off-white text, olive and clay lifted with near-black text on fills. Every text pair passes 4.5:1 in both themes; `tests/ui/contrast.test.ts` checks both, and that the device and user-choice dark blocks match.
- Follows the device by default. A new user menu (sidebar on desktop, account button on phones and in the client area) has Light / Dark / System, remembered on the device. A script in `<head>` applies the choice before first paint, so there is no flash (checked: saved Dark on a light device paints dark first).
- Outfitter brand colours get a lifted version for dark mode so they still read; tested for dark brand colours.
- `/admin/design` has the theme switch at the top; swatches and the contrast table follow it.
- Roles written into CLAUDE.md. Navigation per role moved to `src/components/nav-items.ts`; a test checks agents never see Prices or Settings.
- Light and dark screenshots in `docs/screenshots/design-system/`. 100 tests pass.
- Next: merge PR #2, then the price list (Wesco's 2026 to 2027 price list PDF is in hand).

## 2026-11-12 · Design system (branch design-system)
- Full design system from the brief, matching the Basecamp landing page: Fraunces headings, Geist body, colour tokens plus earthy success, warning and error colours (all text 4.5:1 or better), 24px cards, fully rounded buttons, one motion curve, reduced motion respected. Tables become cards below 760px.
- Components in `src/components/ui/`: Button (primary, call to action, secondary, ghost, danger; md 44px, sm 40px), Input, Textarea, Select, Toggle, Checkbox, SegmentedControl (each with label, help text and inline error), Card, SectionHeading, Table, Badge, EmptyState, Skeleton loaders, Toast, Dialog (bottom sheet on phones), ShareToWhatsApp. Every interactive one has hover, press (0.98), focus ring, disabled, and loading where it applies. Spinners removed.
- Icons: Phosphor only, light weight, through `src/components/ui/icons.tsx`.
- New layout for admin and agent: sidebar on desktop, top bar and bottom tab bar on phones. Only Dashboard is live; the other sections show as coming soon.
- Outfitter brand layer: `src/lib/brand.tsx` reads brand_primary, brand_accent and logo_url and applies them to the client area, falling back to olive and clay. Colours must be #RRGGBB and logos https.
- `/admin/design` (admins only) replaces `/design` and shows every token and component in all its states, with live contrast ratios and a brand colour preview.
- Login, no-access, home and the three area pages restyled. Tests now also check spacing, type sizes, contrast, copy and the brand helper.
- Screenshots in `docs/screenshots/design-system/`.
- Next: review and merge this branch, then the price list.

## 2026-11-12 · Phase 1: first design system pass (built on by the entry above)
- Look matches the Basecamp landing page. Fraunces (SOFT 100, WONK 0, weight 500, never italic) for headings, Geist for body and numbers, tabular figures in tables and prices. Both load from local files through next/font, so the build needs no network.
- Colour tokens in `src/app/globals.css` (paper, card, ink, muted, line, olive, olive-dark, sand, sand-tint, clay, clay-dark, plus danger for destructive actions). Flat backgrounds. Every transition uses cubic-bezier(0.32,0.72,0,1) at 500-700ms; reduced motion turns movement off.
- Components in `src/components/ui/`: Button (cta, primary, secondary, ghost, danger; loading and disabled), Input, Select, Toggle, Card, Table (cards on phones), Badge (Enquiry to Completed), EmptyState, Toast, ShareToWhatsApp. All on show at `/design` (dev only).
- Sign-in, home, no-access and area header moved onto the new components.
- Guard-rail tests in `tests/ui/`: no hard-coded colours in components or pages, all brief tokens present, no other easing or duration.
- Next: the price list.

## 2026-11-12 · Phase 0: live Supabase project
- Supabase project `basecamp` created (London, eu-west-2; Supabase has no Africa region). Migrations and seed applied; RLS on all three tables; Wesco has 5 regions; jaco@wescosafaris.com is Wesco's admin.
- Security fix: Supabase grants EXECUTE to `anon` and `authenticated` directly, so `bootstrap_admin()` was callable through the API and any signed-up user could make themselves an admin. New migration `20261112130000_advisor_fixes.sql` revokes it, moves the policy helpers to a non-exposed `private` schema, fixes `touch_updated_at`'s search path, wraps `auth.uid()` in a subselect in policies, and splits `regions_write` into one policy per action.
- Test harness now copies Supabase's default grants (it missed the hole before). 7 new tests in `tests/db/advisor-fixes.test.ts`, all failing without the migration; 27/27 pass.
- Advisors now report only two "unused index" notes, expected on an empty database; both indexes back the policy lookups.
- Next: Phase 1, design system first, then the price list.

## 2026-11-12 · Phase 0: Foundation
- Next.js 16 (App Router, TypeScript, Tailwind) scaffolded.
- Database: `outfitters`, `memberships` (roles admin, agent, client; deactivation keeps data), `regions` (per outfitter and country, replacing the fixed South African list). Row-level security on every table; admins can't change their own role.
- Wesco Safaris seeded as outfitter #1 with its five regions. `bootstrap_admin()` attaches the first admin.
- 20 tenant-isolation tests (PGlite, in-memory Postgres), including guard rails that fail if a future table lacks RLS or `outfitter_id`. Checked that the tests catch a deliberately broken policy.
- Auth: Supabase sign-in, session refresh in `src/proxy.ts`, protected `/admin`, `/agent`, `/client` areas with role checks, `/app` routes each user to their area.
- Setup steps in `docs/SETUP.md`.
- Next: create the Supabase project and sign in (see SETUP), then Phase 1 starts with the price list.

## 2026-11-12
- Repository set up with CLAUDE.md, README, parking lot and changelog.
