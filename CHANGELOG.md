# Changelog

## 2026-11-12 · Phase 1: design system
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
