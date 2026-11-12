import type { ReactNode } from "react";
import { cx } from "./styles";

/** Where a client is in their journey, in order. */
export const STATUSES = ["Enquiry", "Quoted", "Booked", "Deposit Paid", "Travelling", "Completed"] as const;
export type Status = (typeof STATUSES)[number];

// Neighbouring statuses differ in lightness, not only hue, so they stay apart
// for colour-blind users and in greyscale.
const STATUS_STYLE: Record<Status, { pill: string; dot: string }> = {
  Enquiry: { pill: "bg-sand-tint text-olive-dark border-sand-tint", dot: "bg-sand" },
  Quoted: { pill: "bg-card text-ink border-line", dot: "bg-olive" },
  Booked: { pill: "bg-olive text-on-dark border-olive", dot: "bg-sand-tint" },
  "Deposit Paid": { pill: "bg-olive-dark text-on-dark border-olive-dark", dot: "bg-sand" },
  Travelling: { pill: "bg-sand text-ink border-sand", dot: "bg-olive-dark" },
  Completed: { pill: "bg-paper text-muted border-line", dot: "bg-muted" },
};

/** A status pill. Pass a status, or children with tone for any other label. */
export function Badge({
  status,
  tone = "neutral",
  children,
}: {
  status?: Status;
  tone?: "neutral" | "danger";
  children?: ReactNode;
}) {
  const style = status
    ? STATUS_STYLE[status]
    : tone === "danger"
      ? { pill: "bg-card text-danger border-danger", dot: "bg-danger" }
      : { pill: "bg-sand-tint text-olive-dark border-sand-tint", dot: "bg-olive" };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs leading-4 font-semibold whitespace-nowrap",
        style.pill,
      )}
    >
      <span aria-hidden="true" className={cx("size-2 rounded-full", style.dot)} />
      {children ?? status}
    </span>
  );
}
