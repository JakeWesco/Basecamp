import type { ReactNode } from "react";

/** What a screen shows before there is anything in it: what goes here and the first step. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-line bg-card px-6 py-12 text-center">
      {icon && (
        <div
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-inner bg-sand-tint text-olive"
        >
          {icon}
        </div>
      )}
      <div className="flex max-w-md flex-col gap-2">
        <h3 className="text-2xl leading-8">{title}</h3>
        {description && <p className="text-muted">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
