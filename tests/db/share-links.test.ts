import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { addUser, affectedAs, asUser, createDb } from "./harness";

// Share links: a hunter opens a quote without logging in. The token can't be
// chosen or guessed, and the link shows only what the hunter should see.

const U = {
  admin: "00000000-0000-0000-0000-0000000003a1",
  agent: "00000000-0000-0000-0000-0000000003a2",
  agent2: "00000000-0000-0000-0000-0000000003a3",
};

let db: PGlite;
let wesco: string;
let quote: string;

const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0];

/** Calls shared_quote as a signed-out visitor. */
async function asVisitor(token: string) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role anon");
    const res = await tx.query<{ data: Record<string, unknown> | null }>("select public.shared_quote($1) as data", [token]);
    return res.rows[0].data;
  });
}

beforeAll(async () => {
  db = await createDb();
  for (const [name, id] of Object.entries(U)) await addUser(db, id, `${name}@test.dev`);
  wesco = (await one<{ id: string }>("select id from public.outfitters where slug='wesco-safaris'")).id;
  await db.query("select public.bootstrap_admin('wesco-safaris', 'admin@test.dev')");
  await db.query(
    "insert into public.memberships (outfitter_id, user_id, role, is_active) values ($1, $2, 'agent', true), ($1, $3, 'agent', true)",
    [wesco, U.agent, U.agent2],
  );
  await db.exec(readFileSync(join(__dirname, "..", "..", "supabase", "data", "wesco-2026-2027-prices.sql"), "utf8"));
  await db.query("update public.outfitters set agent_max_discount_percent = 10 where id = $1", [wesco]);

  [{ id: quote }] = await asUser<{ id: string }>(
    db,
    U.agent,
    `insert into public.quotes (outfitter_id, hunter_name, hunter_email, hunter_phone, hunting_days, hunters, discount_percent, notes)
     values ($1, 'Anna Kowalska', 'anna@example.pl', '+48 501 234 567', 7, 2, 10, 'Bring a warm jacket.') returning id`,
    [wesco],
  );
  const dayRate = (await one<{ id: string }>("select id from public.rates where name like '2 clients per day%'")).id;
  const kudu = (await one<{ id: string }>("select id from public.species where name like 'Kudu%'")).id;
  await asUser(db, U.agent, "insert into public.quote_lines (quote_id, kind, rate_id, quantity) values ($1, 'rate', $2, 14)", [quote, dayRate]);
  await asUser(db, U.agent, "insert into public.quote_lines (quote_id, kind, species_id) values ($1, 'trophy_fee', $2)", [quote, kudu]);
});

describe("share tokens", () => {
  it("a new quote has no link, even if one is sent", async () => {
    const [q] = await asUser<{ share_token: string | null }>(
      db,
      U.agent,
      `insert into public.quotes (outfitter_id, hunter_name, share_token) values ($1, 'x', $2) returning share_token`,
      [wesco, "a".repeat(64)],
    );
    expect(q.share_token).toBeNull();
  });

  it("creating a link always makes a fresh random token, never the one sent", async () => {
    const chosen = "b".repeat(64);
    const [q] = await asUser<{ share_token: string; shared_at: string }>(
      db,
      U.agent,
      "update public.quotes set share_token = $2 where id = $1 returning share_token, shared_at",
      [quote, chosen],
    );
    expect(q.share_token).toMatch(/^[0-9a-f]{64}$/);
    expect(q.share_token).not.toBe(chosen);
    expect(q.shared_at).not.toBeNull();
  });

  it("an agent can't make a link for another agent's quote", async () => {
    expect(await affectedAs(db, U.agent2, "update public.quotes set share_token = $2 where id = $1", [quote, "c".repeat(64)])).toBe(0);
  });
});

describe("what a hunter sees", () => {
  let token: string;
  beforeAll(async () => {
    [{ share_token: token }] = await asUser<{ share_token: string }>(
      db,
      U.admin,
      "update public.quotes set share_token = $2 where id = $1 returning share_token",
      [quote, "d".repeat(64)],
    );
  });

  it("a signed-out visitor with the link sees the quote, lines and outfitter", async () => {
    const data = (await asVisitor(token)) as {
      quote: Record<string, unknown>;
      outfitter: Record<string, unknown>;
      lines: Record<string, unknown>[];
    };
    expect(data.quote).toMatchObject({ hunter_name: "Anna Kowalska", hunting_days: 7, hunters: 2, currency: "USD", notes: "Bring a warm jacket." });
    expect(data.outfitter).toMatchObject({ name: "Wesco Safaris" });
    expect(data.lines).toHaveLength(2);
    expect(Number(data.lines[1].unit_price)).toBe(3600);
  });

  it("never shows the hunter's contact details, ids, or who gave a discount", async () => {
    const text = JSON.stringify(await asVisitor(token));
    for (const secret of ["anna@example.pl", "+48 501", U.agent, U.admin, quote, wesco, "given_by", "created_by", "share_token"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("a wrong, partial or old token shows nothing", async () => {
    expect(await asVisitor("e".repeat(64))).toBeNull();
    expect(await asVisitor(token.slice(0, 32))).toBeNull();
    expect(await asVisitor("")).toBeNull();
    expect(await asVisitor("' or 1=1 --")).toBeNull();
  });

  it("turning the link off stops it working, and a new link differs", async () => {
    await asUser(db, U.admin, "update public.quotes set share_token = null where id = $1", [quote]);
    expect(await asVisitor(token)).toBeNull();
    const [{ share_token: fresh }] = await asUser<{ share_token: string }>(
      db,
      U.admin,
      "update public.quotes set share_token = $2 where id = $1 returning share_token",
      [quote, "f".repeat(64)],
    );
    expect(fresh).not.toBe(token);
    expect(await asVisitor(fresh)).not.toBeNull();
  });

  it("a signed-out visitor still can't read quotes directly", async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.exec("set local role anon");
        return tx.query("select * from public.quotes");
      }),
    ).rejects.toThrow();
  });
});
