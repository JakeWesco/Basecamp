"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Badge, Button, Card, Checkbox, Dialog, Input, SectionHeading, Select, cx, useToast } from "@/components/ui";
import { WarningCircle, X } from "@/components/ui/icons";
import { formatMoney, UNIT_LABEL } from "@/lib/prices";
import { addLine, deleteQuote, removeLine, setDiscount, setStatus, updateLine, type ActionResult } from "@/lib/quote-actions";
import { defaultQuantity, lineTotal, quoteTotals, type QuoteLine } from "@/lib/quotes";
import type { QuoteContext } from "@/lib/quote-data";
import { QuoteDetailsForm } from "./quote-details-form";

/** Build a quote from the price list. Prices come from the list; the database enforces the limits. */
export function QuoteBuilder(ctx: QuoteContext) {
  const { quote, lines, area, isAdmin, maxDiscount } = ctx;
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [busy, start] = useTransition();
  const money = (n: number) => formatMoney(n, quote.currency);
  const totals = quoteTotals(lines, quote.discount_percent);

  function run(action: () => Promise<ActionResult>) {
    start(async () => {
      const r = await action();
      if (!r.ok) toast({ title: "Not saved", description: r.error, tone: "error" });
      else if (r.message) toast({ title: r.message });
    });
  }

  const rateLines = lines.filter((l) => l.kind !== "trophy_fee");
  const feeLines = lines.filter((l) => l.kind === "trophy_fee");
  const freeAllowed = (l: QuoteLine) =>
    isAdmin || (l.kind === "rate" && ctx.rates.some((r) => r.id === l.rate_id && r.agent_can_give_free));
  const givenBy = (id: string | null) => (id === ctx.userId ? "you" : "a team member");
  const trip = [
    `${quote.hunting_days} hunting days`,
    `${quote.hunters} ${quote.hunters === 1 ? "hunter" : "hunters"}`,
    quote.observers ? `${quote.observers} ${quote.observers === 1 ? "observer" : "observers"}` : null,
    quote.arrival_date ? `arriving ${new Date(quote.arrival_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col gap-8">
      <SectionHeading
        level={1}
        eyebrow={`Quote, ${quote.season} season`}
        title={quote.hunter_name}
        description={trip}
        actions={
          <>
            {quote.status === "sent" ? <Badge status="Quoted">Sent</Badge> : <Badge>Draft</Badge>}
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Edit details
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <LinesCard
            title="Daily rates and extras"
            empty="Add the daily rate first, then extras like observers or rifle hire."
            lines={rateLines}
            money={money}
            freeAllowed={freeAllowed}
            givenBy={givenBy}
            busy={busy}
            onQuantity={(l, q) => run(() => updateLine(area, quote.id, l.id, { quantity: q }))}
            onFree={(l, free) => run(() => updateLine(area, quote.id, l.id, { isFree: free }))}
            onRemove={(l) => run(() => removeLine(area, quote.id, l.id))}
            picker={
              <AddPicker
                label="Add a rate or extra"
                options={ctx.rates.map((r) => ({
                  value: r.id,
                  label: `${r.name}, ${r.price_type === "fixed" ? `${money(r.amount ?? 0)} ${UNIT_LABEL[r.unit]}` : r.price_type === "cost_price" ? "at cost" : "on request"}`,
                }))}
                quantityFor={(id) => {
                  const r = ctx.rates.find((x) => x.id === id);
                  return r ? defaultQuantity(r.unit, quote) : 1;
                }}
                hint={`Per day rates start at days times hunters (${quote.hunting_days * quote.hunters}). Change it to fit.`}
                busy={busy}
                onAdd={(id, quantity) => run(() => addLine(area, quote.id, { kind: "rate", rateId: id, quantity }))}
              />
            }
          />

          <LinesCard
            title="Trophy fees"
            empty="Add the animals the hunter wants. Fees come from your price list."
            lines={feeLines}
            money={money}
            freeAllowed={freeAllowed}
            givenBy={givenBy}
            busy={busy}
            onQuantity={(l, q) => run(() => updateLine(area, quote.id, l.id, { quantity: q }))}
            onFree={(l, free) => run(() => updateLine(area, quote.id, l.id, { isFree: free }))}
            onRemove={(l) => run(() => removeLine(area, quote.id, l.id))}
            picker={
              <AddPicker
                label="Add an animal"
                options={ctx.fees.map((f) => ({
                  value: f.speciesId,
                  label: `${f.name}, ${f.onRequest ? "on request" : money(f.amount ?? 0)}`,
                }))}
                quantityFor={() => 1}
                busy={busy}
                onAdd={(id, quantity) => run(() => addLine(area, quote.id, { kind: "trophy_fee", speciesId: id, quantity }))}
              />
            }
          />
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
          <Card title="Total">
            <dl className="tabular flex flex-col gap-3">
              <Row label="Subtotal" value={money(totals.subtotal)} />
              <DiscountRow
                key={quote.discount_percent}
                percent={quote.discount_percent}
                amount={totals.discount}
                money={money}
                limit={isAdmin ? null : maxDiscount}
                givenBy={quote.discount_given_by ? givenBy(quote.discount_given_by) : null}
                busy={busy}
                onSave={(v) => run(() => setDiscount(area, quote.id, v))}
              />
              {totals.freeValue > 0 && <Row label="Free extras" value={`${money(totals.freeValue)} off`} muted />}
              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                <dt className="font-semibold">Total</dt>
                <dd className="text-3xl font-semibold">{money(totals.total)}</dd>
              </div>
              {(totals.onRequest > 0 || totals.atCost > 0) && (
                <p className="text-sm text-muted">
                  {[
                    totals.onRequest ? `${totals.onRequest} ${totals.onRequest === 1 ? "item" : "items"} on request` : null,
                    totals.atCost ? `${totals.atCost} at cost` : null,
                  ]
                    .filter(Boolean)
                    .join(" and ")}{" "}
                  not included.
                </p>
              )}
            </dl>
          </Card>

          <Card>
            <div className="flex flex-col gap-3">
              {quote.status === "draft" ? (
                <Button variant="cta" loading={busy} loadingLabel="Saving…" onClick={() => run(() => setStatus(area, quote.id, "sent"))}>
                  Mark as sent
                </Button>
              ) : (
                <Button variant="secondary" loading={busy} loadingLabel="Saving…" onClick={() => run(() => setStatus(area, quote.id, "draft"))}>
                  Back to draft
                </Button>
              )}
              <p className="text-sm text-muted">The share link and brochure come next. For now, mark it as sent once the hunter has it.</p>
              <DeleteQuote onDelete={() => run(() => deleteQuote(area, quote.id))} busy={busy} />
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={editing} onClose={() => setEditing(false)} title="Hunter and trip">
        {editing && (
          <QuoteDetailsForm
            area={area}
            quote={quote}
            onCancel={() => setEditing(false)}
            onSaved={(m) => {
              setEditing(false);
              if (m) toast({ title: m });
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={cx("font-medium", muted && "text-muted")}>{value}</dd>
    </div>
  );
}

function DiscountRow({
  percent,
  amount,
  money,
  limit,
  givenBy,
  busy,
  onSave,
}: {
  percent: number;
  amount: number;
  money: (n: number) => string;
  limit: number | null;
  givenBy: string | null;
  busy: boolean;
  onSave: (v: string) => void;
}) {
  const [value, setValue] = useState(percent ? String(percent) : "");
  const changed = (Number(value) || 0) !== percent;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Input
            label="Discount, percent"
            numeric
            value={value}
            placeholder="0"
            onChange={(e) => setValue(e.target.value)}
            hint={limit === null ? undefined : limit > 0 ? `You can give up to ${limit}%.` : "Ask an admin for a discount."}
          />
        </div>
        {changed && (
          <Button size="sm" className="mb-1" onClick={() => onSave(value)} disabled={busy}>
            Apply
          </Button>
        )}
      </div>
      {percent > 0 && (
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">Discount {percent}%{givenBy ? `, given by ${givenBy}` : ""}</dt>
          <dd className="font-medium">{money(-amount)}</dd>
        </div>
      )}
    </div>
  );
}

function LinesCard({
  title,
  empty,
  lines,
  money,
  freeAllowed,
  givenBy,
  busy,
  onQuantity,
  onFree,
  onRemove,
  picker,
}: {
  title: string;
  empty: string;
  lines: QuoteLine[];
  money: (n: number) => string;
  freeAllowed: (l: QuoteLine) => boolean;
  givenBy: (id: string | null) => string;
  busy: boolean;
  onQuantity: (l: QuoteLine, q: string) => void;
  onFree: (l: QuoteLine, free: boolean) => void;
  onRemove: (l: QuoteLine) => void;
  picker: ReactNode;
}) {
  return (
    <Card title={title}>
      <div className="flex flex-col gap-6">
        {lines.length === 0 ? (
          <p className="text-muted">{empty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {lines.map((l) => (
              <LineRow
                key={`${l.id}-${l.quantity}-${l.is_free}`}
                line={l}
                money={money}
                canFree={freeAllowed(l)}
                givenBy={givenBy}
                busy={busy}
                onQuantity={(q) => onQuantity(l, q)}
                onFree={(f) => onFree(l, f)}
                onRemove={() => onRemove(l)}
              />
            ))}
          </ul>
        )}
        {picker}
      </div>
    </Card>
  );
}

function LineRow({
  line,
  money,
  canFree,
  givenBy,
  busy,
  onQuantity,
  onFree,
  onRemove,
}: {
  line: QuoteLine;
  money: (n: number) => string;
  canFree: boolean;
  givenBy: (id: string | null) => string;
  busy: boolean;
  onQuantity: (q: string) => void;
  onFree: (free: boolean) => void;
  onRemove: () => void;
}) {
  const [qty, setQty] = useState(String(line.quantity));
  const price =
    line.price_type === "fixed" ? `${money(line.unit_price ?? 0)} ${UNIT_LABEL[line.unit]}` : line.price_type === "cost_price" ? "At cost" : "On request";
  const total = line.price_type !== "fixed" ? "Not included" : line.is_free ? "Free" : money(lineTotal(line));

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-medium">{line.description}</span>
        <span className="text-sm text-muted">{price}</span>
        {line.is_free && line.free_given_by && <span className="text-sm text-success">Free, given by {givenBy(line.free_given_by)}</span>}
      </div>
      <div className="flex items-center gap-3">
        <label className="sr-only" htmlFor={`qty-${line.id}`}>
          Quantity for {line.description}
        </label>
        <input
          id={`qty-${line.id}`}
          inputMode="decimal"
          value={qty}
          disabled={busy}
          onChange={(e) => setQty(e.target.value)}
          onBlur={() => qty !== String(line.quantity) && onQuantity(qty)}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          className="tabular min-h-11 w-20 rounded-field border border-line bg-card px-3 text-right text-ink is-hover:border-sand focus-visible:border-olive"
        />
        <span className="text-sm text-muted">×</span>
        <span className={cx("tabular w-28 text-right font-semibold", line.price_type !== "fixed" && "font-normal text-muted")}>{total}</span>
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          aria-label={`Remove ${line.description}`}
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted is-hover:bg-sand-tint disabled:opacity-50"
        >
          <X className="size-5" />
        </button>
      </div>
      {line.price_type === "fixed" && canFree && (
        <div className="sm:w-28">
          <Checkbox label="Free" checked={line.is_free} disabled={busy} onChange={(e) => onFree(e.currentTarget.checked)} />
        </div>
      )}
    </li>
  );
}

function AddPicker({
  label,
  options,
  quantityFor,
  hint,
  busy,
  onAdd,
}: {
  label: string;
  options: { value: string; label: string }[];
  quantityFor: (id: string) => number;
  hint?: string;
  busy: boolean;
  onAdd: (id: string, quantity: number) => void;
}) {
  const [id, setId] = useState("");
  const [qty, setQty] = useState("");
  return (
    <div className="flex flex-col gap-3 rounded-inner bg-paper p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Select
            label={label}
            placeholder="Choose from your price list"
            options={options}
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setQty(e.target.value ? String(quantityFor(e.target.value)) : "");
            }}
          />
        </div>
        <div className="w-28">
          <Input label="Quantity" numeric value={qty} onChange={(e) => setQty(e.target.value)} disabled={!id} />
        </div>
        <Button
          disabled={!id || busy}
          onClick={() => {
            onAdd(id, Number(qty) || 1);
            setId("");
            setQty("");
          }}
        >
          Add
        </Button>
      </div>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}

function DeleteQuote({ onDelete, busy }: { onDelete: () => void; busy: boolean }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming)
    return (
      <Button variant="ghost" className="text-error!" onClick={() => setConfirming(true)}>
        Delete quote
      </Button>
    );
  return (
    <div className="flex flex-col gap-3 rounded-inner border border-error bg-error-tint p-4">
      <p className="flex items-start gap-2 text-sm font-medium text-error">
        <WarningCircle className="mt-1 size-4 shrink-0" />
        Delete this quote and everything on it? This can&apos;t be undone.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="danger" size="sm" loading={busy} loadingLabel="Deleting…" onClick={onDelete}>
          Yes, delete it
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
          Keep it
        </Button>
      </div>
    </div>
  );
}
