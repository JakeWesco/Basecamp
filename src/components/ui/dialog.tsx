"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "./icons";
import { cx, motion, press } from "./styles";

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons along the bottom, e.g. Cancel and Save. */
  footer?: ReactNode;
};

/**
 * A modal dialog: centred card on wider screens, a bottom sheet on phones
 * (below 640px). Built on the native <dialog>, so focus stays inside, Escape
 * closes it and the page behind can't be clicked. Clicking the backdrop closes it.
 */
export function Dialog({ open, onClose, title, description, children, footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cx(
        // Phone: bottom sheet, full width, rounded top corners.
        "fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto",
        "rounded-t-card border border-b-0 border-line bg-card p-0 text-ink",
        "translate-y-full opacity-100 open:translate-y-0 starting:open:translate-y-full",
        // 640px and up: centred card.
        "sm:inset-0 sm:m-auto sm:h-fit sm:max-w-lg sm:rounded-card sm:border-b",
        "sm:translate-y-4 sm:opacity-0 sm:open:translate-y-0 sm:open:opacity-100 sm:starting:open:translate-y-4 sm:starting:open:opacity-0",
        "backdrop:bg-ink/40 backdrop:opacity-0 open:backdrop:opacity-100 starting:open:backdrop:opacity-0",
        "backdrop:transition-all backdrop:duration-600 backdrop:ease-basecamp",
        "transition-all transition-discrete duration-600 ease-basecamp",
      )}
    >
      <div className="flex flex-col gap-6 p-6 pb-[max(24px,env(safe-area-inset-bottom))]">
        <span aria-hidden="true" className="mx-auto -mt-2 h-1 w-12 rounded-full bg-line sm:hidden" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 id={titleId} className="text-2xl">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cx(
              "-m-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted is-hover:bg-sand-tint",
              motion,
              press,
            )}
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
        {footer && <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </dialog>
  );
}
