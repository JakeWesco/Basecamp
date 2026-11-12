# Setting up Basecamp

## 1. Create the Supabase project

1. Go to supabase.com, create a free project (region: closest to most users, e.g. a European region for US/EU hunters and African outfitters).
2. In **SQL Editor**, run every file in `supabase/migrations/` in name order, then the seed:
   - `supabase/migrations/20261112000000_foundation.sql`
   - `supabase/migrations/20261112130000_advisor_fixes.sql`
   - `supabase/migrations/20261112160000_price_list.sql`
   - `supabase/migrations/20261112170000_price_list_fk_index.sql`
   - `supabase/migrations/20261112180000_quotes.sql`
   - `supabase/seed.sql` (creates Wesco Safaris as outfitter #1)
   - `supabase/data/wesco-2026-2027-prices.sql` (Wesco's 2026/2027 price list; safe to run again)

   With the Supabase CLI logged in, the same thing is
   `supabase db query --linked --project-ref <ref> -f <file>` for each file.
   Afterwards run `supabase db advisors --linked --project-ref <ref>`: it should report no warnings.
3. In **Authentication → Users**, click **Add user** and create your own login (email + password, tick "auto confirm").
4. Back in **SQL Editor**, make yourself Wesco's first admin:

   ```sql
   select public.bootstrap_admin('wesco-safaris', 'jaco@wescosafaris.com');
   ```

## 2. Run the app locally

```bash
cp .env.example .env.local   # then paste the URL and publishable key from Project Settings → API
npm install
npm run dev
```

Open http://localhost:3000, sign in, and you land on the admin area.

## 3. Checks

```bash
npm test        # tenant isolation tests, run against an in-memory Postgres
npm run lint
npm run build
```

The tests prove that no outfitter can read another outfitter's data. Every new table needs its own test in `tests/db/`, and two guard-rail tests fail automatically if a new table is missing row-level security or an `outfitter_id` column.
