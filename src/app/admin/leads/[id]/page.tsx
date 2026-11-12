import { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingLabel, Skeleton, SkeletonCard } from "@/components/ui";
import { LeadView } from "@/components/leads/lead-view";
import { loadLead } from "@/lib/lead-data";

export const metadata: Metadata = { title: "Lead" };

async function View({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { lead, species } = await loadLead("admin", id);
  return <LeadView area="admin" lead={lead} species={species} />;
}

export default function LeadPage({ params }: PageProps<"/admin/leads/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-8">
          <LoadingLabel>Loading lead</LoadingLabel>
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      }
    >
      <View params={params} />
    </Suspense>
  );
}
