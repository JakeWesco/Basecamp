import type { ButtonHTMLAttributes } from "react";
import { buttonClasses, cx, type ButtonSize, type ButtonVariant } from "./styles";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Blocks clicks, tells screen readers it is busy and shows loadingLabel. */
  loading?: boolean;
  /** Text shown while loading, e.g. "Saving…". Defaults to the button's own label. */
  loadingLabel?: string;
  /** Lets /admin/design show hover, active and focus without a mouse. */
  "data-force"?: string;
};

/** Primary (olive), cta (clay, one per page), secondary, ghost and danger; md 44px, sm 40px. */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className: cx(loading && "disabled:opacity-100", className) })}
      {...rest}
    >
      {/* No spinner: the label breathes while the work runs. */}
      <span className={cx("inline-flex items-center gap-2", loading && "animate-breathe")}>
        {loading && loadingLabel ? loadingLabel : children}
      </span>
    </button>
  );
}
