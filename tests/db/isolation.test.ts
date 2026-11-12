import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { addUser, affectedAs, asUser, createDb } from "./harness";

// Two outfitters, each with an admin, an agent and a client, plus one
// deactivated admin. Every test asks: can anyone reach across the line?
const U = {
  wescoAdmin: "00000000-0000-0000-0000-00000000000a",
  wescoAgent: "00000000-0000-0000-0000-00000000000b",
  wescoClient: "00000000-0000-0000-0000-00000000000c",
  wescoClient2: "00000000-0000-0000-0000-00000000000d",
  otherAdmin: "00000000-0000-0000-0000-0000000000a2",
  exAdmin: "00000000-0000-0000-0000-0000000000e1",
};

let db: PGlite;
let wesco: string;
let other: string;

beforeAll(async () => {
  db = await createDb();
  for (const [name, id] of Object.entries(U)) await addUser(db, id, `${name}@test.dev`);

  await db.exec(`
    insert into public.outfitters (name, slug, country_code, default_currency, invoice_prefix)
    values ('Kalahari Test Hunts', 'kalahari-test', 'NA', 'NAD', 'KTH');
  `);
  wesco = (await db.query<{ id: string }>("select id from public.outfitters where slug='wesco-safaris'")).rows[0].id;
  other = (await db.query<{ id: string }>("select id from public.outfitters where slug='kalahari-test'")).rows[0].id;

  await db.query("select public.bootstrap_admin('wesco-safaris', 'wescoAdmin@test.dev')");
  await db.query("select public.bootstrap_admin('kalahari-test', 'otherAdmin@test.dev')");
  await db.query(
    `insert into public.memberships (outfitter_id, user_id, role, is_active) values
       ($1, $2, 'agent', true), ($1, $3, 'client', true), ($1, $4, 'client', true),
       ($1, $5, 'admin', false)`,
    [wesco, U.wescoAgent, U.wescoClient, U.wescoClient2, U.exAdmin],
  );
  await db.query(
    "insert into public.regions (outfitter_id, country_code, name) values ($1, 'NA', 'Khomas')",
    [other],
  );
});

describe("seed", () => {
  it("creates Wesco as an outfitter with five South African regions", async () => {
    const rows = (await db.query("select * from public.regions where outfitter_id = $1", [wesco])).rows;
    expect(rows).toHaveLength(5);
  });
});

describe("outfitters", () => {
  it("an admin sees only their own outfitter", async () => {
    const rows = await asUser<{ slug: string }>(db, U.wescoAdmin, "select slug from public.outfitters");
    expect(rows.map((r) => r.slug)).toEqual(["wesco-safaris"]);
  });

  it("the other outfitter's admin cannot see Wesco", async () => {
    const rows = await asUser<{ slug: string }>(db, U.otherAdmin, "select slug from public.outfitters");
    expect(rows.map((r) => r.slug)).toEqual(["kalahari-test"]);
  });

  it("an admin cannot update another outfitter", async () => {
    const n = await affectedAs(db, U.otherAdmin, "update public.outfitters set name = 'hacked' where id = $1", [wesco]);
    expect(n).toBe(0);
  });

  it("an agent cannot update their own outfitter", async () => {
    const n = await affectedAs(db, U.wescoAgent, "update public.outfitters set name = 'x' where id = $1", [wesco]);
    expect(n).toBe(0);
  });

  it("an admin can update their own outfitter", async () => {
    const n = await affectedAs(db, U.wescoAdmin, "update public.outfitters set phone = phone where id = $1", [wesco]);
    expect(n).toBe(1);
  });
});

describe("memberships", () => {
  it("a client sees only their own membership", async () => {
    const rows = await asUser<{ user_id: string }>(db, U.wescoClient, "select user_id from public.memberships");
    expect(rows.map((r) => r.user_id)).toEqual([U.wescoClient]);
  });

  it("an admin sees their whole team but nobody from another outfitter", async () => {
    const rows = await asUser<{ outfitter_id: string }>(db, U.wescoAdmin, "select outfitter_id from public.memberships");
    expect(rows.length).toBe(5);
    expect(rows.every((r) => r.outfitter_id === wesco)).toBe(true);
  });

  it("an admin cannot add people to another outfitter", async () => {
    await expect(
      asUser(db, U.otherAdmin, "insert into public.memberships (outfitter_id, user_id, role) values ($1, $2, 'admin')", [wesco, U.otherAdmin]),
    ).rejects.toThrow(/row-level security/);
  });

  it("an admin cannot change their own role", async () => {
    const n = await affectedAs(db, U.wescoAdmin, "update public.memberships set role = 'client' where user_id = $1", [U.wescoAdmin]);
    expect(n).toBe(0);
  });

  it("a client cannot promote themselves", async () => {
    const n = await affectedAs(db, U.wescoClient, "update public.memberships set role = 'admin' where user_id = $1", [U.wescoClient]);
    expect(n).toBe(0);
  });
});

describe("regions", () => {
  it("an admin sees only their outfitter's regions", async () => {
    const rows = await asUser<{ outfitter_id: string }>(db, U.wescoAdmin, "select outfitter_id from public.regions");
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.outfitter_id === wesco)).toBe(true);
  });

  it("an admin cannot add a region to another outfitter", async () => {
    await expect(
      asUser(db, U.wescoAdmin, "insert into public.regions (outfitter_id, country_code, name) values ($1, 'NA', 'Erongo')", [other]),
    ).rejects.toThrow(/row-level security/);
  });

  it("a client cannot list regions", async () => {
    const rows = await asUser(db, U.wescoClient, "select * from public.regions");
    expect(rows).toHaveLength(0);
  });

  it("an agent can read regions but not change them", async () => {
    expect(await asUser(db, U.wescoAgent, "select * from public.regions")).toHaveLength(5);
    const n = await affectedAs(db, U.wescoAgent, "delete from public.regions where outfitter_id = $1", [wesco]);
    expect(n).toBe(0);
  });
});

describe("deactivated and signed-out users", () => {
  it("a deactivated admin sees no outfitter data", async () => {
    expect(await asUser(db, U.exAdmin, "select * from public.outfitters")).toHaveLength(0);
    expect(await asUser(db, U.exAdmin, "select * from public.regions")).toHaveLength(0);
  });

  it("a request with no signed-in user sees nothing", async () => {
    expect(await asUser(db, null, "select * from public.outfitters")).toHaveLength(0);
    expect(await asUser(db, null, "select * from public.memberships")).toHaveLength(0);
  });

  it("app users cannot call bootstrap_admin", async () => {
    await expect(
      asUser(db, U.wescoClient, "select public.bootstrap_admin('wesco-safaris', 'wescoClient@test.dev')"),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("guard rails for future tables", () => {
  it("every public table has row-level security turned on", async () => {
    const rows = (
      await db.query<{ relname: string }>(
        `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
      )
    ).rows;
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it("every public table except outfitters has an outfitter_id column", async () => {
    const rows = (
      await db.query<{ table_name: string }>(
        `select t.table_name from information_schema.tables t
         where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
           and t.table_name <> 'outfitters'
           and not exists (select 1 from information_schema.columns c
                           where c.table_schema = 'public' and c.table_name = t.table_name
                             and c.column_name = 'outfitter_id')`,
      )
    ).rows;
    expect(rows.map((r) => r.table_name)).toEqual([]);
  });
});
