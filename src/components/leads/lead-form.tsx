"use client";

import { useActionState, useMemo, useState } from "react";
import { Button, Checkbox, Input, SegmentedControl, Select, Textarea, useToast } from "@/components/ui";
import { CaretDown, WarningCircle, WhatsappLogo } from "@/components/ui/icons";
import { keepValues, type Kept } from "@/lib/form-values";
import { saveLead, type LeadFormState } from "@/lib/lead-actions";
import type { Lead, SpeciesOption } from "@/lib/lead-data";
import {
  BUDGET_LABEL,
  BUDGETS,
  COUNTRIES,
  formatPhone,
  parseWhatsApp,
  SOURCE_LABEL,
  SOURCES,
  TEMPERATURE_LABEL,
  TEMPERATURES,
  type Temperature,
} from "@/lib/leads";

type State = LeadFormState & { values?: Kept; species?: string[] };
const EMPTY: State = { ok: false, errors: {} };

/**
 * Add or edit a lead. The essentials fit on one phone screen: name, phone,
 * email, temperature. Everything else waits under "More details".
 */
export function LeadForm({
  area,
  species,
  lead,
  onSaved,
  onCancel,
}: {
  area: "admin" | "agent";
  species: SpeciesOption[];
  lead?: Lead;
  onSaved?: (message?: string) => void;
  onCancel?: () => void;
}) {
  const [round, setRound] = useState(0);
  return <LeadFormInner key={round} area={area} species={species} lead={lead} onSaved={onSaved} onCancel={onCancel} onNext={() => setRound((r) => r + 1)} />;
}

function LeadFormInner({
  area,
  species,
  lead,
  onSaved,
  onCancel,
  onNext,
}: {
  area: "admin" | "agent";
  species: SpeciesOption[];
  lead?: Lead;
  onSaved?: (message?: string) => void;
  onCancel?: () => void;
  onNext: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(lead?.full_name ?? "");
  const [phone, setPhone] = useState(lead?.phone ? formatPhone(lead.phone) : "");
  const [email, setEmail] = useState(lead?.email ?? "");
  const [notes, setNotes] = useState(lead?.notes ?? "");
  const [temperature, setTemperature] = useState<Temperature>(lead?.temperature ?? "warm");
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [filter, setFilter] = useState("");

  const [state, action, pending] = useActionState(async (prev: State, form: FormData): Promise<State> => {
    const values = keepValues(form);
    const chosen = form.getAll("species").map(String);
    const result = await saveLead(prev, form);
    if (result.ok) {
      if (result.savedId) {
        toast({ title: result.message ?? "Lead added", description: "Ready for the next hunter." });
        onNext();
      } else onSaved?.(result.message);
      return result;
    }
    return { ...result, values, species: chosen };
  }, EMPTY);
  const e = state.errors;
  const v = (n: string, saved: string) => state.values?.[n] ?? saved;
  const chosen = useMemo(() => new Set(state.species ?? lead?.species.map((s) => s.id) ?? []), [state.species, lead]);
  const hasExtras = Boolean(
    lead && (lead.country_code || lead.source || lead.rough_dates || lead.budget_band || lead.hunters || lead.observers || lead.notes || lead.species.length || lead.marketing_consent),
  );
  const extrasError = Boolean(e.hunters || e.observers || e.notes || e.roughDates);
  const shownSpecies = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? species.filter((s) => s.name.toLowerCase().includes(q) || chosen.has(s.id)) : species;
  }, [species, filter, chosen]);

  function fillFromPaste() {
    const found = parseWhatsApp(pasted);
    const got = [found.fullName && "name", found.phone && "phone", found.email && "email"].filter(Boolean);
    if (found.fullName) setName(found.fullName);
    if (found.phone) setPhone(formatPhone(found.phone));
    if (found.email) setEmail(found.email);
    if (found.notes && !notes) setNotes(found.notes);
    if (got.length) {
      toast({ title: `Filled in the ${got.join(", ").replace(/, ([^,]*)$/, " and $1")}`, description: "Check them before you save." });
      setPasting(false);
      setPasted("");
    } else {
      toast({ title: "Nothing found to fill in", description: "Paste a contact card or a message with a name, phone or email.", tone: "error" });
    }
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-4 sm:gap-6">
      <input type="hidden" name="area" value={area} />
      {lead && <input type="hidden" name="id" value={lead.id} />}

      {!lead &&
        (pasting ? (
          <div className="flex flex-col gap-3 rounded-inner bg-paper p-4">
            <Textarea
              label="Paste from WhatsApp"
              rows={4}
              value={pasted}
              onChange={(ev) => setPasted(ev.target.value)}
              placeholder="Paste a contact card or a message here"
              hint="Basecamp fills in the name, phone and email it finds. Nothing is saved until you press Save."
            />
            <div className="flex flex-wrap gap-3">
              <Button size="sm" onClick={fillFromPaste} disabled={!pasted.trim()}>
                Fill the form
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPasting(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" size="sm" className="self-start" onClick={() => setPasting(true)}>
            <WhatsappLogo className="size-4" />
            Paste from WhatsApp
          </Button>
        ))}

      <Input label="Name" name="fullName" value={name} onChange={(ev) => setName(ev.target.value)} autoComplete="off" error={e.fullName} required />
      <Input
        label="Phone"
        name="phone"
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={(ev) => setPhone(ev.target.value)}
        placeholder="+49 151 2345 6789"
        hint="With the country code, so WhatsApp works."
        error={e.phone ?? (e.contact && !email ? e.contact : undefined)}
      />
      <Input label="Email" name="email" type="email" inputMode="email" value={email} onChange={(ev) => setEmail(ev.target.value)} error={e.email} />
      <SegmentedControl
        label="How keen are they?"
        name="temperature"
        value={temperature}
        onValueChange={(t) => setTemperature(t as Temperature)}
        options={TEMPERATURES.map((t) => ({ value: t, label: TEMPERATURE_LABEL[t] }))}
      />

      <details open={hasExtras || extrasError || undefined} className="group rounded-inner border border-line">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 font-medium is-hover:bg-paper [&::-webkit-details-marker]:hidden">
          More details
          <CaretDown className="size-5 text-muted transition-transform duration-600 ease-basecamp group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-6 border-t border-line p-4">
          <div className="grid gap-6 sm:grid-cols-2">
            <Select
              label="Country"
              name="country"
              placeholder="Choose a country"
              defaultValue={v("country", lead?.country_code ?? "")}
              options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
              hint="Also used for a phone number without a country code."
            />
            <Select
              label="How they found us"
              name="source"
              placeholder="Choose one"
              defaultValue={v("source", lead?.source ?? "")}
              options={SOURCES.map((s) => ({ value: s, label: SOURCE_LABEL[s] }))}
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Input label="Rough dates" name="roughDates" placeholder="June 2027" defaultValue={v("roughDates", lead?.rough_dates ?? "")} error={e.roughDates} />
            <Select
              label="Budget"
              name="budget"
              placeholder="Not known"
              defaultValue={v("budget", lead?.budget_band ?? "")}
              options={BUDGETS.map((b) => ({ value: b, label: BUDGET_LABEL[b] }))}
              hint="In your price list currency."
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Input label="Hunters" name="hunters" numeric defaultValue={v("hunters", lead?.hunters != null ? String(lead.hunters) : "")} error={e.hunters} />
            <Input label="Observers" name="observers" numeric defaultValue={v("observers", lead?.observers != null ? String(lead.observers) : "")} error={e.observers} />
          </div>

          {species.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-ink">Interested in</legend>
              {species.length > 8 && (
                <Input label="Find a species" value={filter} onChange={(ev) => setFilter(ev.target.value)} placeholder="Kudu, sable" />
              )}
              <div className="grid max-h-72 gap-1 overflow-y-auto rounded-field border border-line px-3 py-1 sm:grid-cols-2">
                {species.map((s) => (
                  <div key={s.id} className={shownSpecies.includes(s) ? "" : "hidden"}>
                    <Checkbox label={s.name} name="species" value={s.id} defaultChecked={chosen.has(s.id)} />
                  </div>
                ))}
              </div>
            </fieldset>
          )}

          <Textarea label="Notes" name="notes" rows={3} value={notes} onChange={(ev) => setNotes(ev.target.value)} error={e.notes} />
          <Checkbox
            label="They agree to receive marketing email"
            name="consent"
            defaultChecked={state.values ? state.values.consent === "on" : (lead?.marketing_consent ?? false)}
            hint="Only tick this if they said yes. Email campaigns will only go to people who agreed."
          />
        </div>
      </details>

      {e.form && (
        <p role="alert" className="flex items-start gap-2 rounded-field bg-error-tint px-4 py-3 text-sm font-medium text-error">
          <WarningCircle className="mt-1 size-4 shrink-0" />
          {e.form}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end [&>*:only-child]:col-span-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {!lead && (
          <Button type="submit" variant="secondary" name="again" value="1" disabled={pending}>
            Save and next
          </Button>
        )}
        <Button type="submit" loading={pending} loadingLabel="Saving…">
          {lead ? "Save changes" : "Save lead"}
        </Button>
      </div>
    </form>
  );
}
