import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses, LoadingLabel, SectionHeading, SkeletonTable } from "@/components/ui";
import { QuoteList } from "@/components/quotes/quote-list";

export const metadata: Metadata = { title: "Quotes" };

export default function QuotesPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeading
        level={1}
        eyebrow="Admin"
        title="Quotes"
        description="Every quote your team has made, newest first."
        actions={
          <Link href="/admin/quotes/new" className={buttonClasses()}>
            Start a quote
          </Link>
        }
      />
      <Suspense
        fallback={
          <>
            <LoadingLabel>Loading quotes</LoadingLabel>
            <SkeletonTable rows={4} columns={4} />
          </>
        }
      >
        <QuoteList area="admin" />
      </Suspense>
    </div>
  );
}
