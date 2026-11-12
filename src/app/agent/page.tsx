import { EmptyState, SectionHeading } from "@/components/ui";
import { Tray } from "@/components/ui/icons";

export default function AgentHome() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeading level={1} eyebrow="Agent" title="Dashboard" description="The leads you bring in and where each one stands." />
      <EmptyState icon={<Tray />} title="No leads yet. Leads you capture will show up here." />
    </div>
  );
}
