"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buttonClasses, EmptyState, Input, Select, Table, type Column } from "@/components/ui";
import { Tray } from "@/components/ui/icons";
import type { Lead } from "@/lib/lead-data";
import { formatPhone, LEAD_STATUSES, STATUS_LABEL, TEMPERATURE_LABEL, TEMPERATURES } from "@/lib/leads";
import { LeadStatusBadge, TemperatureBadge } from "./lead-badges";

/** Leads, newest first, with search and filters for status and temperature. */
export function LeadList({ area, leads }: { area: "admin" | "agent"; leads: Lead[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [temperature, setTemperature] = useState("");
  const base = `/${area}/leads`;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return leads.filter(
      (l) =>
        (!status || l.status === status) &&
        (!temperature || l.temperature === temperature) &&
        (!q ||
          l.full_name.toLowerCase().includes(q) ||
          (l.email ?? "").includes(q) ||
          (digits.length >= 3 && (l.phone ?? "").includes(digits)) ||
          l.species.some((s) => s.name.toLowerCase().includes(q))),
    );
  }, [leads, query, status, temperature]);

  if (leads.length === 0)
    return (
      <EmptyState
        icon={<Tray />}
        title="No leads yet. Add the first hunter you've spoken to."
        action={
          <Link href={`${base}/new`} className={buttonClasses()}>
            Add a lead
          </Link>
        }
      />
    );

  const columns: Column<Lead>[] = [
    {
      key: "name",
      header: "Name",
      primary: true,
      cell: (l) => (
        <Link href={`${base}/${l.id}`} className="font-semibold text-ink underline decoration-line underline-offset-4 is-hover:decoration-olive">
          {l.full_name}
        </Link>
      ),
    },
    { key: "temperature", header: "Temperature", cell: (l) => <TemperatureBadge temperature={l.temperature} /> },
    { key: "status", header: "Status", cell: (l) => <LeadStatusBadge status={l.status} /> },
    { key: "contact", header: "Contact", cell: (l) => (l.phone ? formatPhone(l.phone) : l.email) },
    {
      key: "interest",
      header: "Interested in",
      cell: (l) => (l.species.length ? l.species.map((s) => s.name).slice(0, 3).join(", ") + (l.species.length > 3 ? ` and ${l.species.length - 3} more` : "") : <span className="text-muted">Not yet known</span>),
    },
    ...(area === "admin" ? [{ key: "by", header: "Added by", cell: (l: Lead) => (l.mine ? "You" : "An agent") }] : []),
    {
      key: "added",
      header: "Added",
      cell: (l) => new Date(l.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <Input label="Search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, email, phone or species" />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[{ value: "", label: "All statuses" }, ...LEAD_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
        />
        <Select
          label="Temperature"
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
          options={[{ value: "", label: "Hot, warm and cold" }, ...TEMPERATURES.map((t) => ({ value: t, label: TEMPERATURE_LABEL[t] }))]}
        />
      </div>
      <Table
        columns={columns}
        rows={shown}
        rowKey={(l) => l.id}
        caption="Leads"
        empty={<p className="text-muted">No leads match. Clear the search or the filters.</p>}
      />
    </div>
  );
}
