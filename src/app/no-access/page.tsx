import type { Metadata } from "next";
import { signOut } from "@/app/login/actions";
import { Button, Card } from "@/components/ui";
import { UsersThree } from "@/components/ui/icons";

export const metadata: Metadata = { title: "No access yet" };

export default function NoAccess() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-24">
      <p className="text-sm font-semibold tracking-wider text-olive uppercase">Basecamp</p>
      <Card>
        <div className="flex flex-col gap-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-sand-tint text-olive">
            <UsersThree className="size-6" />
          </span>
          <h1 className="text-3xl">You&apos;re signed in, but not linked to an outfitter yet</h1>
          <p className="text-muted">Ask your outfitter to add you to their team. Then sign in again.</p>
          <form action={signOut}>
            <Button type="submit" variant="secondary">
              Sign out
            </Button>
          </form>
        </div>
      </Card>
    </main>
  );
}
