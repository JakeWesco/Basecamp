import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./spinner";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./styles";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, blocks clicks and tells screen readers it is busy. */
  loading?: boolean;
  /** Text read while loading, e.g. "Saving…". Defaults to the button's own label. */
  loadingLabel?: string;
};

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
      className={buttonClasses({ variant, size, className })}
      {...rest}
    >
      {loading && <Spinner />}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
