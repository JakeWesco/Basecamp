import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { addUser, affectedAs, asUser, createDb } from "./harness";

// Lead inbox (CLAUDE.md, Roles): admins see all leads of their outfitter,
// agents only their own, clients none, and no outfitter sees another's.

const U = {
  admin: "00000000-0000-0000-0000-0000000004a1",
  agent: "00000000-0000-0000-0000-0000000004a2",
  agent2: "00000000-0000-0000-0000-0000000004a3",
  client: "00000000-0000-0000-0000-0000000004a4",
  otherAdmin: "00000000-0000-0000-0000-0000000004b1",
};

let db: PGlite;
let wesco: string;
let other: string;
let kudu: string;
let otherSpecies: string;

const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0];

async function addLead(userId: string, outfitter = wesco, name = "Jan Kowalski", extra: Record<string, unknown> = {}) {
  const cols = ["outfitter_id", "full_name", "phone", ...Object.keys(extra)];
  const vals = [outfitter, name, "+48501234567", ...Object.values(extra)];
  const [row] = await asUser<{ id: string }>(
    db,
    userId,
    `insert into public.leads (${cols.join(", ")}) values (${vals.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
    vals,
  );
  return row.id;
}

beforeAll(async () => {
  db = await createDb();
  for (const [name, id] of Object.entries(U)) await addUser(db, id, `${name}@test.dev`);
  await db.exec(`
    insert into public.outfitters (name, slug, country_code, default_currency, invoice_prefix)
    values ('Kalahari Test Hunts', 'kalahari-test', 'NA', 'NAD', 'KTH');
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
  kudu = (await one<{ id: string }>("insert into public.species (outfitter_id, name) values ($1, 'Kudu') returning id", [wesco])).id;
  otherSpecies = (await one<{ id: string }>("insert into public.species (outfitter_id, name) values ($1, 'Oryx') returning id", [other])).id;
});

describe("who sees leads", () => {
  it("agents see and edit only the leads they created", async () => {
    const mine = await addLead(U.agent, wesco, "Mine");
    const theirs = await addLead(U.agent2, wesco, "Theirs");
    const seen = (await asUser<{ id: string }>(db, U.agent, "select id from public.leads")).map((r) => r.id);
    expect(seen).toContain(mine);
    expect(seen).not.toContain(theirs);
    expect(await affectedAs(db, U.agent, "update public.leads set temperature = 'hot' where id = $1", [mine])).toBe(1);
    expect(await affectedAs(db, U.agent, "update public.leads set temperature = 'hot' where id = $1", [theirs])).toBe(0);
    expect(await affectedAs(db, U.agent, "delete from public.leads where id = $1", [theirs])).toBe(0);
  });

  it("admins see every lead in their outfitter", async () => {
    const a = await addLead(U.agent, wesco, "Agent lead");
    const b = await addLead(U.admin, wesco, "Admin lead");
    const seen = (await asUser<{ id: string }>(db, U.admin, "select id from public.leads")).map((r) => r.id);
    expect(seen).toEqual(expect.arrayContaining([a, b]));
    expect(await affectedAs(db, U.admin, "update public.leads set status = 'contacted' where id = $1", [a])).toBe(1);
  });

  it("clients can't see or add leads", async () => {
    await addLead(U.agent);
    expect(await asUser(db, U.client, "select * from public.leads")).toHaveLength(0);
    await expect(addLead(U.client)).rejects.toThrow();
  });

  it("one outfitter can't see, change or add to another's leads", async () => {
    const wescoLead = await addLead(U.admin);
    const otherLead = await addLead(U.otherAdmin, other, "Namibia lead");
    const seen = (await asUser<{ id: string }>(db, U.otherAdmin, "select id from public.leads")).map((r) => r.id);
    expect(seen).toEqual([otherLead]);
    expect(await affectedAs(db, U.otherAdmin, "update public.leads set notes = 'x' where id = $1", [wescoLead])).toBe(0);
    await expect(addLead(U.otherAdmin, wesco)).rejects.toThrow();
    expect((await asUser<{ id: string }>(db, U.admin, "select id from public.leads")).map((r) => r.id)).not.toContain(otherLead);
  });

  it("signed-out visitors get nothing", async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.exec("set local role anon");
        return tx.query("select * from public.leads");
      }),
    ).rejects.toThrow();
  });
});

describe("lead rules", () => {
  it("records who created it, and that can't be faked or changed", async () => {
    const id = await addLead(U.agent, wesco, "Owner test", { created_by: U.admin });
    expect((await one<{ created_by: string }>("select created_by from public.leads where id = $1", [id])).created_by).toBe(U.agent);
    await asUser(db, U.agent, "update public.leads set created_by = $2 where id = $1", [id, U.agent2]);
    expect((await one<{ created_by: string }>("select created_by from public.leads where id = $1", [id])).created_by).toBe(U.agent);
  });

  it("needs an email or a phone, and a phone in international format", async () => {
    await expect(asUser(db, U.agent, "insert into public.leads (outfitter_id, full_name) values ($1, 'No contact')", [wesco])).rejects.toThrow();
    await expect(
      asUser(db, U.agent, "insert into public.leads (outfitter_id, full_name, phone) values ($1, 'Local', '0797091179')", [wesco]),
    ).rejects.toThrow();
    const [r] = await asUser<{ email: string }>(
      db,
      U.agent,
      "insert into public.leads (outfitter_id, full_name, email) values ($1, 'Email only', '  Anna@Example.PL ') returning email",
      [wesco],
    );
    expect(r.email).toBe("anna@example.pl");
  });

  it("needs a reason when lost, and drops it otherwise", async () => {
    const id = await addLead(U.agent);
    await expect(asUser(db, U.agent, "update public.leads set status = 'lost' where id = $1", [id])).rejects.toThrow();
    await asUser(db, U.agent, "update public.leads set status = 'lost', lost_reason = 'Went with another outfitter' where id = $1", [id]);
    await asUser(db, U.agent, "update public.leads set status = 'contacted' where id = $1", [id]);
    expect((await one<{ lost_reason: string | null }>("select lost_reason from public.leads where id = $1", [id])).lost_reason).toBeNull();
  });

  it("marketing consent is off by default and records when it was given", async () => {
    const id = await addLead(U.agent);
    expect(await one("select marketing_consent, consent_at from public.leads where id = $1", [id])).toEqual({ marketing_consent: false, consent_at: null });
    await asUser(db, U.agent, "update public.leads set marketing_consent = true where id = $1", [id]);
    expect((await one<{ consent_at: string | null }>("select consent_at from public.leads where id = $1", [id])).consent_at).not.toBeNull();
  });
});

describe("species interest", () => {
  it("follows the lead: agents only on their own leads, and only their outfitter's species", async () => {
    const mine = await addLead(U.agent);
    const theirs = await addLead(U.agent2);
    await asUser(db, U.agent, "insert into public.lead_species (lead_id, species_id, outfitter_id) values ($1, $2, $3)", [mine, kudu, wesco]);
    await expect(
      asUser(db, U.agent, "insert into public.lead_species (lead_id, species_id, outfitter_id) values ($1, $2, $3)", [theirs, kudu, wesco]),
    ).rejects.toThrow();
    await expect(
      asUser(db, U.agent, "insert into public.lead_species (lead_id, species_id, outfitter_id) values ($1, $2, $3)", [mine, otherSpecies, wesco]),
    ).rejects.toThrow();
    expect(await asUser(db, U.agent2, "select * from public.lead_species where lead_id = $1", [mine])).toHaveLength(0);
  });
});

describe("quotes from leads", () => {
  it("a quote can be made from your own lead and shows up on it", async () => {
    const lead = await addLead(U.agent);
    const [q] = await asUser<{ id: string }>(
      db,
      U.agent,
      "insert into public.quotes (outfitter_id, hunter_name, lead_id) values ($1, 'Jan Kowalski', $2) returning id",
      [wesco, lead],
    );
    const linked = await asUser<{ id: string }>(db, U.agent, "select id from public.quotes where lead_id = $1", [lead]);
    expect(linked.map((r) => r.id)).toEqual([q.id]);
  });

  it("an agent can't link a quote to another agent's lead", async () => {
    const theirs = await addLead(U.agent2);
    await expect(
      asUser(db, U.agent, "insert into public.quotes (outfitter_id, hunter_name, lead_id) values ($1, 'x', $2)", [wesco, theirs]),
    ).rejects.toThrow(/lead was not found/);
  });

  it("deleting a lead keeps its quotes", async () => {
    const lead = await addLead(U.admin);
    const [q] = await asUser<{ id: string }>(
      db,
      U.admin,
      "insert into public.quotes (outfitter_id, hunter_name, lead_id) values ($1, 'Keep me', $2) returning id",
      [wesco, lead],
    );
    await asUser(db, U.admin, "delete from public.leads where id = $1", [lead]);
    expect(await one("select lead_id from public.quotes where id = $1", [q.id])).toEqual({ lead_id: null });
  });
});
