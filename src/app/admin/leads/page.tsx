import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses, LoadingLabel, SectionHeading, SkeletonTable } from "@/components/ui";
import { LeadList } from "@/components/leads/lead-list";
import { listLeads } from "@/lib/lead-data";

export const metadata: Metadata = { title: "Leads" };

async function Leads() {
  return <LeadList area="admin" leads={await listLeads("admin")} />;
}

export default function LeadsPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeading
        level={1}
        eyebrow="Admin"
        title="Leads"
        description="Hunters who might book, from your whole team. Newest first."
        actions={
          <Link href="/admin/leads/new" className={buttonClasses()}>
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
