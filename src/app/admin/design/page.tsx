import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui";
import { DesignSystem } from "./design-system";

export const metadata: Metadata = { title: "Design system" };

/**
 * Every token and component in all its states, for review. Admins only: the
 * /admin layout checks the role.
 */
export default function DesignPage() {
  return (
    <div className="flex flex-col gap-16">
      <SectionHeading
        level={1}
        eyebrow="Basecamp"
        title="Design system"
        description="Every colour, size and component in one place. New screens use only what is on this page."
      />
      <DesignSystem />
    </div>
  );
}
