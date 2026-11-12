import type { Metadata } from "next";
import { signOut } from "@/app/login/actions";

export const metadata: Metadata = { title: "No access yet" };

export default function NoAccess() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-2xl font-semibold">You&apos;re signed in, but not linked to an outfitter yet</h1>
      <p className="text-muted">
        Ask your outfitter to add you to their team or send you an invite. Once they do, sign in again.
      </p>
      <form action={signOut}>
        <button className="rounded-md border border-line bg-surface px-4 py-2 font-medium">Sign out</button>
      </form>
    </main>
  );
}
