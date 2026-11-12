import { Suspense } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { buttonClasses, LoadingLabel, Skeleton, SkeletonCard } from "@/components/ui";
import { WhatsappLogo } from "@/components/ui/icons";
import { Planner } from "@/components/planner/planner";
import { BrandScope } from "@/lib/brand";
import { languageFromHeader, pickLanguage } from "@/lib/planner";
import { getPlannerOutfitter } from "@/lib/planner-outfitter";
import { whatsAppChat } from "@/lib/site";

// The public hunt planner: no login, the outfitter's own logo and colours.
// Only there when the outfitter has switched it on in Settings.

export async function generateMetadata({ params }: PageProps<"/plan/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const outfitter = await getPlannerOutfitter(slug);
  if (!outfitter) return { title: { absolute: "Page not found" }, robots: { index: false, follow: false } };
  const title = `Plan your hunt with ${outfitter.name}`;
  const description = "Describe the hunt you want and get packages priced from the price list.";
  return { title: { absolute: title }, description, openGraph: { title, description, type: "website" } };
}

async function PlannerPage({ params, searchParams }: PageProps<"/plan/[slug]">) {
  const { slug } = await params;
  const outfitter = await getPlannerOutfitter(slug);
  if (!outfitter) notFound();
  const { lang } = await searchParams;
  const language = pickLanguage(
    typeof lang === "string" ? lang : null,
    languageFromHeader((await headers()).get("accept-language")),
    outfitter.language,
  );
  const { brand } = outfitter;
  const ask = whatsAppChat(outfitter.phone, `Hi ${outfitter.name}, I'd like to plan a hunt.`);

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
            <a href={ask} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              <WhatsappLogo className="size-4" />
              WhatsApp
            </a>
          )}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <Planner slug={slug} outfitter={outfitter.name} initialLanguage={language} />
      </main>
    </BrandScope>
  );
}

export default function Page(props: PageProps<"/plan/[slug]">) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
          <LoadingLabel>Loading</LoadingLabel>
          <Skeleton className="h-12 w-3/4" />
          <SkeletonCard />
        </main>
      }
    >
      <PlannerPage {...props} />
    </Suspense>
  );
}
