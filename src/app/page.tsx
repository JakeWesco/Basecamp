import Link from "next/link";
import { buttonClasses } from "@/components/ui";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="text-sm font-semibold tracking-wider text-olive uppercase">Basecamp</p>
      <h1 className="text-5xl leading-none">From first enquiry to trophy on the wall.</h1>
      <p className="text-xl text-muted">
        One link for your whole client journey. Built for hunting outfitters across Africa.
      </p>
      <div>
        <Link href="/login" className={buttonClasses({ variant: "cta" })}>
          Sign in
        </Link>
      </div>
    </main>
  );
}
