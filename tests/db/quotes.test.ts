import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { addUser, affectedAs, asUser, createDb } from "./harness";

// Quotes (CLAUDE.md, Roles): admins see all, agents only their own, clients
// none; prices come from the price list; agents stay within the outfitter's
// discount and free extra limits; every discount and freebie records who gave it.

const U = {
  admin: "00000000-0000-0000-0000-0000000002a1",
  agent: "00000000-0000-0000-0000-0000000002a2",
  agent2: "00000000-0000-0000-0000-0000000002a3",
  client: "00000000-0000-0000-0000-0000000002a4",
  otherAdmin: "00000000-0000-0000-0000-0000000002b1",
};

let db: PGlite;
let wesco: string;
let other: string;
let observer: string; // rate agents may give free
let rifle: string; // rate agents may not give free
let dayRate: string;
let kudu: string;
let lion: string; // price on request

const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0];

async function newQuote(userId: string, outfitter = wesco, extra = "") {
  const rows = await asUser<{ id: string }>(
    db,
    userId,
    `insert into public.quotes (outfitter_id, hunter_name ${extra ? ", discount_percent" : ""})
     values ($1, 'Anna Kowalska' ${extra ? `, ${extra}` : ""}) returning id`,
    [outfitter],
  );
  return rows[0].id;
}

beforeAll(async () => {
  db = await createDb();
  for (const [name, id] of Object.entries(U)) await addUser(db, id, `${name}@test.dev`);
  await db.exec(`
    insert into public.outfitters (name, slug, country_code, default_currency, invoice_prefix, active_season)
    values ('Kalahari Test Hunts', 'kalahari-test', 'NA', 'NAD', 'KTH', '2027');
  `);
  wesco = (await one<{ id: string }>("select id from public.outfitters where slug='wesco-safaris'")).id;
  other = (await one<{ id: string }>("select id from public.outfitters where slug='kalahari-test'")).id;
  await db.query("select public.bootstrap_admin('wesco-safaris', 'admin@test.dev')");
  await db.query("select public.bootstrap_admin('kalahari-test', 'otherAdmin@test.dev')");
  await db.query(
    `insert into public.memberships (outfitter_id, user_id, role, is_active) values
       ($1, $2, 'agent', true), ($1, $3, 'agent', true), ($1, $4, 'client', true)`,
    [wesco, U.agent, U.agent2, U.client],
  );
  await db.exec(readFileSync(join(__dirname, "..", "..", "supabase", "data", "wesco-2026-2027-prices.sql"), "utf8"));
  await db.query("update public.outfitters set agent_max_discount_percent = 10 where id = $1", [wesco]);
  await db.query("update public.rates set agent_can_give_free = true where outfitter_id = $1 and name = 'Observer'", [wesco]);
  observer = (await one<{ id: string }>("select id from public.rates where name = 'Observer'")).id;
  rifle = (await one<{ id: string }>("select id from public.rates where name like 'Rifle hire%'")).id;
  dayRate = (await one<{ id: string }>("select id from public.rates where name like '1 client per day%'")).id;
  kudu = (await one<{ id: string }>("select id from public.species where name like 'Kudu%'")).id;
  lion = (await one<{ id: string }>("select id from public.species where name = 'Lion'")).id;
});

describe("who sees quotes", () => {
  it("an agent sees only their own quotes; an admin sees all; a client sees none", async () => {
    const mine = await newQuote(U.agent);
    const theirs = await newQuote(U.agent2);
    const adminQuote = await newQuote(U.admin);
    const agentSees = (await asUser<{ id: string }>(db, U.agent, "select id from public.quotes")).map((r) => r.id);
    expect(agentSees).toContain(mine);
    expect(agentSees).not.toContain(theirs);
    expect(agentSees).not.toContain(adminQuote);
    const adminSees = (await asUser<{ id: string }>(db, U.admin, "select id from public.quotes")).map((r) => r.id);
    expect(adminSees).toEqual(expect.arrayContaining([mine, theirs, adminQuote]));
    expect(await asUser(db, U.client, "select * from public.quotes")).toHaveLength(0);
  });

  it("an agent can't change or add lines to another agent's quote", async () => {
    const theirs = await newQuote(U.agent2);
    expect(await affectedAs(db, U.agent, "update public.quotes set hunter_name = 'x' where id = $1", [theirs])).toBe(0);
    await expect(
      asUser(db, U.agent, "insert into public.quote_lines (quote_id, kind, rate_id) values ($1, 'rate', $2)", [theirs, dayRate]),
    ).rejects.toThrow();
  });

  it("another outfitter can't see or touch Wesco quotes, and can't quote from Wesco prices", async () => {
    const q = await newQuote(U.admin);
    expect((await asUser<{ id: string }>(db, U.otherAdmin, "select id from public.quotes")).map((r) => r.id)).not.toContain(q);
    expect(await affectedAs(db, U.otherAdmin, "delete from public.quotes where id = $1", [q])).toBe(0);
    const own = await newQuote(U.otherAdmin, other);
    await expect(
      asUser(db, U.otherAdmin, "insert into public.quote_lines (quote_id, kind, rate_id) values ($1, 'rate', $2)", [own, dayRate]),
    ).rejects.toThrow(/not on the price list/);
  });

  it("a client can't make a quote", async () => {
    await expect(newQuote(U.client)).rejects.toThrow();
  });
});

describe("prices come from the price list", () => {
  it("takes the season, currency and line prices from the outfitter", async () => {
    const q = await newQuote(U.agent);
    const quote = await one<{ season: string; currency: string; created_by: string }>(
      "select season, currency, created_by from public.quotes where id = $1",
      [q],
    );
    expect(quote).toEqual({ season: "2026/2027", currency: "USD", created_by: U.agent });
    const [line] = await asUser<{ unit_price: string; description: string }>(
      db,
      U.agent,
      "insert into public.quote_lines (quote_id, kind, species_id, unit_price, description) values ($1, 'trophy_fee', $2, 1, 'cheap kudu') returning unit_price, description",
      [q, kudu],
    );
    expect(Number(line.unit_price)).toBe(3600);
    expect(line.description).toMatch(/^Kudu/);
  });

  it("an agent can change the quantity but never the price", async () => {
    const q = await newQuote(U.agent);
    const [line] = await asUser<{ id: string }>(
      db,
      U.agent,
      "insert into public.quote_lines (quote_id, kind, rate_id, quantity) values ($1, 'rate', $2, 7) returning id",
      [q, dayRate],
    );
    await asUser(db, U.agent, "update public.quote_lines set unit_price = 1, quantity = 10 where id = $1", [line.id]);
    const after = await one<{ unit_price: string; quantity: string }>("select unit_price, quantity from public.quote_lines where id = $1", [line.id]);
    expect(Number(after.unit_price)).toBe(380);
    expect(Number(after.quantity)).toBe(10);
  });

  it("keeps price on request as no amount", async () => {
    const q = await newQuote(U.agent);
    const [line] = await asUser<{ price_type: string; unit_price: string | null }>(
      db,
      U.agent,
      "insert into public.quote_lines (quote_id, kind, species_id) values ($1, 'trophy_fee', $2) returning price_type, unit_price",
      [q, lion],
    );
    expect(line).toEqual({ price_type: "on_request", unit_price: null });
  });

  it("only an admin can add a line that isn't on the price list", async () => {
    const q = await newQuote(U.agent);
    await expect(
      asUser(db, U.agent, "insert into public.quote_lines (quote_id, kind, description, unit_price) values ($1, 'custom', 'Bonus', 0)", [q]),
    ).rejects.toThrow(/Only an admin/);
    const aq = await newQuote(U.admin);
    await asUser(db, U.admin, "insert into public.quote_lines (quote_id, kind, description, unit_price) values ($1, 'custom', 'Dip and pack', 450)", [aq]);
  });
});

describe("agent limits", () => {
  it("lets an agent give a discount up to the limit and records who gave it", async () => {
    const q = await newQuote(U.agent, wesco, "10");
    const row = await one<{ discount_percent: string; discount_given_by: string }>(
      "select discount_percent, discount_given_by from public.quotes where id = $1",
      [q],
    );
    expect(Number(row.discount_percent)).toBe(10);
    expect(row.discount_given_by).toBe(U.agent);
  });

  it("blocks a discount above the limit with a clear message", async () => {
    await expect(newQuote(U.agent, wesco, "15")).rejects.toThrow("The highest discount you can give is 10%. Ask an admin for more.");
    const q = await newQuote(U.agent);
    await expect(asUser(db, U.agent, "update public.quotes set discount_percent = 25 where id = $1", [q])).rejects.toThrow(/highest discount/);
  });

  it("lets an admin give any discount, and records it", async () => {
    const q = await newQuote(U.admin, wesco, "25");
    expect((await one<{ discount_given_by: string }>("select discount_given_by from public.quotes where id = $1", [q])).discount_given_by).toBe(U.admin);
  });

  it("lets an agent give an allowed extra free and records who gave it", async () => {
    const q = await newQuote(U.agent);
    const [line] = await asUser<{ is_free: boolean; free_given_by: string }>(
      db,
      U.agent,
      "insert into public.quote_lines (quote_id, kind, rate_id, is_free) values ($1, 'rate', $2, true) returning is_free, free_given_by",
      [q, observer],
    );
    expect(line).toEqual({ is_free: true, free_given_by: U.agent });
  });

  it("blocks an agent from giving anything else free, with a clear message", async () => {
    const q = await newQuote(U.agent);
    await expect(
      asUser(db, U.agent, "insert into public.quote_lines (quote_id, kind, rate_id, is_free) values ($1, 'rate', $2, true)", [q, rifle]),
    ).rejects.toThrow(/can't give Rifle hire.* for free/);
    const [kuduLine] = await asUser<{ id: string }>(
      db,
      U.agent,
      "insert into public.quote_lines (quote_id, kind, species_id) values ($1, 'trophy_fee', $2) returning id",
      [q, kudu],
    );
    await expect(asUser(db, U.agent, "update public.quote_lines set is_free = true where id = $1", [kuduLine.id])).rejects.toThrow(/for free/);
  });

  it("can't fake who gave a discount or freebie", async () => {
    const q = await newQuote(U.agent);
    await asUser(db, U.agent, "update public.quotes set discount_percent = 5, discount_given_by = $2 where id = $1", [q, U.admin]);
    expect((await one<{ discount_given_by: string }>("select discount_given_by from public.quotes where id = $1", [q])).discount_given_by).toBe(U.agent);
  });

  it("agents can't change the limits themselves", async () => {
    expect(await affectedAs(db, U.agent, "update public.outfitters set agent_max_discount_percent = 100 where id = $1", [wesco])).toBe(0);
    expect(await affectedAs(db, U.agent, "update public.rates set agent_can_give_free = true where id = $1", [rifle])).toBe(0);
  });
});
