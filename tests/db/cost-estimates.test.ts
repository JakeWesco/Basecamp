import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { addUser, affectedAs, asUser, createDb } from "./harness";

// All-in cost: admins manage the outfitter's estimates, agents read them and
// can leave some out of their own quotes, and hunters see only the active
// ones a quote includes.

const U = {
  admin: "00000000-0000-0000-0000-0000000006a1",
  agent: "00000000-0000-0000-0000-0000000006a2",
  client: "00000000-0000-0000-0000-0000000006a3",
  otherAdmin: "00000000-0000-0000-0000-0000000006b1",
};

let db: PGlite;
let wesco: string;
let other: string;

const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0];
const DATA = readFileSync(join(__dirname, "..", "..", "supabase", "data", "wesco-cost-estimates.sql"), "utf8");

beforeAll(async () => {
  db = await createDb();
  for (const [name, id] of Object.entries(U)) await addUser(db, id, `${name}@test.dev`);
  await db.exec(`insert into public.outfitters (name, slug, country_code, default_currency, invoice_prefix)
                 values ('Kalahari Test Hunts', 'kalahari-test', 'NA', 'NAD', 'KTH');`);
  wesco = (await one<{ id: string }>("select id from public.outfitters where slug='wesco-safaris'")).id;
  other = (await one<{ id: string }>("select id from public.outfitters where slug='kalahari-test'")).id;
  await db.query("select public.bootstrap_admin('wesco-safaris', 'admin@test.dev')");
  await db.query("select public.bootstrap_admin('kalahari-test', 'otherAdmin@test.dev')");
  await db.query(
    "insert into public.memberships (outfitter_id, user_id, role, is_active) values ($1, $2, 'agent', true), ($1, $3, 'client', true)",
    [wesco, U.agent, U.client],
  );
  await db.exec(DATA);
});

describe("starting list", () => {
  it("loads seven estimates for Wesco, all switched off until an admin checks them", async () => {
    const rows = (await db.query<{ is_active: boolean }>("select is_active from public.cost_estimates where outfitter_id = $1", [wesco])).rows;
    expect(rows).toHaveLength(7);
    expect(rows.every((r) => !r.is_active)).toBe(true);
    await db.exec(DATA);
    expect(Number((await one<{ n: number }>("select count(*) n from public.cost_estimates where outfitter_id = $1", [wesco])).n)).toBe(7);
  });
});

describe("who can do what", () => {
  it("admins add and change estimates; agents read but can't change them; clients see none", async () => {
    await asUser(db, U.admin, "insert into public.cost_estimates (outfitter_id, name, basis, low, high) values ($1, 'Visa', 'per_person', 0, 50)", [wesco]);
    expect(await affectedAs(db, U.admin, "update public.cost_estimates set is_active = true where outfitter_id = $1", [wesco])).toBe(8);
    expect((await asUser(db, U.agent, "select id from public.cost_estimates")).length).toBe(8);
    expect(await affectedAs(db, U.agent, "update public.cost_estimates set low = 0 where outfitter_id = $1", [wesco])).toBe(0);
    await expect(
      asUser(db, U.agent, "insert into public.cost_estimates (outfitter_id, name, basis, low, high) values ($1, 'Agent', 'per_trip', 0, 1)", [wesco]),
    ).rejects.toThrow();
    expect(await asUser(db, U.client, "select * from public.cost_estimates")).toHaveLength(0);
  });

  it("another outfitter can't see or change Wesco's estimates", async () => {
    expect(await asUser(db, U.otherAdmin, "select * from public.cost_estimates where outfitter_id = $1", [wesco])).toHaveLength(0);
    expect(await affectedAs(db, U.otherAdmin, "delete from public.cost_estimates where outfitter_id = $1", [wesco])).toBe(0);
    expect(await asUser(db, U.otherAdmin, "select * from public.cost_estimates where outfitter_id = $1", [other])).toHaveLength(0);
  });

  it("a high estimate can't be below the low one", async () => {
    await expect(
      asUser(db, U.admin, "insert into public.cost_estimates (outfitter_id, name, basis, low, high) values ($1, 'Odd', 'per_trip', 500, 100)", [wesco]),
    ).rejects.toThrow();
  });
});

describe("on the hunter page", () => {
  it("shows only active estimates the quote hasn't left out", async () => {
    const shipping = (await one<{ id: string }>("select id from public.cost_estimates where name like 'Shipping%'")).id;
    await db.query("update public.cost_estimates set is_active = false where name = 'Visa'");
    const [q] = await asUser<{ id: string }>(
      db,
      U.agent,
      "insert into public.quotes (outfitter_id, hunter_name) values ($1, 'Anna') returning id",
      [wesco],
    );
    await asUser(db, U.agent, "update public.quotes set excluded_costs = array[$2::uuid], share_token = $3 where id = $1", [q.id, shipping, "0".repeat(64)]);
    const token = (await one<{ share_token: string }>("select share_token from public.quotes where id = $1", [q.id])).share_token;
    const data = await db.transaction(async (tx) => {
      await tx.exec("set local role anon");
      return (await tx.query<{ d: { costs: { name: string }[] } }>("select public.shared_quote($1) d", [token])).rows[0].d;
    });
    const names = data.costs.map((c) => c.name);
    expect(names).toHaveLength(6);
    expect(names).not.toContain("Visa");
    expect(names.some((n) => n.startsWith("Shipping"))).toBe(false);
    expect(names).toContain("Flights to South Africa");
  });
});
