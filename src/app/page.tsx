import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="text-sm font-medium uppercase tracking-wide text-muted">Basecamp</p>
      <h1 className="text-4xl font-semibold leading-tight">
        From first enquiry to trophy on the wall.
      </h1>
      <p className="text-lg text-muted">
        One link for your whole client journey. Built for hunting outfitters across Africa.
      </p>
      <div>
        <Link
          href="/login"
          className="inline-block rounded-md bg-primary px-5 py-2.5 font-medium text-white hover:bg-primary-hover"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
