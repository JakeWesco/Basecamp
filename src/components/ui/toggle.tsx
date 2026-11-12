"use client";

import { useId, useState, type ReactNode } from "react";
import { FieldMessage } from "./field";
import { cx, motion, press } from "./styles";

type Props = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Controlled value. Leave out and use defaultChecked for an uncontrolled toggle. */
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Sent with a form as "on" / "off". */
  name?: string;
  disabled?: boolean;
  /** While a save runs: blocks changes and the thumb breathes. */
  loading?: boolean;
  "data-force"?: string;
};

/** An on/off switch (role="switch"), with its label clickable too. */
export function Toggle({
  label,
  hint,
  error,
  checked,
  defaultChecked = false,
  onCheckedChange,
  name,
  disabled,
  loading,
  "data-force": force,
}: Props) {
  const id = useId();
  const [inner, setInner] = useState(defaultChecked);
  const on = checked ?? inner;
  const blocked = disabled || loading;
  const described = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  function flip() {
    if (blocked) return;
    if (checked === undefined) setInner(!on);
    onCheckedChange?.(!on);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <label htmlFor={id} className={cx("text-base font-medium", blocked ? "text-muted" : "cursor-pointer text-ink")}>
          {label}
        </label>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={on}
          aria-busy={loading || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
          disabled={blocked}
          onClick={flip}
          data-force={force}
          className={cx(
            "relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border p-1",
            "disabled:cursor-not-allowed disabled:opacity-50 aria-busy:opacity-100 aria-invalid:border-error",
            on ? "border-olive bg-olive is-hover:bg-olive-dark" : "border-line bg-sand-tint is-hover:border-sand",
            motion,
            press,
          )}
        >
          <span
            aria-hidden="true"
            className={cx(
              "size-6 rounded-full bg-card shadow-sm",
              on ? "translate-x-6" : "translate-x-0",
              loading && "animate-breathe",
              motion,
            )}
          />
        </button>
      </div>
      <FieldMessage id={id} hint={hint} error={error} />
      {name && <input type="hidden" name={name} value={on ? "on" : "off"} />}
    </div>
  );
}
