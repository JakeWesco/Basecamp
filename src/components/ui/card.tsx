import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./styles";

type Props = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  description?: ReactNode;
  /** Buttons or links shown beside the title. */
  actions?: ReactNode;
};

/** White card, 24px corners, 1px line border all round. Flat: no gradient. */
export function Card({ title, description, actions, className, children, ...rest }: Props) {
  return (
    <div className={cx("rounded-card border border-line bg-card p-6 text-ink", className)} {...rest}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            {title && <h2 className="text-2xl leading-8">{title}</h2>}
            {description && <p className="text-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
