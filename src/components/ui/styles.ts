/** Joins class names, skipping empty ones. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Shared interaction styles. Every transition uses the Basecamp ease
 * (cubic-bezier(0.32,0.72,0,1)) at 600ms; pressing scales to 0.98. The focus
 * ring comes from :focus-visible in globals.css. is-hover / is-active are the
 * hover and press variants from globals.css: hover only on real pointers, and
 * both can be forced with data-force for the /admin/design page.
 */
export const motion = "transition-all duration-600 ease-basecamp";
export const press = "motion-press is-active:scale-[0.98]";

export type ButtonVariant = "primary" | "cta" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

export const BUTTON_VARIANTS: ButtonVariant[] = ["primary", "cta", "secondary", "ghost", "danger"];

const VARIANT: Record<ButtonVariant, string> = {
  primary: "border-olive bg-olive text-on-olive is-hover:border-olive-dark is-hover:bg-olive-dark",
  // The one most important action on a page (clay). One per screen.
  cta: "border-clay bg-clay text-on-clay is-hover:border-clay-dark is-hover:bg-clay-dark",
  secondary: "border-line bg-card text-ink is-hover:border-sand is-hover:bg-sand-tint",
  ghost: "border-transparent bg-transparent text-ink is-hover:bg-sand-tint",
  danger: "border-error bg-error text-on-error is-hover:border-error-dark is-hover:bg-error-dark",
};

const SIZE: Record<ButtonSize, string> = {
  md: "min-h-11 px-6 py-2 text-base",
  sm: "min-h-10 px-4 py-2 text-sm",
};

/** Classes for a button, also for links that look like buttons. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cx(
    "inline-flex select-none items-center justify-center gap-2 rounded-full border font-semibold whitespace-nowrap",
    "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
    "aria-busy:cursor-progress",
    motion,
    press,
    VARIANT[variant],
    SIZE[size],
    className,
  );
}

/** Text fields, text areas and selects. */
export const fieldClasses = cx(
  "w-full min-h-11 rounded-field border border-line bg-card px-4 py-2 text-base text-ink",
  "placeholder:text-muted is-hover:border-sand focus-visible:border-olive",
  "disabled:cursor-not-allowed disabled:bg-paper disabled:text-muted",
  "aria-invalid:border-error",
  motion,
);
