import { cx } from "./styles";

/**
 * Placeholder in the shape of the content that is loading. Never a spinner.
 * It breathes slowly; with reduced motion it stays still.
 */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cx("block animate-breathe rounded-full bg-sand-tint", className)} />;
}

/** Lines of text: the last one shorter, like a real paragraph. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cx("flex flex-col gap-3", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cx("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </span>
  );
}

/** A card with a title and a few lines. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cx("flex flex-col gap-4 rounded-card border border-line bg-card p-6", className)}>
      <Skeleton className="h-6 w-1/3" />
      <SkeletonText />
    </div>
  );
}

/** A table: rows on wide screens, stacked cards below 760px, like Table. */
export function SkeletonTable({ rows = 4, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div aria-hidden="true">
      <div className="hidden rounded-card border border-line bg-card md:block">
        <div className="flex gap-6 border-b border-line px-6 py-4">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex gap-6 border-b border-line px-6 py-4 last:border-b-0">
            {Array.from({ length: columns }, (_, c) => (
              <Skeleton key={c} className={cx("h-4 flex-1", c === columns - 1 && "ml-auto max-w-24")} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: Math.min(rows, 3) }, (_, r) => (
          <div key={r} className="flex flex-col gap-3 rounded-card border border-line bg-card p-6">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Screen reader text for a loading region. Put it next to the skeletons. */
export function LoadingLabel({ children = "Loading" }: { children?: string }) {
  return (
    <span role="status" className="sr-only">
      {children}
    </span>
  );
}
