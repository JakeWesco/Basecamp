import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getMemberships, HOME } from "@/lib/auth";

// Sends a signed-in user to the right area for their highest role.
async function RouteByRole() {
  const { userId, memberships } = await getMemberships();
  if (!userId) redirect("/login");
  if (!memberships[0]) redirect("/no-access");
  redirect(HOME[memberships[0].role]);
  return null;
}

export default function AppEntry() {
  return (
    <main className="flex flex-1 items-center justify-center p-6 text-muted">
      <Suspense fallback={<p>Opening Basecamp…</p>}>
        <RouteByRole />
      </Suspense>
    </main>
  );
}
