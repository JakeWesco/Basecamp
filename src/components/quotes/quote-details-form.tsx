"use client";

import { useActionState } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import { WarningCircle } from "@/components/ui/icons";
import { createQuote, updateQuoteDetails, type QuoteFormState } from "@/lib/quote-actions";
import { keepValues, type Kept } from "@/lib/form-values";
import type { Quote } from "@/lib/quotes";

type State = QuoteFormState & { values?: Kept };
const EMPTY: State = { ok: false, errors: {} };

/** The hunter and the trip: used to start a quote and to edit its details. */
export function QuoteDetailsForm({
  area,
  quote,
  onSaved,
  onCancel,
}: {
  area: "admin" | "agent";
  quote?: Quote;
  onSaved?: (message?: string) => void;
  onCancel?: () => void;
}) {
  const [state, action, pending] = useActionState(async (prev: State, form: FormData): Promise<State> => {
    const values = keepValues(form);
    const result = quote ? await updateQuoteDetails(prev, form) : await createQuote(prev, form);
    if (result.ok) onSaved?.(result.message);
    // On an error, put back what was typed (React clears the form after an action).
    return result.ok ? result : { ...result, values };
  }, EMPTY);
  const e = state.errors;
  // What was typed, if the last try failed; otherwise the saved quote.
  const v = (name: string, saved: string) => state.values?.[name] ?? saved;

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="area" value={area} />
      {quote && <input type="hidden" name="id" value={quote.id} />}
      <Input label="Hunter's name" name="hunterName" defaultValue={v("hunterName", quote?.hunter_name ?? "")} autoComplete="off" error={e.hunterName} required />
      <div className="grid gap-6 sm:grid-cols-2">
        <Input label="Email" name="hunterEmail" type="email" defaultValue={v("hunterEmail", quote?.hunter_email ?? "")} error={e.hunterEmail} />
        <Input
          label="Phone"
          name="hunterPhone"
          type="tel"
          defaultValue={v("hunterPhone", quote?.hunter_phone ?? "")}
          hint="With the country code, for WhatsApp."
          error={e.hunterPhone}
        />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Input label="Arrival date" name="arrivalDate" type="date" defaultValue={v("arrivalDate", quote?.arrival_date ?? "")} hint="Leave empty if not known yet." error={e.arrivalDate} />
        <Input label="Hunting days" name="days" numeric defaultValue={v("days", String(quote?.hunting_days ?? 7))} error={e.days} required />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Input label="Hunters" name="hunters" numeric defaultValue={v("hunters", String(quote?.hunters ?? 1))} error={e.hunters} required />
        <Input label="Observers" name="observers" numeric defaultValue={v("observers", String(quote?.observers ?? 0))} hint="People who come along but don't hunt." error={e.observers} />
      </div>
      <Textarea label="Notes for the hunter" name="notes" defaultValue={v("notes", quote?.notes ?? "")} rows={3} error={e.notes} />
      {e.form && (
        <p role="alert" className="flex items-start gap-2 rounded-field bg-error-tint px-4 py-3 text-sm font-medium text-error">
          <WarningCircle className="mt-1 size-4 shrink-0" />
          {e.form}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={pending} loadingLabel="Saving…">
          {quote ? "Save details" : "Start the quote"}
        </Button>
      </div>
    </form>
  );
}
