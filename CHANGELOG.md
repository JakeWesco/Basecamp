# Changelog

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
