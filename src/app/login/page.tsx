import { Suspense } from "react";
import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

async function Form({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginForm next={next ?? "/app"} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-24">
      <div>
        <p className="text-sm font-semibold tracking-wider text-olive uppercase">Basecamp</p>
        <h1 className="mt-2 text-4xl">Sign in</h1>
        <p className="mt-2 text-muted">Use the email your outfitter invited you with.</p>
      </div>
      <Card>
        <Suspense>
          <Form searchParams={searchParams as Promise<{ next?: string }>} />
        </Suspense>
      </Card>
    </main>
  );
}
