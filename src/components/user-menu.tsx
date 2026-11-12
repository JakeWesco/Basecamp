"use client";

import { useState } from "react";
import { signOut } from "@/app/login/actions";
import { Button, Dialog, cx, motion, press } from "@/components/ui";
import { SignOut, UserCircle } from "@/components/ui/icons";
import { ThemeSwitch } from "./theme-switch";

/**
 * The signed-in user's menu: who they are, light or dark, and sign out.
 * "full" is the sidebar row on desktop; "compact" is a 44px button for top bars.
 */
export function UserMenu({ email, variant = "full" }: { email: string; variant?: "full" | "compact" }) {
  const [open, setOpen] = useState(false);
  const initial = email.slice(0, 1).toUpperCase() || "?";

  return (
    <>
      {variant === "full" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cx(
            "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-full p-2 pr-4 text-left is-hover:bg-sand-tint",
            motion,
            press,
          )}
        >
          <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-olive text-sm font-semibold text-on-olive">
            {initial}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-xs text-muted">Signed in as</span>
            <span className="truncate text-sm font-medium text-ink">{email}</span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Account and appearance"
          className={cx("flex size-11 cursor-pointer items-center justify-center rounded-full is-hover:bg-sand-tint", motion, press)}
        >
          <UserCircle className="size-7 text-ink" />
        </button>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Your account" description={`Signed in as ${email}`}>
        <ThemeSwitch />
        <form action={signOut}>
          <Button type="submit" variant="secondary" className="w-full sm:w-auto">
            <SignOut className="size-5" />
            Sign out
          </Button>
        </form>
      </Dialog>
    </>
  );
}
