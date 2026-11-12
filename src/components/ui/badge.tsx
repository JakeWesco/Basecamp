import type { ReactNode } from "react";
import { cx } from "./styles";

/** Where a booking is in the hunter's journey, in order. */
export const STATUSES = ["Enquiry", "Quoted", "Booked", "Deposit Paid", "Travelling", "Completed"] as const;
export type Status = (typeof STATUSES)[number];

export type Tone = "neutral" | "success" | "warning" | "error";

// Neighbouring statuses differ in lightness, not only hue, so they stay apart
// for colour-blind users and in greyscale. Every pair passes 4.5:1.
const STATUS_STYLE: Record<Status, { pill: string; dot: string }> = {
  Enquiry: { pill: "bg-sand-tint text-olive-dark border-sand-tint", dot: "bg-sand" },
  Quoted: { pill: "bg-card text-ink border-line", dot: "bg-olive" },
  Booked: { pill: "bg-olive text-on-olive border-olive", dot: "bg-sand-tint" },
  "Deposit Paid": { pill: "bg-olive-dark text-on-olive border-olive-dark", dot: "bg-sand" },
  Travelling: { pill: "bg-sand text-ink border-sand", dot: "bg-olive-dark" },
  Completed: { pill: "bg-paper text-muted border-line", dot: "bg-muted" },
};

const TONE_STYLE: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: "bg-sand-tint text-olive-dark border-sand-tint", dot: "bg-olive" },
  success: { pill: "bg-success-tint text-success border-success-tint", dot: "bg-success" },
  warning: { pill: "bg-warning-tint text-warning border-warning-tint", dot: "bg-warning" },
  error: { pill: "bg-error-tint text-error border-error-tint", dot: "bg-error" },
};

/** A status pill. Pass a booking status, or children with a tone for any other label. */
export function Badge({ status, tone = "neutral", children }: { status?: Status; tone?: Tone; children?: ReactNode }) {
  const style = status ? STATUS_STYLE[status] : TONE_STYLE[tone];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap",
        style.pill,
      )}
    >
      <span aria-hidden="true" className={cx("size-2 rounded-full", style.dot)} />
      {children ?? status}
    </span>
  );
}
