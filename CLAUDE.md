# Basecamp

Basecamp (working name) is software for hunting outfitters across Africa. It covers the whole hunter journey, from the first enquiry to the trophy on the wall. Wesco Safaris is the first customer. After that it gets pitched to outfitters in South Africa, Namibia, Zimbabwe, Tanzania, Mozambique, Botswana, Zambia and beyond.

**The plan lives in the Basecamp doc:** https://claude.ai/artifact/B8Tb48eBptrFpmr31moNrE
Read it before starting a phase. If this file and the doc disagree, the doc wins. Then update this file to match.

## Stack

- Next.js (App Router, TypeScript), Tailwind
- Supabase: Postgres, Auth, Storage, Row-Level Security
- Cloudflare: hosting and DNS
- Email sending through a transactional provider (decided in Phase 1)

## Rules that never bend

1. **Multi-tenant from day one.** Every table has an `outfitter_id`, and RLS policies make sure no outfitter can ever read another outfitter's data. Every new table ships with an RLS policy and a test that proves isolation.
2. **No Wesco branding in the product.** Wesco is only outfitter #1 in the data. Branding (logo, colours) is set per outfitter.
3. **Nothing hard-coded to South Africa.** Countries, regions, currencies, languages and permit rules are per-outfitter settings or data.
4. **Basecamp takes no payments** until further notice. Outfitters handle money themselves. Basecamp shows their payment instructions and tracks what has been paid.
5. **WhatsApp first.** Every quote, brochure, invoice and trophy update is a shareable link with a "Share to WhatsApp" button. It opens a clean page on any phone, with no login needed to view it.
6. **Keep it simple.** Build fewer features and do each one properly. Outfitters coming from WhatsApp and email must be able to use it on day one.
7. **Client privacy.** Passport, medical and dietary data and internal notes are never shown to other clients, and internal notes are never shown to clients at all.

## Commands and layout

- `npm run dev`, `npm run build`, `npm run lint`, `npm test` (vitest + PGlite, no Supabase needed).
- SQL lives in `supabase/migrations/` (one file per change, never edit a shipped migration) and `supabase/seed.sql`.
- Auth: `src/proxy.ts` refreshes the session and guards `/app`, `/admin`, `/agent`, `/client`. Role checks use `requireRole()` in `src/lib/auth.ts`.
- This is Next.js 16 with Cache Components: read `node_modules/next/dist/docs/` before using an API, wrap request-time data (cookies, search params) in `<Suspense>`, and note `middleware` is now `proxy`.
- Setup for a fresh environment: `docs/SETUP.md`.

## Design system

- **Tokens** (colours, radii, motion, breakpoint) live in `src/app/globals.css`. Use them through Tailwind (`bg-olive`, `text-muted`, `rounded-card`). Never write a hex value, rgb() or a Tailwind palette class anywhere else.
- **Components** live in `src/components/ui/` (import from `@/components/ui`). Icons come only from `@/components/ui/icons` (Phosphor, light weight). Every new screen is built from these. If something is missing, add it there with all its states and show it on `/admin/design` (admins only), which shows every token and component.
- **Layout:** one standard layout for everyone. Admin and agent pages sit inside `src/components/area-shell.tsx` (sidebar on desktop, top bar and bottom tab bar on phones). Nav items per role live in `src/components/nav-items.ts`.
- **Light and dark:** both themes are defined in `globals.css` and every component and page must work in both. The default follows the device; the user menu has Light / Dark / System (`src/lib/theme.ts`, remembered in localStorage, applied before first paint). Check new screens in both on `/admin/design`.
- **Two brand layers:** Basecamp's look is for the admin and agent areas only. Anything a hunter sees (client area, quotes, brochures) is wrapped in `<BrandScope>` from `src/lib/brand.tsx`, which swaps olive and clay for the outfitter's `brand_primary` and `brand_accent`, with a lifted version of each for dark mode.
- **Rules:** clay (`variant="cta"`) only for the one most important action on a page. Spacing only 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96 px. Font sizes text-xs to text-6xl. All text at least 4.5:1 contrast. Motion only cubic-bezier(0.32,0.72,0,1) at 500 to 700ms. Skeletons, never spinners.
- **Copy:** sentence case, short sentences, no hyphens or dashes, no exclamation marks, no "seamless", "elevate" or "unlock". Errors say what happened and what to do.
- `tests/ui/` enforces the colour, spacing, type, motion, contrast (both themes) and copy rules.

## Roles

Every feature follows these. Enforce them in RLS and in the server code, not only by hiding things in the UI, and test them.

- **Admins:** everything.
- **Agents:**
  - Never change prices, the price list or settings, and never see Prices or Settings in the navigation (`tests/ui/nav.test.ts`).
  - Capture leads (at least name, email and phone number) and see only their own leads.
  - Build quotes from the outfitter's fixed price list. They can add a discount or a freebie only within the limits the outfitter sets in Settings (for example a maximum discount percentage, and a list of extras they may give free). Anything beyond those limits is blocked, with a clear message that says what the limit is.
  - Every discount or freebie an agent gives is recorded on the quote with who gave it, so the outfitter can see it.
- **Clients:** only their own records.

## How we build

- One phase at a time, one feature at a time. Finish and check it before starting the next.
- New ideas that come up mid-build go into `PARKING_LOT.md`, not into the current work.
- Keep a short entry in `CHANGELOG.md` for each session: what changed and what's next.

## Phases

0. **Foundation:** Next.js + Supabase project, outfitters table and RLS, auth with roles (admin, agent, client), Wesco seeded as outfitter #1.
1. **Wesco only:** price list setup, AI hunt planner and quote (EN/DE/PL/ES/FR), reverse budget mode, all-in cost, 14-day quote lock with live currency, personalised brochure, lead inbox, WhatsApp share links.
2. **Client portal:** client side, deposit and payment tracking, availability calendar, group mode.
3. **Killer features:** firearm permit helper (SAPS 520 first, then each country's rules), trophy tracker, photo vault, reviews and referrals, rebook prompts.
4. **Outfitters across Africa:** self-serve onboarding, per-outfitter branding, show/kiosk mode, lead scoring, AI follow-ups, email campaigns, insights.
Later: anonymised benchmarks, "what's realistic here", dream-list nudges, PH role and field data capture.

## Reference: the Wesco portal

The existing Wesco Safaris client portal (Base44 app, wescosafarisclients.com) is the **reference spec**, not the codebase. Basecamp is written fresh. Its 19 entities, roles, pages and business logic are described in the Basecamp doc under "The Wesco portal (the reference)". Logic to reproduce exactly:

- **Season price lock:** a client's pricing locks to the active season when their status reaches Deposit Paid. "Start New Season" archives the old prices.
- **Invoice maths:** subtotal, then discount (none, % or fixed), then optional VAT, gives the total. Status (Sent, Partially Paid, Paid) is recomputed from the amount paid. Drafts and their line items are never visible to clients. Numbering is {PREFIX}-{year}-{001}.
- **Taxidermy stages**, in order: Trophies collected, Welcome email sent, Instructions captured, Deposit paid, Work started, Work finished, Balance paid, Shipping (with tracking). The client is notified at each stage.
- **Offline lead capture:** each lead gets a UUID generated on the device, so leads don't duplicate when they sync. One event is active at a time.
