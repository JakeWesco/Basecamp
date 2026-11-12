import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { addUser, affectedAs, asUser, createDb } from "./harness";

// Price list: every member reads it, only admins change it, and no outfitter
// can see or touch another outfitter's prices (CLAUDE.md, Roles).

const U = {
  admin: "00000000-0000-0000-0000-0000000001a1",
  agent: "00000000-0000-0000-0000-0000000001a2",
  client: "00000000-0000-0000-0000-0000000001a3",
  exAdmin: "00000000-0000-0000-0000-0000000001a4",
  otherAdmin: "00000000-0000-0000-0000-0000000001b1",
};

const DATA = readFileSync(join(__dirname, "..", "..", "supabase", "data", "wesco-2026-2027-prices.sql"), "utf8");

let db: PGlite;
let wesco: string;
let other: string;
let kudu: string;

beforeAll(async () => {
  db = await createDb();
  for (const [name, id] of Object.entries(U)) await addUser(db, id, `${name}@test.dev`);
  await db.exec(`
    insert into public.outfitters (name, slug, country_code, default_currency, invoice_prefix)
    values ('Kalahari Test Hunts', 'kalahari-test', 'NA', 'NAD', 'KTH');
  `);
  wesco = (await db.query<{ id: string }>("select id from public.outfitters where slug='wesco-safaris'")).rows[0].id;
  other = (await db.query<{ id: string }>("select id from public.outfitters where slug='kalahari-test'")).rows[0].id;
  await db.query("select public.bootstrap_admin('wesco-safaris', 'admin@test.dev')");
  await db.query("select public.bootstrap_admin('kalahari-test', 'otherAdmin@test.dev')");
  await db.query(
    `insert into public.memberships (outfitter_id, user_id, role, is_active) values
       ($1, $2, 'agent', true), ($1, $3, 'client', true), ($1, $4, 'admin', false)`,
    [wesco, U.agent, U.client, U.exAdmin],
  );
  await db.exec(DATA);
  await db.query(
    "insert into public.species (outfitter_id, name) values ($1, 'Oryx'), ($1, 'Kudu')",
    [other],
  );
  kudu = (
    await db.query<{ id: string }>("select id from public.species where outfitter_id = $1 and name like 'Kudu%'", [wesco])
  ).rows[0].id;
});

describe("Wesco 2026/2027 price list data", () => {
  it("loads every species, fee and rate from the PDF", async () => {
    const count = async (sql: string) => Number((await db.query<{ n: number }>(sql, [wesco])).rows[0].n);
    expect(await count("select count(*) n from public.species where outfitter_id = $1")).toBe(46);
    expect(await count("select count(*) n from public.trophy_fees where outfitter_id = $1 and season = '2026/2027'")).toBe(46);
    expect(await count("select count(*) n from public.trophy_fees where outfitter_id = $1 and on_request")).toBe(5);
    expect(await count("select count(*) n from public.rates where outfitter_id = $1 and season = '2026/2027'")).toBe(6);
  });

  it("has the right amounts", async () => {
    const fee = async (name: string) =>
      (
        await db.query<{ amount: string | null }>(
          "select f.amount from public.trophy_fees f join public.species s on s.id = f.species_id where s.outfitter_id = $1 and s.name = $2",
          [wesco, name],
        )
      ).rows[0].amount;
    expect(Number(await fee('Kudu, Cape (under 52")'))).toBe(3600);
    expect(Number(await fee("Sable antelope"))).toBe(5500);
    expect(Number(await fee('Buffalo, over 42"'))).toBe(14000);
    expect(await fee("Lion")).toBeNull();
    const ammo = (await db.query<{ price_type: string }>("select price_type from public.rates where name like 'Ammunition%'")).rows[0];
    expect(ammo.price_type).toBe("cost_price");
  });

  it("can run again without duplicating anything", async () => {
    await db.exec(DATA);
    const n = (await db.query<{ n: number }>("select count(*) n from public.species where outfitter_id = $1", [wesco])).rows[0].n;
    expect(Number(n)).toBe(46);
  });
});

describe("who can read prices", () => {
  it.each([
    ["admin", U.admin],
    ["agent", U.agent],
    ["client", U.client],
  ])("a Wesco %s sees only Wesco's price list", async (_role, id) => {
    const species = await asUser<{ outfitter_id: string }>(db, id, "select outfitter_id from public.species");
    const rates = await asUser<{ outfitter_id: string }>(db, id, "select outfitter_id from public.rates");
    const fees = await asUser<{ outfitter_id: string }>(db, id, "select outfitter_id from public.trophy_fees");
    expect(species).toHaveLength(46);
    expect(rates).toHaveLength(6);
    expect(fees).toHaveLength(46);
    expect([...species, ...rates, ...fees].every((r) => r.outfitter_id === wesco)).toBe(true);
  });

  it("another outfitter's admin sees none of Wesco's prices", async () => {
    const rows = await asUser<{ outfitter_id: string }>(db, U.otherAdmin, "select outfitter_id from public.species");
    expect(rows.every((r) => r.outfitter_id === other)).toBe(true);
    expect(await asUser(db, U.otherAdmin, "select * from public.rates")).toHaveLength(0);
    expect(await asUser(db, U.otherAdmin, "select * from public.trophy_fees")).toHaveLength(0);
  });

  it("a deactivated admin and a signed-out visitor see nothing", async () => {
    expect(await asUser(db, U.exAdmin, "select * from public.species")).toHaveLength(0);
    expect(await asUser(db, null, "select * from public.trophy_fees")).toHaveLength(0);
    await expect(
      db.transaction(async (tx) => {
        await tx.exec("set local role anon");
        return tx.query("select * from public.rates");
      }),
    ).rejects.toThrow();
  });
});

describe("who can change prices", () => {
  it("an admin can add, change and remove their own prices", async () => {
    await asUser(db, U.admin, "insert into public.rates (outfitter_id, season, name, amount) values ($1, 'test', 'Test rate', 10)", [wesco]);
    expect(await affectedAs(db, U.admin, "update public.rates set amount = 12 where outfitter_id = $1 and name = 'Test rate'", [wesco])).toBe(1);
    expect(await affectedAs(db, U.admin, "update public.trophy_fees set amount = 3700 where species_id = $1", [kudu])).toBe(1);
    expect(await affectedAs(db, U.admin, "delete from public.rates where outfitter_id = $1 and name = 'Test rate'", [wesco])).toBe(1);
    await affectedAs(db, U.admin, "update public.trophy_fees set amount = 3600 where species_id = $1", [kudu]);
  });

  it("an agent can never change prices, the price list or species", async () => {
    expect(await affectedAs(db, U.agent, "update public.trophy_fees set amount = 1 where outfitter_id = $1", [wesco])).toBe(0);
    expect(await affectedAs(db, U.agent, "update public.rates set amount = 1 where outfitter_id = $1", [wesco])).toBe(0);
    expect(await affectedAs(db, U.agent, "delete from public.species where outfitter_id = $1", [wesco])).toBe(0);
    await expect(
      asUser(db, U.agent, "insert into public.rates (outfitter_id, season, name, amount) values ($1, '2026/2027', 'Agent rate', 1)", [wesco]),
    ).rejects.toThrow();
  });

  it("a client can never change prices", async () => {
    expect(await affectedAs(db, U.client, "update public.trophy_fees set amount = 1 where outfitter_id = $1", [wesco])).toBe(0);
    await expect(
      asUser(db, U.client, "insert into public.species (outfitter_id, name) values ($1, 'Client species')", [wesco]),
    ).rejects.toThrow();
  });

  it("another outfitter's admin cannot change or add to Wesco's prices", async () => {
    expect(await affectedAs(db, U.otherAdmin, "update public.trophy_fees set amount = 1 where outfitter_id = $1", [wesco])).toBe(0);
    expect(await affectedAs(db, U.otherAdmin, "delete from public.rates where outfitter_id = $1", [wesco])).toBe(0);
    await expect(
      asUser(db, U.otherAdmin, "insert into public.rates (outfitter_id, season, name, amount) values ($1, 'x', 'x', 1)", [wesco]),
    ).rejects.toThrow();
  });

  it("a fee can't point at another outfitter's species", async () => {
    await expect(
      asUser(db, U.otherAdmin, "insert into public.trophy_fees (outfitter_id, species_id, season, amount) values ($1, $2, 'x', 1)", [
        other,
        kudu,
      ]),
    ).rejects.toThrow();
  });
});

describe("price rules in the database", () => {
  it("a price on request has no amount, and a fixed price needs one", async () => {
    await expect(
      db.query("insert into public.trophy_fees (outfitter_id, species_id, season, amount, on_request) values ($1, $2, 'z', 5, true)", [wesco, kudu]),
    ).rejects.toThrow();
    await expect(db.query("insert into public.rates (outfitter_id, season, name) values ($1, 'z', 'No amount')", [wesco])).rejects.toThrow();
    await expect(
      db.query("insert into public.rates (outfitter_id, season, name, amount) values ($1, 'z', 'Negative', -1)", [wesco]),
    ).rejects.toThrow();
  });

  it("a species name is unique per outfitter, ignoring case", async () => {
    await expect(db.query("insert into public.species (outfitter_id, name) values ($1, 'impala')", [wesco])).rejects.toThrow();
    await db.query("insert into public.species (outfitter_id, name) values ($1, 'Impala')", [other]);
  });
});
