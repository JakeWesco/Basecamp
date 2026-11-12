"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cx, motion, press } from "./styles";

type Tone = "success" | "error" | "info";
type ToastInput = { title: string; description?: string; tone?: Tone };
type Item = ToastInput & { id: number; leaving: boolean };

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

const SHOW_MS = 5000;
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
      setTimeout(() => dismiss(id), SHOW_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:bottom-4">
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
  const tone = item.tone ?? "info";

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-inner border bg-ink p-4 text-on-dark shadow-lg",
        tone === "error" ? "border-danger" : "border-ink",
        motion,
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "mt-1.5 size-2 shrink-0 rounded-full",
          tone === "success" && "bg-sand",
          tone === "error" && "bg-danger",
          tone === "info" && "bg-sand-tint",
        )}
      />
      <div className="flex flex-1 flex-col gap-1">
        <p className="font-semibold">{item.title}</p>
        {item.description && <p className="text-sm opacity-80">{item.description}</p>}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className={cx("-m-1 flex size-8 items-center justify-center rounded-full hover:bg-olive-dark", motion, press)}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  );
}

/** Returns toast({ title, description?, tone? }). */
export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>");
  return show;
}
