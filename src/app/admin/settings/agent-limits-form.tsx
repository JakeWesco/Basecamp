"use client";

import { useActionState } from "react";
import { Button, Card, Checkbox, Input, useToast } from "@/components/ui";
import { WarningCircle } from "@/components/ui/icons";
import { saveAgentLimits, type LimitsState } from "./actions";

type State = LimitsState & { maxDiscount?: string; free?: string[] };

type Props = { maxDiscount: number; rates: { id: string; name: string; free: boolean }[] };

/** The limits agents work within when they build a quote. */
export function AgentLimitsForm({ maxDiscount, rates }: Props) {
  const toast = useToast();
  const [state, action, pending] = useActionState(async (prev: State, form: FormData): Promise<State> => {
    // Keep what was entered, so an error never wipes the form.
    const kept = { maxDiscount: String(form.get("maxDiscount") ?? ""), free: form.getAll("freeRate").map(String) };
    const result = await saveAgentLimits(prev, form);
    if (result.ok && result.message) toast({ title: result.message });
    return { ...result, ...kept };
  }, { ok: false } as State);

  return (
    <Card
      title="Agent limits"
      description="Agents quote from your price list and can't change prices. Here you choose how much room they have."
    >
      <form action={action} noValidate className="flex flex-col gap-8">
        <div className="max-w-xs">
          <Input
            label="Highest discount an agent can give"
            name="maxDiscount"
            numeric
            defaultValue={state.maxDiscount ?? String(maxDiscount)}
            hint="In percent. 0 means agents can't give a discount."
            error={state.error && state.error.includes("discount") ? state.error : undefined}
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-ink">Extras agents can give free</legend>
          <p className="mb-2 text-sm text-muted">Agents can only make these free on a quote. Every freebie records who gave it.</p>
          {rates.length === 0 ? (
            <p className="text-muted">Add daily rates and extras on the Prices page first.</p>
          ) : (
            rates.map((r) => <Checkbox key={r.id} label={r.name} name="freeRate" value={r.id} defaultChecked={state.free ? state.free.includes(r.id) : r.free} />)
          )}
        </fieldset>

        {state.error && !state.error.includes("discount") && (
          <p role="alert" className="flex items-start gap-2 rounded-field bg-error-tint px-4 py-3 text-sm font-medium text-error">
            <WarningCircle className="mt-1 size-4 shrink-0" />
            {state.error}
          </p>
        )}
        <div>
          <Button type="submit" loading={pending} loadingLabel="Saving…">
            Save limits
          </Button>
        </div>
      </form>
    </Card>
  );
}
