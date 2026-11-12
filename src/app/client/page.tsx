import { Card, EmptyState, SectionHeading } from "@/components/ui";
import { Receipt } from "@/components/ui/icons";

export default function ClientHome() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeading level={1} eyebrow="Your hunt" title="Welcome" description="Your trip, quote and documents, all in one place." />
      <EmptyState icon={<Receipt />} title="Your quote will show up here as soon as your outfitter sends it." />
      <Card title="Questions">
        <p className="text-muted">Reply to your outfitter on WhatsApp or email. They will update this page as your trip takes shape.</p>
      </Card>
    </div>
  );
}
