import type { Metadata } from "next";
import { Card, SectionHeading } from "@/components/ui";
import { QuoteDetailsForm } from "@/components/quotes/quote-details-form";

export const metadata: Metadata = { title: "New quote" };

export default function NewQuotePage() {
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <SectionHeading level={1} eyebrow="Quotes" title="New quote" description="Start with the hunter and the trip. Then add rates and animals from your price list." />
      <Card>
        <QuoteDetailsForm area="admin" />
      </Card>
    </div>
  );
}
