"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import { WarningCircle } from "@/components/ui/icons";
import { signIn, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, { error: null });

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="next" value={next} />
      <Input label="Email" name="email" type="email" autoComplete="email" required />
      <Input label="Password" name="password" type="password" autoComplete="current-password" required />
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-field bg-error-tint px-4 py-3 text-sm font-medium text-error">
          <WarningCircle className="mt-1 size-4 shrink-0" />
          {state.error}
        </p>
      )}
      <Button type="submit" variant="cta" loading={pending} loadingLabel="Signing in…">
        Sign in
      </Button>
    </form>
  );
}
