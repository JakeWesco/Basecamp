"use client";

import { useActionState, useState, useTransition } from "react";
import { Button, Card, Dialog, Input, Select, Textarea, Toggle, useToast } from "@/components/ui";
import { WarningCircle } from "@/components/ui/icons";
import { BASES, BASIS_LABEL, type Basis } from "@/lib/costs";
import { keepValues, type Kept } from "@/lib/form-values";
import { formatMoney } from "@/lib/prices";
import { deleteCost, saveCost, setCostActive, type CostFormState } from "./cost-actions";

export type CostRow = { id: string; name: string; note: string | null; basis: Basis; low: number; high: number; is_active: boolean };

/** The costs hunters pay to others, shown on quotes as estimates so the total is honest. */
export function CostEstimatesCard({ costs, currency }: { costs: CostRow[]; currency: string }) {
  const toast = useToast();
  const [editing, setEditing] = useState<CostRow | "new" | null>(null);
  const [round, setRound] = useState(0);
  const [busy, start] = useTransition();
  const money = (n: number) => formatMoney(n, currency);

  function toggle(c: CostRow, on: boolean) {
    start(async () => {
      const r = await setCostActive(c.id, on);
      toast(r.ok ? { title: r.message ?? "Saved" } : { title: "Not saved", description: r.error, tone: "error" });
    });
  }

  return (
    <Card
      title="Other costs to plan for"
      description="Costs hunters pay to others, like flights, dip and pack, taxidermy, shipping and tips. Quotes show them as estimates, so the total for the whole trip is honest. Only the ones switched on appear."
      actions={
        <Button
          size="sm"
          onClick={() => {
            setRound((r) => r + 1);
            setEditing("new");
          }}
        >
          Add a cost
        </Button>
      }
    >
      {costs.length === 0 ? (
        <p className="text-muted">No other costs yet. Add the ones your hunters usually pay, like flights and shipping.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {costs.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-medium">{c.name}</span>
                <span className="tabular text-sm text-muted">
                  {money(c.low)} to {money(c.high)} {BASIS_LABEL[c.basis]}
                </span>
                {c.note && <span className="text-sm text-muted">{c.note}</span>}
              </div>
              <div className="flex items-center gap-4">
                <div className="w-48">
                  <Toggle key={`${c.id}-${c.is_active}`} label="On quotes" defaultChecked={c.is_active} loading={busy} onCheckedChange={(on) => toggle(c, on)} />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label={`Edit ${c.name}`}
                  onClick={() => {
                    setRound((r) => r + 1);
                    setEditing(c);
                  }}
                >
                  Edit
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <CostDialog
        key={round}
        editing={editing}
        currency={currency}
        onClose={() => setEditing(null)}
        onDone={(m) => {
          setEditing(null);
          if (m) toast({ title: m });
        }}
      />
    </Card>
  );
}

type State = CostFormState & { values?: Kept };

function CostDialog({
  editing,
  currency,
  onClose,
  onDone,
}: {
  editing: CostRow | "new" | null;
  currency: string;
  onClose: () => void;
  onDone: (message?: string) => void;
}) {
  const cost = editing && editing !== "new" ? editing : null;
  const [confirming, setConfirming] = useState(false);
  const [removing, startRemove] = useTransition();
  const [removeError, setRemoveError] = useState<string>();
  const [state, action, pending] = useActionState(async (prev: State, form: FormData): Promise<State> => {
    const values = keepValues(form);
    const r = await saveCost(prev, form);
    if (r.ok) onDone(r.message);
    return r.ok ? r : { ...r, values };
  }, { ok: false, errors: {} });
  const e = state.errors;
  const v = (n: string, saved: string) => state.values?.[n] ?? saved;

  return (
    <Dialog open={editing !== null} onClose={onClose} title={cost ? `Edit ${cost.name}` : "Add a cost"} description="An estimate range. Hunters see it as a guide, not a price.">
      <form action={action} noValidate className="flex flex-col gap-6">
        {cost && <input type="hidden" name="id" value={cost.id} />}
        <Input label="Name" name="name" defaultValue={v("name", cost?.name ?? "")} placeholder="Shipping trophies home" error={e.name} required />
        <Select
          label="Per"
          name="basis"
          defaultValue={v("basis", cost?.basis ?? "per_person")}
          options={BASES.map((b) => ({ value: b, label: BASIS_LABEL[b] }))}
          hint="Quotes multiply by the number of people, trophies or days."
          error={e.basis}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label={`Lowest, ${currency}`} name="low" numeric defaultValue={v("low", cost ? String(cost.low) : "")} error={e.low} required />
          <Input label={`Highest, ${currency}`} name="high" numeric defaultValue={v("high", cost ? String(cost.high) : "")} error={e.high} required />
        </div>
        <Textarea label="Note for the hunter" name="note" rows={2} defaultValue={v("note", cost?.note ?? "")} hint="Who it is paid to, or what it depends on." error={e.note} />
        {(e.form || removeError) && (
          <p role="alert" className="flex items-start gap-2 rounded-field bg-error-tint px-4 py-3 text-sm font-medium text-error">
            <WarningCircle className="mt-1 size-4 shrink-0" />
            {e.form ?? removeError}
          </p>
        )}
        {cost && confirming && (
          <div className="flex flex-col gap-3 rounded-inner border border-error bg-error-tint p-4">
            <p className="text-sm font-medium text-error">Remove {cost.name}? It disappears from every quote.</p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="danger"
                size="sm"
                loading={removing}
                loadingLabel="Removing…"
                onClick={() =>
                  startRemove(async () => {
                    const r = await deleteCost(cost.id);
                    if (r.ok) onDone(r.message);
                    else setRemoveError(r.error);
                  })
                }
              >
                Yes, remove it
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Keep it
              </Button>
            </div>
          </div>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          {cost && !confirming && (
            <Button variant="ghost" className="text-error! sm:mr-auto" onClick={() => setConfirming(true)}>
              Remove
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className={cost ? "" : "sm:ml-auto"}>
            Cancel
          </Button>
          <Button type="submit" loading={pending} loadingLabel="Saving…">
            {cost ? "Save" : "Add cost"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
