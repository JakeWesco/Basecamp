import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { addUser, asUser, createDb } from "./harness";

// Matches 20261112130000_advisor_fixes.sql: what Supabase's security and
// performance advisors flagged must stay fixed, for today's objects and for
// any added later.

let db: PGlite;

beforeAll(async () => {
  db = await createDb();
});

describe("functions exposed through the API", () => {
  it("the only SECURITY DEFINER function in public anyone can call is the share link lookup", async () => {
    // shared_quote is public on purpose: hunters open a quote link without
    // logging in. tests/db/share-links.test.ts checks it needs the exact
    // token and shows nothing private. Any other function here is a hole.
    const rows = (
      await db.query<{ name: string }>(
        `select p.proname as name from pg_proc p
         where p.pronamespace = 'public'::regnamespace and p.prosecdef
           and (has_function_privilege('anon', p.oid, 'execute')
                or has_function_privilege('authenticated', p.oid, 'execute'))`,
      )
    ).rows;
    expect(rows.map((r) => r.name)).toEqual(["shared_quote"]);
  });

  it("a signed-out request cannot call bootstrap_admin", async () => {
    await addUser(db, "00000000-0000-0000-0000-0000000000f1", "stranger@test.dev");
    await expect(
      db.transaction(async (tx) => {
        await tx.exec("set local role anon");
        await tx.query("select public.bootstrap_admin('wesco-safaris', 'stranger@test.dev')");
      }),
    ).rejects.toThrow(/permission denied/);
  });

  it("the private functions live outside the API schema and anon cannot run them", async () => {
    const rows = (
      await db.query<{ name: string; anon: boolean; authd: boolean }>(
        `select p.proname as name,
                has_function_privilege('anon', p.oid, 'execute') as anon,
                has_function_privilege('authenticated', p.oid, 'execute') as authd
         from pg_proc p where p.pronamespace = 'private'::regnamespace order by 1`,
      )
    ).rows;
    // Policy helpers: signed-in users run them inside policies. Trigger
    // functions (quote rules): nobody calls them directly.
    expect(rows).toEqual([
      { name: "has_role", anon: false, authd: true },
      { name: "is_member", anon: false, authd: true },
      { name: "quote_line_rules", anon: false, authd: false },
      { name: "quote_rules", anon: false, authd: false },
    ]);
  });

  it("every function in public and private has a fixed search_path", async () => {
    const rows = (
      await db.query<{ name: string }>(
        `select p.proname as name from pg_proc p
         where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
           and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c
                           where c like 'search_path=%')`,
      )
    ).rows;
    expect(rows.map((r) => r.name)).toEqual([]);
  });
});

describe("policies", () => {
  it("call auth.uid() through a subselect so it runs once per query", async () => {
    const rows = (
      await db.query<{ policyname: string; expr: string }>(
        `select policyname, concat_ws(' ', qual, with_check) as expr
         from pg_policies where schemaname = 'public'`,
      )
    ).rows;
    const bare = rows.filter((r) => /auth\.uid\(\)/.test(r.expr.replace(/SELECT auth\.uid\(\)/g, "")));
    expect(bare.map((r) => r.policyname)).toEqual([]);
  });

  it("no table has two permissive policies for the same role and action", async () => {
    const rows = (
      await db.query<{ tablename: string; cmd: string }>(
        `with expanded as (
           select p.tablename, r.role, c.cmd
           from pg_policies p
           cross join lateral unnest(p.roles) as r(role)
           cross join lateral unnest(case when p.cmd = 'ALL'
                                          then array['SELECT','INSERT','UPDATE','DELETE']
                                          else array[p.cmd] end) as c(cmd)
           where p.schemaname = 'public' and p.permissive = 'PERMISSIVE'
         )
         select tablename, cmd from expanded group by tablename, role, cmd having count(*) > 1`,
      )
    ).rows;
    expect(rows).toEqual([]);
  });

  it("a signed-in admin still passes the policies through the private helpers", async () => {
    const admin = "00000000-0000-0000-0000-0000000000f2";
    await addUser(db, admin, "helperadmin@test.dev");
    await db.query("select public.bootstrap_admin('wesco-safaris', 'helperadmin@test.dev')");
    const rows = await asUser<{ name: string }>(db, admin, "select name from public.regions");
    expect(rows).toHaveLength(5);
  });
});

describe("indexes", () => {
  // Supabase's "unindexed foreign keys" advisor: every foreign key in public
  // needs an index that starts with the key's columns, in the same order.
  it("every foreign key has a covering index", async () => {
    const rows = (
      await db.query<{ constraint: string }>(
        `select c.conname as "constraint"
         from pg_constraint c
         join pg_namespace n on n.oid = c.connamespace
         where c.contype = 'f' and n.nspname = 'public'
           and not exists (
             select 1 from pg_index i
             where i.indrelid = c.conrelid
               and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey
           )`,
      )
    ).rows;
    expect(rows.map((r) => r.constraint)).toEqual([]);
  });
});
