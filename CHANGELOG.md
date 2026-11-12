# Changelog

## 2026-11-12 · Phase 1: quote share links (branch share-link)
- Every quote can have a private link (`/q/<64 random characters>`) a hunter opens on any phone without logging in, in the outfitter's own logo and colours, light or dark. Shows the trip, daily rates and extras, trophy fees, free extras, discount, total, items on request and the outfitter's note, with "Ask a question" and "Message on WhatsApp" buttons to the outfitter's number. Search engines are told not to index it.
- In the quote builder: "Create share link", then Share to WhatsApp (message filled in), Copy link, Open, and Turn off link. Turning a link off stops it working at once; turning it on again makes a new link.
- Database: `quotes.share_token` and `shared_at` (migration `20261112190000_quote_share_links.sql`, applied live). Nobody chooses a token: the database replaces anything sent with a fresh random one. Hunters read through `public.shared_quote(token)`, the only public function anyone can call; it returns nothing private (no email, phone, ids, or who gave a discount). Supabase's advisor warns about that function, as expected.
- Wrong or turned off links show "This quote link doesn't work" with what to do.
- Observer rates now start at days times observers. Trophy fees no longer repeat their price on the hunter page.
- Tests: 8 for share links (fresh tokens, agents only on their own quotes, what visitors see, wrong and turned off links). Checked that letting a chosen token through fails the tests. 154 tests pass. Checked end to end with a test quote (deleted afterwards).
- Next: the personalised brochure (lodge, animals, day by day plan) builds on this page, once there are photos and text to show.

## 2026-11-12 · Phase 1: quote builder (branch quotes)
- New tables `quotes` and `quote_lines`, plus agent limits: `outfitters.agent_max_discount_percent` and `rates.agent_can_give_free`. Applied to the live database; advisors report nothing new.
- Rules in the database (triggers and RLS), per CLAUDE.md Roles: admins see every quote, agents only their own, clients none. Rate and trophy fee prices always come from the price list for the quote's season; agents can change quantities, never prices; only admins can add a line that isn't on the price list. Agents are blocked above the discount limit ("The highest discount you can give is 10%. Ask an admin for more.") and from making anything free that isn't allowed. Every discount and freebie records who gave it, and that can't be faked.
- `/admin/settings`: highest agent discount and which extras agents may give free (starts at 0% and nothing).
- `/admin/quotes` and `/agent/quotes`: list, new quote, and the builder (daily rates and extras, trophy fees, quantities, free extras, discount, total, on request items noted, mark as sent, delete). Quotes and Settings are live in the menus; agents still never see Prices or Settings.
- Forms now keep what was typed when there is an error (quote, price, settings and sign in forms), and show Basecamp's own messages instead of the browser's.
- Tests: 15 for quotes in the database (who sees what, prices from the list, limits, who gave it), quote maths and form checks. Checked that removing the limits fails the tests. 146 tests pass.
- Checked end to end as an admin: a test quote (2 hunters, 7 days, free observer, kudu, lion on request, 10% off) totalled $7,020 as expected; it was deleted afterwards.
- Next: the share link and brochure, so a quote can go to the hunter on WhatsApp. Showing team members' names (instead of "a team member") comes with the Team page.

## 2026-11-12 · Phase 1: price list (branch price-list)
- New tables `species`, `trophy_fees` (one per species per season, or price on request) and `rates` (daily rates and extras: fixed, at cost or on request). Prices are tagged with the season, so quotes can lock to it later. Every member reads them; only admins change them (RLS and server checks). A fee can't point at another outfitter's species.
- Wesco's 2026/2027 price list from the PDF loaded: 46 species (5 on request) and 6 daily rates. Data file `supabase/data/wesco-2026-2027-prices.sql`, safe to run again. Applied to the live database.
- `/admin/prices`: trophy fees and daily rates in two tabs, species search, add, edit and remove in a dialog, clear error messages, light and dark. Prices is live in the admin menu; agents still never see it.
- Tests: 15 for the price list (who can read, who can change, cross-outfitter, data counts and amounts), price form checks, and a new guard that every foreign key has an index. Checked that breaking a policy fails the tests.
- Advisor finding fixed in a new migration (index for the trophy fee to species key). Only remaining warning: leaked password protection is off in Supabase Auth.
- Dev fix: auth checks are marked request-time, which removes the "Date.now() while prerendering" warning.
- Next: the quote builder (agents quote from this list within the outfitter's discount limits).

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
