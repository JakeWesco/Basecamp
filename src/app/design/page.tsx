import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Card, EmptyState, ShareToWhatsApp, STATUSES, Table, type Column } from "@/components/ui";
import { InteractiveDemo } from "./interactive-demo";

export const metadata: Metadata = { title: "Design system" };

// Sample rows only, to show the components. Not real data.
type PriceRow = { id: string; animal: string; area: string; fee: number; status: (typeof STATUSES)[number] };
const ROWS: PriceRow[] = [
  { id: "1", animal: "Kudu", area: "Limpopo", fee: 2400, status: "Quoted" },
  { id: "2", animal: "Gemsbok (oryx)", area: "Northern Cape", fee: 1650, status: "Booked" },
  { id: "3", animal: "Blue wildebeest", area: "Free State", fee: 1100, status: "Deposit Paid" },
];

const money = (n: number) => `US$ ${n.toLocaleString("en-US")}`;

const COLUMNS: Column<PriceRow>[] = [
  { key: "animal", header: "Animal", primary: true, cell: (r) => r.animal },
  { key: "area", header: "Area", cell: (r) => r.area },
  { key: "status", header: "Status", cell: (r) => <Badge status={r.status} /> },
  { key: "fee", header: "Trophy fee", numeric: true, cell: (r) => money(r.fee) },
];

/** Every UI component in one place, for building and checking screens. Dev only. */
export default function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-12 sm:px-8">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold tracking-wider text-olive uppercase">Basecamp</p>
        <h1 className="text-5xl leading-none">Design system</h1>
        <p className="max-w-2xl text-lg text-muted">
          Fraunces for headings, Geist for body text and numbers. Colours come from the tokens in globals.css.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-3xl">Type</h2>
        <Card>
          <div className="flex flex-col gap-3">
            <h1 className="text-5xl leading-none">Heading one, Fraunces</h1>
            <h2 className="text-3xl">Heading two, Łódź and Grüße</h2>
            <h3 className="text-2xl">Heading three</h3>
            <p>Body text in Geist. From first enquiry to trophy on the wall.</p>
            <p className="text-muted">Secondary text in muted.</p>
            <p className="tabular text-2xl font-medium">US$ 11,110.00 · 1,234,567.89</p>
          </div>
        </Card>
      </section>

      <InteractiveDemo />

      <section className="flex flex-col gap-4">
        <h2 className="text-3xl">Badges</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Badge key={s} status={s} />
          ))}
          <Badge tone="danger">Overdue</Badge>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-3xl">Table</h2>
        <p className="text-muted">Narrow the window below 768px: each row becomes a card.</p>
        <Table columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} caption="Sample trophy fees" />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-3xl">Card, empty state, WhatsApp</h2>
        <Card
          title="Quote for the 2027 season"
          description="Valid for 14 days."
          actions={<ShareToWhatsApp url="https://example.com/q/abc123" message="Here is your hunt quote:" size="sm" />}
        >
          <p className="text-muted">Cards are white with a 1px line border and 24px corners.</p>
        </Card>
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          }
          title="No prices yet"
          description="Add your daily rates and trophy fees, and quotes will use them."
          action={<ShareToWhatsApp url="https://example.com" label="Ask on WhatsApp" variant="ghost" />}
        />
      </section>
    </main>
  );
}
