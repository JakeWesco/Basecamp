import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Runs the real migrations in an in-memory Postgres (PGlite), with a small
// stand-in for the parts of Supabase the migrations depend on: the
// authenticated role, the auth.users table and auth.uid().
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text unique not null);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated, service_role;
`;

const root = join(__dirname, "..", "..", "supabase");

export async function createDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const migrations = readdirSync(join(root, "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of migrations) {
    await db.exec(readFileSync(join(root, "migrations", file), "utf8"));
  }
  await db.exec(readFileSync(join(root, "seed.sql"), "utf8"));
  return db;
}

export async function addUser(db: PGlite, id: string, email: string) {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
}

/** Run a query as a signed-in app user, with RLS applied. */
export async function asUser<T>(
  db: PGlite,
  userId: string | null,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    const res = await tx.query<T>(sql, params);
    return res.rows;
  });
}

/** Number of rows a statement changed, run as a signed-in app user. */
export async function affectedAs(
  db: PGlite,
  userId: string,
  sql: string,
  params: unknown[] = [],
): Promise<number> {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    const res = await tx.query(sql, params);
    return res.affectedRows ?? 0;
  });
}
