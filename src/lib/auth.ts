import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "agent" | "client";

export type Membership = {
  outfitterId: string;
  outfitterName: string;
  role: Role;
};

const RANK: Record<Role, number> = { admin: 0, agent: 1, client: 2 };

export const HOME: Record<Role, string> = {
  admin: "/admin",
  agent: "/agent",
  client: "/client",
};

/**
 * The signed-in user's active memberships, highest role first.
 * RLS guarantees this only ever returns the user's own rows.
 */
export async function getMemberships(): Promise<{
  userId: string | null;
  email: string | null;
  memberships: Membership[];
}> {
  // Who is signed in is always request-time: never prerender past this point.
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { userId: null, email: null, memberships: [] };

  const { data } = await supabase
    .from("memberships")
    .select("role, outfitter_id, outfitters(name)")
    .eq("user_id", auth.user.id)
    .eq("is_active", true);

  const memberships = (data ?? [])
    .map((m) => ({
      outfitterId: m.outfitter_id as string,
      outfitterName: (m.outfitters as unknown as { name: string } | null)?.name ?? "",
      role: m.role as Role,
    }))
    .sort((a, b) => RANK[a.role] - RANK[b.role]);

  return { userId: auth.user.id, email: auth.user.email ?? null, memberships };
}

/** Use at the top of an area layout. Redirects anyone without the role. */
export async function requireRole(role: Role): Promise<Membership & { email: string }> {
  const { userId, email, memberships } = await getMemberships();
  if (!userId) redirect("/login");
  const match = memberships.find((m) => m.role === role);
  if (!match) redirect(memberships[0] ? HOME[memberships[0].role] : "/no-access");
  return { ...match, email: email ?? "" };
}

/**
 * For actions shared by admins and agents (quotes). Returns the highest staff
 * role. The database still decides what each role may do.
 */
export async function requireStaff(): Promise<Membership & { email: string; userId: string }> {
  const { userId, email, memberships } = await getMemberships();
  if (!userId) redirect("/login");
  const match = memberships.find((m) => m.role === "admin" || m.role === "agent");
  if (!match) redirect(memberships[0] ? HOME[memberships[0].role] : "/no-access");
  return { ...match, email: email ?? "", userId };
}
