/** Joins class names, skipping empty ones. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Shared interaction styles. Every transition uses the Basecamp ease
 * (cubic-bezier(0.32,0.72,0,1)); pressing scales to 0.98. The focus ring comes
 * from :focus-visible in globals.css. Reduced motion turns movement off.
 */
export const motion = "transition-all duration-600 ease-basecamp";
export const press = "motion-press active:scale-[0.98]";

export type ButtonVariant = "cta" | "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

const VARIANT: Record<ButtonVariant, string> = {
  // The one main call to action on a screen (clay). Use sparingly.
  cta: "border-clay bg-clay text-on-dark hover:border-clay-dark hover:bg-clay-dark hover:-translate-y-0.5",
  primary: "border-olive bg-olive text-on-dark hover:border-olive-dark hover:bg-olive-dark hover:-translate-y-0.5",
  secondary: "border-sand-tint bg-sand-tint text-olive-dark hover:border-sand hover:bg-sand hover:text-ink",
  ghost: "border-line bg-transparent text-ink hover:bg-card",
  danger: "border-danger bg-danger text-on-dark hover:border-danger-dark hover:bg-danger-dark",
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
    "inline-flex select-none items-center justify-center gap-2 rounded-full border font-semibold",
    "cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0",
    "aria-busy:cursor-progress",
    motion,
    press,
    VARIANT[variant],
    SIZE[size],
    className,
  );
}

/** Text fields and selects. */
export const fieldClasses = cx(
  "w-full min-h-11 rounded-field border border-line bg-card px-4 py-2 text-base text-ink",
  "placeholder:text-muted hover:border-sand focus-visible:border-olive",
  "disabled:cursor-not-allowed disabled:bg-paper disabled:text-muted",
  "aria-invalid:border-danger",
  motion,
);
