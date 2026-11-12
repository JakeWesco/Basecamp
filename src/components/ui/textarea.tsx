import { useId, type ReactNode, type TextareaHTMLAttributes } from "react";
import { describedBy, Field } from "./field";
import { cx, fieldClasses } from "./styles";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  "data-force"?: string;
};

/** Multi-line text. Grows with its content where the browser supports it. */
export function Textarea({ label, hint, error, id, className, rows = 4, ...rest }: Props) {
  const autoId = useId();
  const areaId = id ?? autoId;
  return (
    <Field id={areaId} label={label} hint={hint} error={error}>
      <textarea
        id={areaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(areaId, hint, error)}
        className={cx(fieldClasses, "field-sizing-content resize-y py-3", className)}
        {...rest}
      />
    </Field>
  );
}
