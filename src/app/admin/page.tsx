import Link from "next/link";
import { buttonClasses, EmptyState, SectionHeading } from "@/components/ui";
import { Tray } from "@/components/ui/icons";

export default function AdminHome() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeading level={1} eyebrow="Admin" title="Dashboard" description="Your leads, quotes and clients in one place." />
      <EmptyState
        icon={<Tray />}
        title="Nothing here yet. Leads and quotes will show up once the price list is set up."
        action={
          <Link href="/admin/design" className={buttonClasses({ variant: "secondary" })}>
            Review the design system
          </Link>
        }
      />
    </div>
  );
}
