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
