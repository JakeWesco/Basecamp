import { Suspense } from "react";
import type { Metadata } from "next";
import { Card, LoadingLabel, SectionHeading, SkeletonCard } from "@/components/ui";
import { LeadForm } from "@/components/leads/lead-form";
import { newLeadContext } from "@/lib/lead-data";

export const metadata: Metadata = { title: "Add a lead" };

async function Form() {
  const { species } = await newLeadContext("agent");
  return <LeadForm area="agent" species={species} />;
}

export default function NewLeadPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <SectionHeading level={1} eyebrow="Leads" title="Add a lead" />
      <Card>
        <Suspense
          fallback={
            <>
              <LoadingLabel>Loading</LoadingLabel>
              <SkeletonCard />
            </>
          }
        >
          <Form />
        </Suspense>
      </Card>
    </div>
  );
}
