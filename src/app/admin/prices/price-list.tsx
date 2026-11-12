"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  Input,
  SegmentedControl,
  Select,
  Table,
  Toggle,
  useToast,
  type Column,
} from "@/components/ui";
import { Tag, WarningCircle } from "@/components/ui/icons";
import { feeLabel, formatMoney, rateLabel, UNIT_LABEL, UNITS, type Rate, type RatePriceType, type SpeciesFee } from "@/lib/prices";
import { deleteRate, deleteSpecies, saveRate, saveSpeciesFee, type FormState } from "./actions";

type Props = { rates: Rate[]; fees: SpeciesFee[]; currency: string; season: string };

const EMPTY: FormState = { ok: false, errors: {} };

export function PriceList({ rates, fees, currency, season }: Props) {
  const [tab, setTab] = useState<"fees" | "rates">("fees");
  const [query, setQuery] = useState("");
  const [editingRate, setEditingRate] = useState<Rate | "new" | null>(null);
  const [editingFee, setEditingFee] = useState<SpeciesFee | "new" | null>(null);
  const [formKey, setFormKey] = useState(0);
  const toast = useToast();

  const shownFees = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? fees.filter((f) => f.name.toLowerCase().includes(q)) : fees;
  }, [fees, query]);

  function openRate(rate: Rate | "new") {
    setFormKey((k) => k + 1);
    setEditingRate(rate);
  }
  function openFee(fee: SpeciesFee | "new") {
    setFormKey((k) => k + 1);
    setEditingFee(fee);
  }
  function done(message?: string) {
    setEditingRate(null);
    setEditingFee(null);
    if (message) toast({ title: message });
  }

  const feeColumns: Column<SpeciesFee>[] = [
    { key: "name", header: "Species", primary: true, cell: (f) => f.name },
    {
      key: "shown",
      header: "Hunters see it",
      cell: (f) => (f.isPublished ? <Badge tone="success">Shown</Badge> : <Badge>Hidden</Badge>),
    },
    {
      key: "fee",
      header: "Trophy fee",
      numeric: true,
      cell: (f) => (f.feeId && !f.onRequest ? feeLabel(f, currency) : <span className="text-muted">{feeLabel(f, currency)}</span>),
    },
    {
      key: "edit",
      header: "Edit",
      cell: (f) => (
        <Button variant="secondary" size="sm" onClick={() => openFee(f)} aria-label={`Edit ${f.name}`}>
          Edit
        </Button>
      ),
    },
  ];

  const rateColumns: Column<Rate>[] = [
    { key: "name", header: "Rate", primary: true, cell: (r) => r.name },
    { key: "unit", header: "Charged", cell: (r) => UNIT_LABEL[r.unit] },
    {
      key: "price",
      header: "Price",
      numeric: true,
      cell: (r) => (r.price_type === "fixed" ? formatMoney(r.amount ?? 0, currency) : <span className="text-muted">{rateLabel(r, currency)}</span>),
    },
    {
      key: "edit",
      header: "Edit",
      cell: (r) => (
        <Button variant="secondary" size="sm" onClick={() => openRate(r)} aria-label={`Edit ${r.name}`}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SegmentedControl
          label="Show"
          hideLabel
          value={tab}
          onValueChange={(v) => setTab(v as "fees" | "rates")}
          options={[
            { value: "fees", label: `Trophy fees (${fees.length})` },
            { value: "rates", label: `Daily rates (${rates.length})` },
          ]}
        />
        {tab === "fees" ? (
          <Button onClick={() => openFee("new")}>Add a species</Button>
        ) : (
          <Button onClick={() => openRate("new")}>Add a rate</Button>
        )}
      </div>

      {tab === "fees" ? (
        <>
          {fees.length > 0 && (
            <div className="max-w-sm">
              <Input
                label="Find a species"
                type="search"
                placeholder="Kudu, impala, buffalo"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
          <Table
            columns={feeColumns}
            rows={shownFees}
            rowKey={(f) => f.speciesId}
            caption={`Trophy fees for ${season}`}
            empty={
              fees.length === 0 ? (
                <EmptyState
                  icon={<Tag />}
                  title="No species yet. Add each animal you hunt and its trophy fee for this season."
                  action={<Button onClick={() => openFee("new")}>Add the first species</Button>}
                />
              ) : (
                <p className="text-muted">No species match &ldquo;{query}&rdquo;. Check the spelling or clear the search.</p>
              )
            }
          />
        </>
      ) : (
        <Table
          columns={rateColumns}
          rows={rates}
          rowKey={(r) => r.id}
          caption={`Daily rates and extras for ${season}`}
          empty={
            <EmptyState
              icon={<Tag />}
              title="No daily rates yet. Add what a hunter pays per day, plus extras like observers or rifle hire."
              action={<Button onClick={() => openRate("new")}>Add the first rate</Button>}
            />
          }
        />
      )}

      <RateDialog key={`rate-${formKey}`} editing={editingRate} currency={currency} onClose={() => setEditingRate(null)} onDone={done} />
      <FeeDialog key={`fee-${formKey}`} editing={editingFee} currency={currency} onClose={() => setEditingFee(null)} onDone={done} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-field bg-error-tint px-4 py-3 text-sm font-medium text-error">
      <WarningCircle className="mt-1 size-4 shrink-0" />
      {message}
    </p>
  );
}

function ConfirmRemove({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-4 rounded-inner border border-error bg-error-tint p-4">
      <p className="text-sm font-medium text-error">Remove {name} from the price list? This can&apos;t be undone.</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="danger" size="sm" loading={pending} loadingLabel="Removing…" onClick={() => start(onConfirm)}>
          Yes, remove it
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Keep it
        </Button>
      </div>
    </div>
  );
}

function RateDialog({
  editing,
  currency,
  onClose,
  onDone,
}: {
  editing: Rate | "new" | null;
  currency: string;
  onClose: () => void;
  onDone: (message?: string) => void;
}) {
  const rate = editing && editing !== "new" ? editing : null;
  const [priceType, setPriceType] = useState<RatePriceType>(rate?.price_type ?? "fixed");
  const [confirming, setConfirming] = useState(false);
  const [removeError, setRemoveError] = useState<string>();
  const [state, action, pending] = useActionState(async (prev: FormState, form: FormData) => {
    const result = await saveRate(prev, form);
    if (result.ok) onDone(result.message);
    return result;
  }, EMPTY);

  return (
    <Dialog
      open={editing !== null}
      onClose={onClose}
      title={rate ? "Edit rate" : "Add a rate"}
      description="What the hunter pays per day, per trip or per item."
    >
      <form action={action} className="flex flex-col gap-6">
        {rate && <input type="hidden" name="id" value={rate.id} />}
        <Input label="Name" name="name" defaultValue={rate?.name} placeholder="Observer" error={state.errors.name} required />
        <Select
          label="Charged"
          name="unit"
          defaultValue={rate?.unit ?? "per_day"}
          options={UNITS.map((u) => ({ value: u, label: UNIT_LABEL[u] }))}
          error={state.errors.unit}
        />
        <SegmentedControl
          label="Price"
          name="priceType"
          value={priceType}
          onValueChange={(v) => setPriceType(v as RatePriceType)}
          options={[
            { value: "fixed", label: "Fixed" },
            { value: "cost_price", label: "At cost" },
            { value: "on_request", label: "On request" },
          ]}
          error={state.errors.priceType}
        />
        {priceType === "fixed" && (
          <Input
            label={`Amount in ${currency}`}
            name="amount"
            numeric
            defaultValue={rate?.amount != null ? String(rate.amount) : ""}
            placeholder="0"
            error={state.errors.amount}
            required
          />
        )}
        <FormError message={state.errors.form ?? removeError} />
        {rate && confirming && (
          <ConfirmRemove
            name={rate.name}
            onCancel={() => setConfirming(false)}
            onConfirm={async () => {
              const r = await deleteRate(rate.id);
              if (r.ok) onDone(r.message);
              else setRemoveError(r.errors.form);
            }}
          />
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          {rate && !confirming && (
            <Button variant="ghost" className="text-error! sm:mr-auto" onClick={() => setConfirming(true)}>
              Remove
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className={rate ? "" : "sm:ml-auto"}>
            Cancel
          </Button>
          <Button type="submit" loading={pending} loadingLabel="Saving…">
            {rate ? "Save" : "Add rate"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function FeeDialog({
  editing,
  currency,
  onClose,
  onDone,
}: {
  editing: SpeciesFee | "new" | null;
  currency: string;
  onClose: () => void;
  onDone: (message?: string) => void;
}) {
  const fee = editing && editing !== "new" ? editing : null;
  const [priceType, setPriceType] = useState<"fixed" | "on_request">(fee?.onRequest ? "on_request" : "fixed");
  const [confirming, setConfirming] = useState(false);
  const [removeError, setRemoveError] = useState<string>();
  const [state, action, pending] = useActionState(async (prev: FormState, form: FormData) => {
    const result = await saveSpeciesFee(prev, form);
    if (result.ok) onDone(result.message);
    return result;
  }, EMPTY);

  return (
    <Dialog
      open={editing !== null}
      onClose={onClose}
      title={fee ? `Edit ${fee.name}` : "Add a species"}
      description="The trophy fee for this season. Hunters only see species that are shown."
    >
      <form action={action} className="flex flex-col gap-6">
        {fee && <input type="hidden" name="speciesId" value={fee.speciesId} />}
        <Input label="Species" name="name" defaultValue={fee?.name} placeholder="Kudu" error={state.errors.name} required />
        <SegmentedControl
          label="Trophy fee"
          name="priceType"
          value={priceType}
          onValueChange={(v) => setPriceType(v as "fixed" | "on_request")}
          options={[
            { value: "fixed", label: "Fixed fee" },
            { value: "on_request", label: "Price on request" },
          ]}
          error={state.errors.priceType}
        />
        {priceType === "fixed" && (
          <Input
            label={`Amount in ${currency}`}
            name="amount"
            numeric
            defaultValue={fee?.amount != null ? String(fee.amount) : ""}
            placeholder="0"
            error={state.errors.amount}
            required
          />
        )}
        <Toggle
          label="Show to hunters"
          hint="Hidden species stay on your list but don't appear on the client side."
          name="published"
          defaultChecked={fee?.isPublished ?? true}
        />
        <FormError message={state.errors.form ?? removeError} />
        {fee && confirming && (
          <ConfirmRemove
            name={fee.name}
            onCancel={() => setConfirming(false)}
            onConfirm={async () => {
              const r = await deleteSpecies(fee.speciesId);
              if (r.ok) onDone(r.message);
              else setRemoveError(r.errors.form);
            }}
          />
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          {fee && !confirming && (
            <Button variant="ghost" className="text-error! sm:mr-auto" onClick={() => setConfirming(true)}>
              Remove
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className={fee ? "" : "sm:ml-auto"}>
            Cancel
          </Button>
          <Button type="submit" loading={pending} loadingLabel="Saving…">
            {fee ? "Save" : "Add species"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
