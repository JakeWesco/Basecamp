import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { describedBy, FieldMessage } from "./field";
import { Check } from "./icons";
import { cx, motion, press } from "./styles";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  "data-force"?: string;
};

/** A real checkbox (works in forms without JavaScript), drawn in Basecamp style. */
export function Checkbox({ label, hint, error, id, className, disabled, "data-force": force, ...rest }: Props) {
  const autoId = useId();
  const boxId = id ?? autoId;
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <label
        htmlFor={boxId}
        className={cx("group flex min-h-11 items-center gap-4", disabled ? "cursor-not-allowed" : "cursor-pointer")}
      >
        <span className="relative flex size-6 shrink-0 items-center justify-center">
          <input
            id={boxId}
            type="checkbox"
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(boxId, hint, error)}
            data-force={force}
            className={cx(
              "peer size-6 cursor-pointer appearance-none rounded-md border border-line bg-card",
              "is-hover:border-sand checked:border-olive checked:bg-olive is-hover:checked:bg-olive-dark",
              "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error",
              motion,
              press,
            )}
            {...rest}
          />
          <Check
            className={cx("pointer-events-none absolute size-4 text-on-olive opacity-0 peer-checked:opacity-100", motion)}
          />
        </span>
        <span className={cx("text-base text-ink", disabled && "text-muted")}>{label}</span>
      </label>
      <div className="pl-10">
        <FieldMessage id={boxId} hint={hint} error={error} />
      </div>
    </div>
  );
}
