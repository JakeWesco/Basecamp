"use client";

import { useId, useState, type ReactNode } from "react";
import { Spinner } from "./spinner";
import { cx, motion, press } from "./styles";

type Props = {
  label: ReactNode;
  description?: ReactNode;
  /** Controlled value. Leave out and use defaultChecked for an uncontrolled toggle. */
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Sent with a form as "on" / "off". */
  name?: string;
  disabled?: boolean;
  loading?: boolean;
};

/** An on/off switch (role="switch"), with its label clickable too. */
export function Toggle({
  label,
  description,
  checked,
  defaultChecked = false,
  onCheckedChange,
  name,
  disabled,
  loading,
}: Props) {
  const id = useId();
  const [inner, setInner] = useState(defaultChecked);
  const on = checked ?? inner;
  const blocked = disabled || loading;

  function flip() {
    if (blocked) return;
    if (checked === undefined) setInner(!on);
    onCheckedChange?.(!on);
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col">
        <label htmlFor={id} className={cx("text-base font-medium text-ink", !blocked && "cursor-pointer")}>
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="text-sm text-muted">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={on}
        aria-busy={loading || undefined}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={blocked}
        onClick={flip}
        className={cx(
          "group relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border p-1",
          "disabled:cursor-not-allowed disabled:opacity-55",
          on ? "border-olive bg-olive hover:bg-olive-dark" : "border-line bg-sand-tint hover:border-sand",
          motion,
          press,
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            "flex size-6 items-center justify-center rounded-full bg-card text-olive shadow-sm",
            on ? "translate-x-6" : "translate-x-0",
            motion,
          )}
        >
          {loading && <Spinner className="size-3" />}
        </span>
      </button>
      {name && <input type="hidden" name={name} value={on ? "on" : "off"} />}
    </div>
  );
}
