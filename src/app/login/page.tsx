import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

async function Form({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginForm next={next ?? "/app"} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-24">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted">Basecamp</p>
        <h1 className="mt-1 text-2xl font-semibold">Sign in</h1>
      </div>
      <Suspense>
        <Form searchParams={searchParams as Promise<{ next?: string }>} />
      </Suspense>
    </main>
  );
}
