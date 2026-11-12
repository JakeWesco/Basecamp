import { Suspense, type ReactNode } from "react";
import { requireRole, type Role } from "@/lib/auth";
import { BrandScope, getOutfitterBrand } from "@/lib/brand";
import { signOut } from "@/app/login/actions";
import { Button, LoadingLabel, Skeleton, SkeletonCard, cx } from "@/components/ui";
import { SignOut } from "@/components/ui/icons";
import { SidebarNav, TabBar } from "./area-nav";

const LABEL: Record<Role, string> = { admin: "Admin", agent: "Agent", client: "Your hunt" };

function SignOutButton({ compact }: { compact?: boolean }) {
  return (
    <form action={signOut}>
      {compact ? (
        <Button type="submit" variant="ghost" aria-label="Sign out" className="size-11 px-0">
          <SignOut className="size-5" />
        </Button>
      ) : (
        <Button type="submit" variant="secondary" size="sm" className="w-full">
          <SignOut className="size-4" />
          Sign out
        </Button>
      )}
    </form>
  );
}

/** Basecamp's own layout for the admin and agent areas. */
async function StaffArea({ role, children }: { role: "admin" | "agent"; children: ReactNode }) {
  const me = await requireRole(role);
  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-line bg-card lg:block">
        <div className="sticky top-0 flex h-dvh flex-col gap-8 overflow-y-auto p-6">
        <div className="flex flex-col gap-1">
          <span className="font-heading text-2xl text-ink">{me.outfitterName}</span>
          <span className="text-sm text-muted">{LABEL[role]}</span>
        </div>
        <SidebarNav area={role} />
        <div className="mt-auto flex flex-col gap-3 border-t border-line pt-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted">Signed in as</span>
            <span className="truncate text-sm font-medium text-ink" title={me.email}>
              {me.email}
            </span>
          </div>
          <SignOutButton />
        </div>
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-line bg-card pr-2 pl-4 lg:hidden">
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-heading text-xl text-ink">{me.outfitterName}</span>
          <span className="truncate text-xs text-muted">{me.email}</span>
        </div>
        <SignOutButton compact />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-24 sm:px-6 lg:px-12 lg:py-12">{children}</main>
      <TabBar area={role} />
    </div>
  );
}

/** The client area: the outfitter's own logo and colours, no Basecamp look. */
async function ClientArea({ children }: { children: ReactNode }) {
  const me = await requireRole("client");
  const brand = await getOutfitterBrand(me.outfitterId, me.outfitterName);
  return (
    <BrandScope brand={brand} className="flex min-h-dvh flex-1 flex-col">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-line bg-card pr-2 pl-4 sm:px-6">
        {brand.logoUrl ? (
          // Outfitter logos live on their own hosts; next/image would need each one configured.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logoUrl} alt={brand.name} className="h-10 w-auto max-w-48 object-contain" />
        ) : (
          <span className="font-heading text-xl text-ink">{brand.name}</span>
        )}
        <SignOutButton compact />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </BrandScope>
  );
}

/** Shaped like the layout while the session is checked. */
function AreaSkeleton({ staff }: { staff: boolean }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      <LoadingLabel />
      {staff && (
        <div aria-hidden="true" className="hidden w-64 shrink-0 flex-col gap-6 border-r border-line bg-card p-6 lg:flex">
          <Skeleton className="h-7 w-40" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      )}
      <div className={cx("mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-8 lg:px-12 lg:py-12", staff ? "max-w-6xl" : "max-w-3xl")}>
        <Skeleton className="h-10 w-64" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

/** Wraps an area (admin, agent, client): checks the role, then renders its layout. */
export function AreaShell({ role, children }: { role: Role; children: ReactNode }) {
  return (
    <Suspense fallback={<AreaSkeleton staff={role !== "client"} />}>
      {role === "client" ? <ClientArea>{children}</ClientArea> : <StaffArea role={role}>{children}</StaffArea>}
    </Suspense>
  );
}
