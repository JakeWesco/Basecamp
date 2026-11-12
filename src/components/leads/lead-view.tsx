"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge, Button, buttonClasses, Card, Dialog, Input, SectionHeading, Select, useToast } from "@/components/ui";
import { WarningCircle, WhatsappLogo } from "@/components/ui/icons";
import { deleteLead, quoteFromLead, setLeadStatus, type ActionResult } from "@/lib/lead-actions";
import type { Lead, SpeciesOption } from "@/lib/lead-data";
import { BUDGET_LABEL, COUNTRIES, formatPhone, LEAD_STATUSES, SOURCE_LABEL, STATUS_LABEL, type LeadStatus } from "@/lib/leads";
import { LeadStatusBadge, TemperatureBadge } from "./lead-badges";
import { LeadForm } from "./lead-form";

/** One lead: how to reach them, where they stand, and a quote in one click. */
export function LeadView({ area, lead, species }: { area: "admin" | "agent"; lead: Lead; species: SpeciesOption[] }) {
  const toast = useToast();
  const [busy, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [reason, setReason] = useState(lead.lost_reason ?? "");
  const [reasonError, setReasonError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const quotesBase = area === "admin" ? "/admin/quotes" : "/agent/quotes";

  function run(action: () => Promise<ActionResult>, onError?: (e?: string) => void) {
    start(async () => {
      const r = await action();
      if (!r.ok) {
        if (onError) onError(r.error);
        else toast({ title: "Not saved", description: r.error, tone: "error" });
      } else if (r.message) toast({ title: r.message });
    });
  }

  const digits = lead.phone?.replace(/\D/g, "");
  const country = COUNTRIES.find((c) => c.code === lead.country_code)?.name;
  const statusChanged = status !== lead.status || (status === "lost" && reason.trim() !== (lead.lost_reason ?? ""));

  const facts: [string, string | null][] = [
    ["Country", country ?? null],
    ["How they found us", lead.source ? SOURCE_LABEL[lead.source] : null],
    ["Rough dates", lead.rough_dates],
    ["Budget", lead.budget_band ? BUDGET_LABEL[lead.budget_band] : null],
    ["Hunters", lead.hunters != null ? String(lead.hunters) : null],
    ["Observers", lead.observers != null ? String(lead.observers) : null],
    ["Interested in", lead.species.length ? lead.species.map((s) => s.name).join(", ") : null],
    ["Marketing email", lead.marketing_consent ? `Agreed on ${new Date(lead.consent_at ?? lead.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : "Not agreed"],
    ["Added", `${new Date(lead.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}${area === "admin" ? (lead.mine ? " by you" : " by an agent") : ""}`],
  ];

  return (
    <div className="flex flex-col gap-8">
      <SectionHeading
        level={1}
        eyebrow="Lead"
        title={lead.full_name}
        actions={
          <>
            <TemperatureBadge temperature={lead.temperature} />
            <LeadStatusBadge status={lead.status} />
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Card title="Get in touch">
            <div className="flex flex-col gap-4">
              <dl className="flex flex-col gap-2">
                {lead.phone && (
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-muted">Phone</dt>
                    <dd className="tabular font-medium">{formatPhone(lead.phone)}</dd>
                  </div>
                )}
                {lead.email && (
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-muted">Email</dt>
                    <dd className="font-medium break-all">{lead.email}</dd>
                  </div>
                )}
              </dl>
              <div className="flex flex-wrap gap-3">
                {digits && (
                  <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "secondary" })}>
                    <WhatsappLogo className="size-5" />
                    WhatsApp
                  </a>
                )}
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className={buttonClasses({ variant: "secondary" })}>
                    Call
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className={buttonClasses({ variant: "secondary" })}>
                    Email
                  </a>
                )}
              </div>
            </div>
          </Card>

          <Card title="Details">
            <dl className="flex flex-col divide-y divide-line">
              {facts.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-4">
                  <dt className="text-muted">{label}</dt>
                  <dd className={value ? "font-medium sm:text-right" : "text-muted sm:text-right"}>{value ?? "Not yet known"}</dd>
                </div>
              ))}
            </dl>
            {lead.notes && <p className="mt-6 rounded-inner bg-paper p-4 whitespace-pre-line">{lead.notes}</p>}
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
          <Card title="Quotes">
            <div className="flex flex-col gap-4">
              {lead.quotes.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {lead.quotes.map((q) => (
                    <li key={q.id} className="flex items-center justify-between gap-3">
                      <Link href={`${quotesBase}/${q.id}`} className="font-medium underline decoration-line underline-offset-4 is-hover:decoration-olive">
                        Quote from {new Date(q.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </Link>
                      {q.status === "sent" ? <Badge status="Quoted">Sent</Badge> : <Badge>Draft</Badge>}
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="cta" loading={busy} loadingLabel="Making the quote…" onClick={() => run(() => quoteFromLead(area, lead.id))}>
                {lead.quotes.length ? "Make another quote" : "Make a quote"}
              </Button>
              <p className="text-sm text-muted">Starts a quote with their name, contact details and group size filled in.</p>
            </div>
          </Card>

          <Card title="Status">
            <div className="flex flex-col gap-4">
              <Select
                label="Where this lead stands"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as LeadStatus);
                  setReasonError(undefined);
                }}
                options={LEAD_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
              />
              {status === "lost" && (
                <Input
                  label="Why was it lost?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Booked elsewhere"
                  error={reasonError}
                />
              )}
              {statusChanged && (
                <Button loading={busy} loadingLabel="Saving…" onClick={() => run(() => setLeadStatus(area, lead.id, status, reason), (err) => setReasonError(err))}>
                  Save status
                </Button>
              )}
            </div>
          </Card>

          {confirmDelete ? (
            <div className="flex flex-col gap-3 rounded-inner border border-error bg-error-tint p-4">
              <p className="flex items-start gap-2 text-sm font-medium text-error">
                <WarningCircle className="mt-1 size-4 shrink-0" />
                Delete this lead? Quotes made from it are kept. This can&apos;t be undone.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="danger" size="sm" loading={busy} loadingLabel="Deleting…" onClick={() => run(() => deleteLead(area, lead.id))}>
                  Yes, delete it
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={busy}>
                  Keep it
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" className="self-start text-error!" onClick={() => setConfirmDelete(true)}>
              Delete lead
            </Button>
          )}
        </div>
      </div>

      <Dialog open={editing} onClose={() => setEditing(false)} title={`Edit ${lead.full_name}`}>
        {editing && (
          <LeadForm
            area={area}
            species={species}
            lead={lead}
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
