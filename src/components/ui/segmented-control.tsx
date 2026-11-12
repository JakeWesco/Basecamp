"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { FieldMessage } from "./field";
import { cx, motion, press } from "./styles";

type Option = { value: string; label: string; disabled?: boolean };

type Props = {
  label: ReactNode;
  options: Option[];
  hint?: ReactNode;
  error?: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Sent with a form. */
  name?: string;
  disabled?: boolean;
  /** Hides the label visually (screen readers still hear it). */
  hideLabel?: boolean;
};

/**
 * Pick one of a few options, e.g. "Rifle / Bow". A radio group: arrow keys
 * move between options. Fully rounded; the selected pill sits 4px inside the
 * track, so both stay fully rounded.
 */
export function SegmentedControl({
  label,
  options,
  hint,
  error,
  value,
  defaultValue,
  onValueChange,
  name,
  disabled,
  hideLabel,
}: Props) {
  const id = useId();
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value);
  const current = value ?? inner;
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function choose(v: string) {
    if (value === undefined) setInner(v);
    onValueChange?.(v);
  }

  function onKey(e: KeyboardEvent, index: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
    const at = enabled.indexOf(index);
    const next = enabled[(at + step + enabled.length) % enabled.length];
    refs.current[next]?.focus();
    choose(options[next].value);
  }

  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-label`} className={cx("text-sm font-medium text-ink", hideLabel && "sr-only")}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        aria-invalid={error ? true : undefined}
        className={cx(
          "inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border bg-sand-tint p-1",
          error ? "border-error" : "border-line",
        )}
      >
        {options.map((o, i) => {
          const selected = o.value === current;
          return (
            <button
              key={o.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              disabled={disabled || o.disabled}
              onClick={() => choose(o.value)}
              onKeyDown={(e) => onKey(e, i)}
              className={cx(
                "min-h-10 shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap",
                "disabled:cursor-not-allowed disabled:opacity-50",
                selected ? "bg-olive text-on-olive" : "text-ink is-hover:bg-card",
                motion,
                press,
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <FieldMessage id={id} hint={hint} error={error} />
      {name && <input type="hidden" name={name} value={current ?? ""} />}
    </div>
  );
}
