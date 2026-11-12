import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { describedBy, Field } from "./field";
import { cx, fieldClasses } from "./styles";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Right-aligned tabular figures, for prices and amounts. */
  numeric?: boolean;
};

export function Input({ label, hint, error, numeric, id, className, ...rest }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field id={inputId} label={label} hint={hint} error={error}>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, hint, error)}
        inputMode={numeric ? "decimal" : undefined}
        className={cx(fieldClasses, numeric && "tabular text-right", className)}
        {...rest}
      />
    </Field>
  );
}
