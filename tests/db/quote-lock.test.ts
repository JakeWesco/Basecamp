import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { addUser, asUser, createDb } from "./harness";

// Quote lock: prices are held from when the quote goes to the hunter. The
// lock date is set by the database and can't be faked or cleared.

const AGENT = "00000000-0000-0000-0000-0000000005a2";
let db: PGlite;
let wesco: string;

const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0];
const lockOf = async (id: string) => (await one<{ locked_at: string | null }>("select locked_at from public.quotes where id = $1", [id])).locked_at;

async function newQuote() {
  const [q] = await asUser<{ id: string }>(
    db,
    AGENT,
    "insert into public.quotes (outfitter_id, hunter_name, locked_at) values ($1, 'Anna', '2020-01-01') returning id",
    [wesco],
  );
  return q.id;
}

beforeAll(async () => {
  db = await createDb();
  await addUser(db, AGENT, "agent@test.dev");
  wesco = (await one<{ id: string }>("select id from public.outfitters where slug='wesco-safaris'")).id;
  await db.query("insert into public.memberships (outfitter_id, user_id, role, is_active) values ($1, $2, 'agent', true)", [wesco, AGENT]);
});

describe("quote lock", () => {
  it("a new quote isn't locked, even if a date is sent", async () => {
    expect(await lockOf(await newQuote())).toBeNull();
  });

  it("locks when the quote is marked as sent", async () => {
    const id = await newQuote();
    await asUser(db, AGENT, "update public.quotes set status = 'sent' where id = $1", [id]);
    const locked = await lockOf(id);
    expect(locked).not.toBeNull();
    expect(Date.now() - new Date(locked!).getTime()).toBeLessThan(60_000);
  });

  it("locks when a share link is created", async () => {
    const id = await newQuote();
    await asUser(db, AGENT, "update public.quotes set share_token = $2 where id = $1", [id, "0".repeat(64)]);
    expect(await lockOf(id)).not.toBeNull();
  });

  it("can't be backdated, moved or cleared; re-locking starts now", async () => {
    const id = await newQuote();
    await asUser(db, AGENT, "update public.quotes set status = 'sent' where id = $1", [id]);
    const first = await lockOf(id);
    await asUser(db, AGENT, "update public.quotes set locked_at = null where id = $1", [id]);
    expect(await lockOf(id)).toEqual(first);
    await asUser(db, AGENT, "update public.quotes set locked_at = '2020-01-01' where id = $1", [id]);
    const relocked = await lockOf(id);
    expect(new Date(relocked!).getFullYear()).toBeGreaterThan(2025);
  });

  it("other edits keep the lock date", async () => {
    const id = await newQuote();
    await asUser(db, AGENT, "update public.quotes set status = 'sent' where id = $1", [id]);
    const first = await lockOf(id);
    await asUser(db, AGENT, "update public.quotes set notes = 'Updated', status = 'draft' where id = $1", [id]);
    expect(await lockOf(id)).toEqual(first);
  });

  it("the hunter page gets the lock date", async () => {
    const id = await newQuote();
    const [{ share_token }] = await asUser<{ share_token: string }>(
      db,
      AGENT,
      "update public.quotes set share_token = $2 where id = $1 returning share_token",
      [id, "0".repeat(64)],
    );
    const data = await db.transaction(async (tx) => {
      await tx.exec("set local role anon");
      return (await tx.query<{ d: { quote: { locked_at: string | null } } }>("select public.shared_quote($1) d", [share_token])).rows[0].d;
    });
    expect(data.quote.locked_at).not.toBeNull();
  });
});
