"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle, WarningCircle, X } from "./icons";
import { cx, motion, press } from "./styles";

type Tone = "success" | "error";
type ToastInput = { title: string; description?: string; tone?: Tone };
type Item = ToastInput & { id: number; leaving: boolean };

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

const SHOW_MS = 5000;
const ERROR_SHOW_MS = 8000;
const LEAVE_MS = 600;

/** Wraps the app once (in the root layout). Use useToast() to show one. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((all) => all.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setItems((all) => all.filter((t) => t.id !== id)), LEAVE_MS);
  }, []);

  const show = useCallback(
    (t: ToastInput) => {
      const id = nextId.current++;
      setItems((all) => [...all.slice(-2), { ...t, id, leaving: false }]);
      setTimeout(() => dismiss(id), t.tone === "error" ? ERROR_SHOW_MS : SHOW_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Above the phone tab bar, bottom centre on wider screens. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6">
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: Item; onDismiss: () => void }) {
  // Start below and transparent, then slide in on the next frame.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const visible = entered && !item.leaving;
  const error = item.tone === "error";
  const Icon = error ? WarningCircle : CheckCircle;

  return (
    <div
      role={error ? "alert" : "status"}
      className={cx(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border bg-card p-4 text-ink shadow-lg",
        error ? "border-error" : "border-line",
        motion,
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      )}
    >
      <span
        className={cx(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          error ? "bg-error-tint text-error" : "bg-success-tint text-success",
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="flex flex-1 flex-col gap-1 pt-1">
        <p className="font-semibold">{item.title}</p>
        {item.description && <p className="text-sm text-muted">{item.description}</p>}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close"
        className={cx("-m-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted is-hover:bg-sand-tint", motion, press)}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

/** Returns toast({ title, description?, tone? }); tone is "success" (default) or "error". */
export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>");
  return show;
}
