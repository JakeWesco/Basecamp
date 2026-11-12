import { Suspense, type ReactNode } from "react";
import { requireRole, type Role } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui";

const LABEL: Record<Role, string> = { admin: "Admin", agent: "Agent", client: "My hunt" };

async function Gate({ role, children }: { role: Role; children: ReactNode }) {
  const membership = await requireRole(role);
  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b border-line bg-card px-4 py-3 sm:px-6">
        <div className="flex items-baseline gap-3">
          <span className="font-heading text-lg">{membership.outfitterName}</span>
          <span className="text-sm text-muted">{LABEL[role]}</span>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-8">{children}</main>
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
