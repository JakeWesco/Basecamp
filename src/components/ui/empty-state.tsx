import type { ReactNode } from "react";

/**
 * What a screen shows before there is anything in it: an icon, one line on
 * what goes here, and one action button for the first step.
 */
export function EmptyState({ icon, title, action }: { icon: ReactNode; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-6 rounded-card border border-line bg-card px-6 py-12 text-center">
      <div aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-sand-tint text-olive [&>svg]:size-6">
        {icon}
      </div>
      <p className="max-w-md text-lg text-ink">{title}</p>
      {action}
    </div>
  );
}
