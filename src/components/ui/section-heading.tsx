import type { ReactNode } from "react";
import { cx } from "./styles";

const TAG = { 1: "h1", 2: "h2", 3: "h3" } as const;
const SIZE = { 1: "text-4xl", 2: "text-3xl", 3: "text-2xl" } as const;

/**
 * Heading for a page or a section of one: Fraunces title, an optional line
 * under it and actions on the right. Level 1 once per page, for its title.
 */
export function SectionHeading({
  title,
  description,
  eyebrow,
  actions,
  level = 2,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Small label above the title, e.g. the area name. */
  eyebrow?: ReactNode;
  actions?: ReactNode;
  level?: 1 | 2 | 3;
  className?: string;
}) {
  const H = TAG[level];
  return (
    <div className={cx("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="flex max-w-2xl flex-col gap-2">
        {eyebrow && <p className="text-sm font-semibold tracking-wider text-olive uppercase">{eyebrow}</p>}
        <H className={SIZE[level]}>{title}</H>
        {description && <p className="text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
