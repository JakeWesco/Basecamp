import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { addUser, asUser, createDb } from "./harness";

// The hunt planner: a signed-out hunter plans a hunt and leaves their
// details. Everything goes through four functions that check for themselves,
// because the visitor never touches a table.

const U = {
  admin: "00000000-0000-0000-0000-0000000005a1",
  agent: "00000000-0000-0000-0000-0000000005a2",
  otherAdmin: "00000000-0000-0000-0000-0000000005a3",
};
const VISITOR = "a".repeat(64);
const OTHER_VISITOR = "b".repeat(64);

let db: PGlite;
let wesco: string;
let kudu: string;
let lion: string;

const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0];

/** Runs a query as a signed-out visitor. */
async function asVisitor<T>(sql: string, params: unknown[] = []): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec("set local role anon");
    return (await tx.query<T>(sql, params)).rows[0];
  });
}

type Start = { r: { id?: string; error?: string; catalogue?: Record<string, unknown> } };

const start = (visitor = VISITOR, slug = "wesco-safaris", request = "Me and my son, 7 days in June, kudu is a must, around $15k.") =>
  asVisitor<Start>("select public.planner_start($1, $2, 'en', $3) r", [slug, visitor, request]).then((x) => x.r);

const PLAN = (species: string[]) => ({
  trip: { hunters: 2, observers: 0, days: 7, when: "June 2027" },
  packages: [{ title: "Kudu week", trophies: species.map((species_id) => ({ species_id })) }],
});

beforeAll(async () => {
  db = await createDb();
  for (const [name, id] of Object.entries(U)) await addUser(db, id, `${name}@test.dev`);
  wesco = (await one<{ id: string }>("select id from public.outfitters where slug='wesco-safaris'")).id;
  await db.query("select public.bootstrap_admin('wesco-safaris', 'admin@test.dev')");
  await db.query("insert into public.memberships (outfitter_id, user_id, role, is_active) values ($1, $2, 'agent', true)", [wesco, U.agent]);
  await db.exec(readFileSync(join(__dirname, "..", "..", "supabase", "data", "wesco-2026-2027-prices.sql"), "utf8"));
  await db.exec(readFileSync(join(__dirname, "..", "..", "supabase", "data", "wesco-cost-estimates.sql"), "utf8"));
  kudu = (await one<{ id: string }>("select id from public.species where name like 'Kudu%'")).id;
  lion = (await one<{ id: string }>("select id from public.species where name = 'Lion'")).id;

  // A second outfitter with its own admin, to prove nothing crosses over.
  await db.query(
    "insert into public.outfitters (name, slug, country_code, planner_enabled) values ('Other Outfitter', 'other-outfitter', 'NA', true)",
  );
  await addUser(db, "00000000-0000-0000-0000-0000000005b9", "x@test.dev");
  await db.query("select public.bootstrap_admin('other-outfitter', 'otherAdmin@test.dev')");
});

describe("switched off", () => {
  it("is off until an admin switches it on: no page and no plans", async () => {
    expect((await asVisitor<{ r: unknown }>("select public.planner_outfitter('wesco-safaris') r")).r).toBeNull();
    expect(await start()).toEqual({ error: "off" });
    expect((await one<{ n: number }>("select count(*)::int n from public.planner_requests")).n).toBe(0);
  });

  it("an unknown outfitter is the same as switched off", async () => {
    expect(await start(VISITOR, "nobody-here")).toEqual({ error: "off" });
  });
});

describe("planning", () => {
  beforeAll(async () => {
    await db.query("update public.outfitters set planner_enabled = true where id = $1", [wesco]);
  });

  it("the page gets the name and brand, nothing private", async () => {
    const r = (await asVisitor<{ r: Record<string, unknown> }>("select public.planner_outfitter('wesco-safaris') r")).r;
    expect(r.name).toBe("Wesco Safaris");
    expect(Object.keys(r).sort()).toEqual(
      ["brand_accent", "brand_primary", "currency", "email", "language", "logo_url", "name", "phone", "website"].sort(),
    );
  });

  it("starting returns the published price list and the active other costs only", async () => {
    await db.query("update public.species set is_published = false where name = 'Baboon'");
    await db.query("update public.cost_estimates set is_active = (name = 'Travel insurance')");
    const r = await start();
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/);
    const cat = r.catalogue as { species: { name: string }[]; rates: unknown[]; costs: { name: string }[]; currency: string };
    expect(cat.currency).toBe("USD");
    expect(cat.species).toHaveLength(45);
    expect(cat.species.map((s) => s.name)).not.toContain("Baboon");
    expect(cat.rates).toHaveLength(6);
    expect(cat.costs.map((c) => c.name)).toEqual(["Travel insurance"]);
  });

  it("a visitor can make 8 plans an hour, then is asked to wait", async () => {
    const v = "c".repeat(64);
    for (let i = 0; i < 8; i++) expect((await start(v)).id).toBeTruthy();
    expect(await start(v)).toEqual({ error: "busy" });
    // Someone else is not affected.
    expect((await start("d".repeat(64))).id).toBeTruthy();
  });

  it("rejects a bad visitor id and an empty or very long request", async () => {
    await expect(start("not-a-hash")).rejects.toThrow(/Refresh the page/);
    await expect(start(VISITOR, "wesco-safaris", "   ")).rejects.toThrow();
    await expect(start(VISITOR, "wesco-safaris", "x".repeat(1001))).rejects.toThrow();
  });

  it("the plan is stored once, and only by the visitor who started it", async () => {
    const { id } = await start("e".repeat(64));
    const finish = (visitor: string) =>
      asVisitor<{ r: boolean }>("select public.planner_finish($1, $2, $3) r", [id, visitor, PLAN([kudu])]).then((x) => x.r);
    expect(await finish(OTHER_VISITOR)).toBe(false);
    expect(await finish("e".repeat(64))).toBe(true);
    expect(await finish("e".repeat(64))).toBe(false);
  });
});

describe("sending a package", () => {
  let id: string;
  const submit = (overrides: Partial<{ id: string; visitor: string; pkg: number; email: string }> = {}) =>
    asVisitor<{ r: boolean }>("select public.planner_submit($1, $2, $3, 'Anna Kowalska', $4, '+48501234567', 'pl', true) r", [
      overrides.id ?? id,
      overrides.visitor ?? "f".repeat(64),
      overrides.pkg ?? 0,
      overrides.email ?? "anna@example.pl",
    ]).then((x) => x.r);

  beforeAll(async () => {
    ({ id } = (await start("f".repeat(64))) as { id: string });
    // A stranger's package can name another outfitter's species id; it is ignored.
    const foreign = "00000000-0000-0000-0000-00000000dead";
    await asVisitor("select public.planner_finish($1, $2, $3)", [id, "f".repeat(64), PLAN([kudu, lion, foreign])]);
  });

  it("needs the right visitor and a real package", async () => {
    await expect(submit({ visitor: OTHER_VISITOR })).rejects.toThrow(/expired/);
    await expect(submit({ pkg: 2 })).rejects.toThrow(/Pick one of the packages/);
  });

  it("creates a hot planner lead with the species and the trip, for admins only", async () => {
    expect(await submit()).toBe(true);
    const lead = await one<Record<string, unknown>>("select * from public.leads where full_name = 'Anna Kowalska'");
    expect(lead).toMatchObject({
      created_by: null,
      source: "planner",
      temperature: "hot",
      status: "new",
      hunters: 2,
      observers: 0,
      rough_dates: "June 2027",
      country_code: "PL",
      marketing_consent: true,
    });
    expect(String(lead.notes)).toMatch(/^Hunt planner: Me and my son/);
    const species = (await db.query<{ name: string }>(
      "select s.name from public.lead_species ls join public.species s on s.id = ls.species_id where ls.lead_id = $1 order by 1",
      [lead.id],
    )).rows.map((r) => r.name);
    expect(species).toEqual(["Kudu, Cape (under 52\")", "Lion"]);

    expect(await asUser(db, U.admin, "select id from public.leads where id = $1", [lead.id])).toHaveLength(1);
    expect(await asUser(db, U.agent, "select id from public.leads where id = $1", [lead.id])).toHaveLength(0);
    expect(await asUser(db, U.otherAdmin, "select id from public.leads where id = $1", [lead.id])).toHaveLength(0);
  });

  it("a plan becomes one lead only", async () => {
    await expect(submit()).rejects.toThrow(/expired/);
    expect((await one<{ n: number }>("select count(*)::int n from public.leads where full_name = 'Anna Kowalska'")).n).toBe(1);
  });

  it("a bad email is refused by the lead's own checks", async () => {
    const { id: other } = (await start("1".repeat(64))) as { id: string };
    await asVisitor("select public.planner_finish($1, $2, $3)", [other, "1".repeat(64), PLAN([kudu])]);
    await expect(submit({ id: other, visitor: "1".repeat(64), email: "not an email" })).rejects.toThrow();
  });
});

describe("who can read requests", () => {
  it("admins of the outfitter only; agents, visitors and other outfitters see nothing", async () => {
    const total = (await one<{ n: number }>("select count(*)::int n from public.planner_requests where outfitter_id = $1", [wesco])).n;
    expect(total).toBeGreaterThan(0);
    expect(await asUser(db, U.admin, "select id from public.planner_requests")).toHaveLength(total);
    expect(await asUser(db, U.agent, "select id from public.planner_requests")).toHaveLength(0);
    expect(await asUser(db, U.otherAdmin, "select id from public.planner_requests")).toHaveLength(0);
    await expect(asVisitor("select id from public.planner_requests")).rejects.toThrow(/permission denied/);
  });

  it("nobody can write requests directly, not even an admin", async () => {
    await expect(
      asUser(db, U.admin, "insert into public.planner_requests (outfitter_id, visitor, language, request) values ($1, $2, 'en', 'x')", [
        wesco,
        VISITOR,
      ]),
    ).rejects.toThrow(/permission denied/);
    await expect(asUser(db, U.admin, "update public.planner_requests set chosen = 1")).rejects.toThrow(/permission denied/);
    await expect(asVisitor("delete from public.planner_requests")).rejects.toThrow(/permission denied/);
  });
});
