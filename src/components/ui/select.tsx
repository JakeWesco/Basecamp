import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { describedBy, Field } from "./field";
import { cx, fieldClasses } from "./styles";

type Option = { value: string; label: string; disabled?: boolean };

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: ReactNode;
  options: Option[];
  hint?: ReactNode;
  error?: ReactNode;
  /** Shown first with an empty value, e.g. "Choose a region". */
  placeholder?: string;
};

export function Select({ label, options, hint, error, placeholder, id, className, ...rest }: Props) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <Field id={selectId} label={label} hint={hint} error={error}>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(selectId, hint, error)}
          className={cx(fieldClasses, "cursor-pointer appearance-none pr-11", className)}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </div>
    </Field>
  );
}
