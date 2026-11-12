import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buttonClasses, Card, LoadingLabel, Skeleton, SkeletonCard } from "@/components/ui";
import { WhatsappLogo } from "@/components/ui/icons";
import { BrandScope } from "@/lib/brand";
import { formatMoney, UNIT_LABEL } from "@/lib/prices";
import { lineTotal, quoteTotals } from "@/lib/quotes";
import { getSharedQuote, type SharedLine } from "@/lib/shared-quote";
import { siteOrigin, whatsAppChat } from "@/lib/site";

// The page a hunter opens from WhatsApp: no login, the outfitter's own logo
// and colours, light or dark like their phone. Never indexed by search engines.

export async function generateMetadata({ params }: PageProps<"/q/[token]">): Promise<Metadata> {
  const { token } = await params;
  const data = await getSharedQuote(token);
  if (!data) return { title: { absolute: "Quote not found" }, robots: { index: false, follow: false } };
  const { quote, outfitter } = data;
  const title = `Your hunt quote from ${outfitter.name}`;
  const description = `${quote.hunting_days} hunting days, ${quote.hunters} ${quote.hunters === 1 ? "hunter" : "hunters"}, ${quote.season} season.`;
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website" },
  };
}

function longDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-line bg-card p-4">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}

function Lines({ title, lines, money }: { title: string; lines: SharedLine[]; money: (n: number) => string }) {
  if (!lines.length) return null;
  return (
    <Card title={title}>
      <ul className="flex flex-col divide-y divide-line">
        {lines.map((l, i) => {
          const each =
            l.price_type === "fixed"
              ? `${l.quantity === 1 ? "" : `${l.quantity} × `}${money(l.unit_price ?? 0)} ${l.unit === "per_item" && l.quantity === 1 ? "" : UNIT_LABEL[l.unit]}`.trim()
              : l.price_type === "cost_price"
                ? "At cost"
                : "Price on request";
          const total = l.price_type !== "fixed" ? "" : l.is_free ? "Included free" : money(lineTotal(l));
          return (
            <li key={i} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-medium">{l.description}</span>
                {each && !(l.kind === "trophy_fee" && l.quantity === 1 && l.price_type === "fixed") && (
                  <span className="tabular text-sm text-muted">{each}</span>
                )}
              </div>
              <span className={l.is_free ? "font-semibold whitespace-nowrap text-success" : "tabular font-semibold whitespace-nowrap"}>{total}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

async function SharedQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getSharedQuote(token);
  if (!data) notFound();
  const { quote, outfitter, brand, lines } = data;
  const money = (n: number) => formatMoney(n, quote.currency);
  const totals = quoteTotals(lines, quote.discount_percent);
  const url = `${await siteOrigin()}/q/${token}`;
  const ask = whatsAppChat(outfitter.phone, `Hi ${outfitter.name}, I have a question about my hunt quote: ${url}`);
  const website = outfitter.website ? (outfitter.website.startsWith("http") ? outfitter.website : `https://${outfitter.website}`) : null;

  return (
    <BrandScope brand={brand} className="flex min-h-dvh flex-1 flex-col">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex min-h-16 w-full max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          {brand.logoUrl ? (
            // Outfitter logos live on their own hosts; next/image would need each one configured.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={brand.name} className="h-10 w-auto max-w-48 object-contain" />
          ) : (
            <span className="font-heading text-xl">{brand.name}</span>
          )}
          {ask && (
            <a href={ask} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              <WhatsappLogo className="size-4" />
              Ask a question
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold tracking-wider text-olive uppercase">Hunt quote, {quote.season} season</p>
          <h1 className="text-4xl sm:text-5xl">Your hunt with {outfitter.name}</h1>
          <p className="text-lg text-muted">Prepared for {quote.hunter_name}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label="Hunting days" value={String(quote.hunting_days)} />
          <Fact label={quote.hunters === 1 ? "Hunter" : "Hunters"} value={String(quote.hunters)} />
          <Fact label={quote.observers === 1 ? "Observer" : "Observers"} value={String(quote.observers)} />
          <Fact label="Arriving" value={quote.arrival_date ? longDate(quote.arrival_date) : "To be agreed"} />
        </div>

        <Lines title="Daily rates and extras" lines={lines.filter((l) => l.kind !== "trophy_fee")} money={money} />
        <Lines title="Trophy fees" lines={lines.filter((l) => l.kind === "trophy_fee")} money={money} />

        <Card title="Total">
          <dl className="tabular flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-medium">{money(totals.subtotal)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted">Discount, {quote.discount_percent}%</dt>
                <dd className="font-medium">{money(-totals.discount)}</dd>
              </div>
            )}
            {totals.freeValue > 0 && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted">Included free</dt>
                <dd className="font-medium text-success">{money(totals.freeValue)} value</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="text-3xl font-semibold">{money(totals.total)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-muted">
            Prices in {quote.currency}, {quote.season} season.
            {totals.onRequest > 0 && ` ${totals.onRequest === 1 ? "One item is" : `${totals.onRequest} items are`} priced on request and not in the total.`}
            {totals.atCost > 0 && " Items at cost are charged as used."}
          </p>
        </Card>

        {quote.notes && (
          <Card title={`A note from ${outfitter.name}`}>
            <p className="whitespace-pre-line">{quote.notes}</p>
          </Card>
        )}

        <Card title="Questions or ready to book?">
          <div className="flex flex-col gap-4">
            <p className="text-muted">Message {outfitter.name} directly. They will answer and help you plan the rest.</p>
            <div className="flex flex-wrap gap-3">
              {ask && (
                <a href={ask} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "cta" })}>
                  <WhatsappLogo className="size-5" />
                  Message on WhatsApp
                </a>
              )}
              {outfitter.email && (
                <a href={`mailto:${outfitter.email}`} className={buttonClasses({ variant: "secondary" })}>
                  Email {outfitter.email}
                </a>
              )}
              {website && (
                <a href={website} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "ghost" })}>
                  Visit the website
                </a>
              )}
            </div>
          </div>
        </Card>
      </main>
    </BrandScope>
  );
}

export default function Page({ params }: PageProps<"/q/[token]">) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
          <LoadingLabel>Loading your quote</LoadingLabel>
          <Skeleton className="h-12 w-3/4" />
          <SkeletonCard />
          <SkeletonCard />
        </main>
      }
    >
      <SharedQuotePage params={params} />
    </Suspense>
  );
}
