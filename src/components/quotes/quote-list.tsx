import Link from "next/link";
import { Badge, buttonClasses, EmptyState, Table, type Column } from "@/components/ui";
import { Receipt } from "@/components/ui/icons";
import { formatMoney } from "@/lib/prices";
import { listQuotes, type Area, type QuoteSummary } from "@/lib/quote-data";

/** Quotes this person can see: admins all of them, agents their own. */
export async function QuoteList({ area }: { area: Area }) {
  const quotes = await listQuotes(area);
  const base = `/${area}/quotes`;

  const columns: Column<QuoteSummary>[] = [
    {
      key: "hunter",
      header: "Hunter",
      primary: true,
      cell: (q) => (
        <Link href={`${base}/${q.id}`} className="font-semibold text-ink underline decoration-line underline-offset-4 is-hover:decoration-olive">
          {q.hunter_name}
        </Link>
      ),
    },
    { key: "trip", header: "Trip", cell: (q) => `${q.hunting_days} days, ${q.hunters} ${q.hunters === 1 ? "hunter" : "hunters"}` },
    ...(area === "admin" ? [{ key: "by", header: "Made by", cell: (q: QuoteSummary) => (q.mine ? "You" : "An agent") }] : []),
    { key: "status", header: "Status", cell: (q) => (q.status === "sent" ? <Badge status="Quoted">Sent</Badge> : <Badge>Draft</Badge>) },
    {
      key: "total",
      header: "Total",
      numeric: true,
      cell: (q) => (
        <span>
          {formatMoney(q.total, q.currency)}
          {q.onRequest > 0 && <span className="block text-xs font-normal text-muted">plus {q.onRequest} on request</span>}
        </span>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      rows={quotes}
      rowKey={(q) => q.id}
      caption="Quotes"
      empty={
        <EmptyState
          icon={<Receipt />}
          title={area === "admin" ? "No quotes yet. Start one for a hunter and build it from your price list." : "No quotes yet. Start one for a hunter you met."}
          action={
            <Link href={`${base}/new`} className={buttonClasses()}>
              Start a quote
            </Link>
          }
        />
      }
    />
  );
}
