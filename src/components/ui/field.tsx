import type { ReactNode } from "react";
import { WarningCircle } from "./icons";

/** Label, help text and inline error around a form control. Ids come from the control. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: ReactNode;
  /** Help text under the control. Hidden while there is an error. */
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      <FieldMessage id={id} hint={hint} error={error} />
    </div>
  );
}

export function FieldMessage({ id, hint, error }: { id: string; hint?: ReactNode; error?: ReactNode }) {
  if (error)
    return (
      <p id={`${id}-error`} className="flex items-start gap-2 text-sm font-medium text-error">
        <WarningCircle aria-hidden="true" className="mt-1 size-4 shrink-0" />
        <span>{error}</span>
      </p>
    );
  if (hint)
    return (
      <p id={`${id}-hint`} className="text-sm text-muted">
        {hint}
      </p>
    );
  return null;
}

export function describedBy(id: string, hint?: ReactNode, error?: ReactNode) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}
