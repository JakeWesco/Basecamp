import Link from "next/link";
import { buttonClasses } from "@/components/ui";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-24 sm:px-6">
        <p className="text-sm font-semibold tracking-wider text-olive uppercase">Basecamp</p>
        <h1 className="text-5xl leading-tight sm:text-6xl">From first enquiry to trophy on the wall.</h1>
        <p className="max-w-xl text-xl text-muted">
          One link for your whole client journey. Built for hunting outfitters across Africa.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/login" className={buttonClasses({ variant: "cta" })}>
            Sign in
          </Link>
        </div>
      </section>
      <footer className="bg-olive-dark px-4 py-8 text-on-olive sm:px-6">
        <p className="mx-auto max-w-3xl text-sm">Quotes, brochures and trophy updates your hunters can open on any phone.</p>
      </footer>
    </main>
  );
}
