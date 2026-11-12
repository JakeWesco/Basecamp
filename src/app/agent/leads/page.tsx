import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses, LoadingLabel, SectionHeading, SkeletonTable } from "@/components/ui";
import { LeadList } from "@/components/leads/lead-list";
import { listLeads } from "@/lib/lead-data";

export const metadata: Metadata = { title: "Leads" };

async function Leads() {
  return <LeadList area="agent" leads={await listLeads("agent")} />;
}

export default function LeadsPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeading
        level={1}
        eyebrow="Agent"
        title="Leads"
        description="The hunters you have spoken to. Newest first."
        actions={
          <Link href="/agent/leads/new" className={buttonClasses()}>
            Add a lead
          </Link>
        }
      />
      <Suspense
        fallback={
          <>
            <LoadingLabel>Loading leads</LoadingLabel>
            <SkeletonTable rows={5} columns={5} />
          </>
        }
      >
        <Leads />
      </Suspense>
    </div>
  );
}
