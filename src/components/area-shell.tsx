import { Suspense, type ReactNode } from "react";
import { requireRole, type Role } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

const LABEL: Record<Role, string> = { admin: "Admin", agent: "Agent", client: "My hunt" };

async function Gate({ role, children }: { role: Role; children: ReactNode }) {
  const membership = await requireRole(role);
  return (
    <>
      <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-3">
        <div className="flex items-baseline gap-3">
          <span className="font-semibold">{membership.outfitterName}</span>
          <span className="text-sm text-muted">{LABEL[role]}</span>
        </div>
        <form action={signOut}>
          <button className="text-sm text-muted hover:text-foreground">Sign out</button>
        </form>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
    </>
  );
}

/** Wraps an area (admin, agent, client): checks the role, then renders it. */
export function AreaShell({ role, children }: { role: Role; children: ReactNode }) {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Loading…</p>}>
      <Gate role={role}>{children}</Gate>
    </Suspense>
  );
}
