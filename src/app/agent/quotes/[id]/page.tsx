import { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingLabel, Skeleton, SkeletonCard } from "@/components/ui";
import { QuoteBuilder } from "@/components/quotes/quote-builder";
import { loadQuote } from "@/lib/quote-data";

export const metadata: Metadata = { title: "Quote" };

async function Builder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadQuote("agent", id);
  return <QuoteBuilder {...ctx} />;
}

export default function QuotePage({ params }: PageProps<"/agent/quotes/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-8">
          <LoadingLabel>Loading quote</LoadingLabel>
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      }
    >
      <Builder params={params} />
    </Suspense>
  );
}
