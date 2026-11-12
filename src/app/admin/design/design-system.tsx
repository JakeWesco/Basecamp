"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Badge,
  BUTTON_VARIANTS,
  Button,
  Card,
  Checkbox,
  Dialog,
  EmptyState,
  Input,
  SectionHeading,
  SegmentedControl,
  Select,
  ShareToWhatsApp,
  SkeletonCard,
  SkeletonTable,
  SkeletonText,
  STATUSES,
  Table,
  Textarea,
  Toggle,
  cx,
  motion,
  useToast,
  type Column,
  type Status,
} from "@/components/ui";
import * as Icons from "@/components/ui/icons";
import { brandStyle, contrast, luminance } from "@/lib/brand-colors";

// ---------------------------------------------------------------------------
// Tokens. Class names are written out in full so Tailwind generates them;
// the hex values are read from the page at runtime, so this file never
// repeats a colour from globals.css.
// ---------------------------------------------------------------------------

type Swatch = { name: string; className: string; use: string };
const COLOURS: { group: string; items: Swatch[] }[] = [
  {
    group: "Surfaces and text",
    items: [
      { name: "paper", className: "bg-paper", use: "Page background" },
      { name: "card", className: "bg-card", use: "Cards, inputs" },
      { name: "line", className: "bg-line", use: "Borders, dividers" },
      { name: "ink", className: "bg-ink", use: "Main text" },
      { name: "muted", className: "bg-muted", use: "Secondary text" },
    ],
  },
  {
    group: "Brand",
    items: [
      { name: "olive", className: "bg-olive", use: "Primary actions, selected" },
      { name: "olive-dark", className: "bg-olive-dark", use: "Dark bands, olive hover" },
      { name: "sand", className: "bg-sand", use: "Soft fills, tags" },
      { name: "sand-tint", className: "bg-sand-tint", use: "Icon backgrounds" },
      { name: "clay", className: "bg-clay", use: "The one main action" },
      { name: "clay-dark", className: "bg-clay-dark", use: "Clay hover" },
    ],
  },
  {
    group: "Status",
    items: [
      { name: "success", className: "bg-success", use: "Done, paid" },
      { name: "success-tint", className: "bg-success-tint", use: "Success fill" },
      { name: "warning", className: "bg-warning", use: "Needs attention" },
      { name: "warning-tint", className: "bg-warning-tint", use: "Warning fill" },
      { name: "error", className: "bg-error", use: "Errors, delete" },
      { name: "error-tint", className: "bg-error-tint", use: "Error fill" },
    ],
  },
];

const PAIRS: [string, string][] = [
  ["ink", "paper"],
  ["muted", "paper"],
  ["muted", "card"],
  ["olive", "card"],
  ["on-olive", "olive"],
  ["on-clay", "clay"],
  ["on-error", "error"],
  ["success", "success-tint"],
  ["warning", "warning-tint"],
  ["error", "error-tint"],
  ["olive-dark", "sand-tint"],
  ["ink", "sand"],
];

const noSubscribe = () => () => {};

/** Reads a token from the page. Empty during the server render. */
function useToken(name: string) {
  return useSyncExternalStore(
    noSubscribe,
    () => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim(),
    () => "",
  );
}

function useMounted() {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}

/** Six digit hex from a computed value. The build may shorten six digits to three. */
function hexOf(value: string) {
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) return "#" + [...v.slice(1)].map((c) => c + c).join("");
  return null;
}

function SwatchCard({ s }: { s: Swatch }) {
  const value = useToken(s.name);
  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-line bg-card">
      <div className={cx("h-20 border-b border-line", s.className)} />
      <div className="flex flex-col gap-1 p-4">
        <span className="font-semibold">{s.name}</span>
        <span className="tabular text-sm text-muted uppercase">{value || " "}</span>
        <span className="text-sm text-muted">{s.use}</span>
      </div>
    </div>
  );
}

function ContrastTable() {
  const mounted = useMounted();
  let rows: { id: string; fg: string; bg: string; ratio: number }[] = [];
  if (mounted) {
    const css = getComputedStyle(document.documentElement);
    const get = (n: string) => hexOf(css.getPropertyValue(`--${n}`).trim());
    rows = (
      PAIRS.flatMap(([fg, bg]) => {
        const a = get(fg);
        const b = get(bg);
        return a && b ? [{ id: `${fg}-${bg}`, fg, bg, ratio: contrast(luminance(a), luminance(b)) }] : [];
      })
    );
  }
  const columns: Column<(typeof rows)[number]>[] = [
    { key: "pair", header: "Text on background", primary: true, cell: (r) => `${r.fg} on ${r.bg}` },
    { key: "ratio", header: "Contrast", numeric: true, cell: (r) => `${r.ratio.toFixed(2)} : 1` },
    {
      key: "pass",
      header: "4.5 : 1",
      cell: (r) => (r.ratio >= 4.5 ? <Badge tone="success">Passes</Badge> : <Badge tone="error">Too low</Badge>),
    },
  ];
  return <Table columns={columns} rows={rows} rowKey={(r) => r.id} caption="Text contrast of token pairs" />;
}

const SPACING = [
  { px: 4, className: "w-1" },
  { px: 8, className: "w-2" },
  { px: 12, className: "w-3" },
  { px: 16, className: "w-4" },
  { px: 24, className: "w-6" },
  { px: 32, className: "w-8" },
  { px: 40, className: "w-10" },
  { px: 48, className: "w-12" },
  { px: 64, className: "w-16" },
  { px: 80, className: "w-20" },
  { px: 96, className: "w-24" },
];

const TYPE_SCALE = [
  { name: "text-6xl", className: "text-6xl" },
  { name: "text-5xl", className: "text-5xl" },
  { name: "text-4xl", className: "text-4xl" },
  { name: "text-3xl", className: "text-3xl" },
  { name: "text-2xl", className: "text-2xl" },
  { name: "text-xl", className: "text-xl" },
];

// ---------------------------------------------------------------------------
// Sample data, only to show the components. Not real prices.
// ---------------------------------------------------------------------------

type PriceRow = { id: string; animal: string; area: string; fee: number; status: Status };
const ROWS: PriceRow[] = [
  { id: "1", animal: "Kudu", area: "Limpopo", fee: 2400, status: "Quoted" },
  { id: "2", animal: "Gemsbok", area: "Northern Cape", fee: 1650, status: "Booked" },
  { id: "3", animal: "Blue wildebeest", area: "Free State", fee: 1100, status: "Deposit Paid" },
  { id: "4", animal: "Sable", area: "Limpopo", fee: 11500, status: "Enquiry" },
];
const money = (n: number) => `US$ ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const PRICE_COLUMNS: Column<PriceRow>[] = [
  { key: "animal", header: "Animal", primary: true, cell: (r) => r.animal },
  { key: "area", header: "Area", cell: (r) => r.area },
  { key: "status", header: "Status", cell: (r) => <Badge status={r.status} /> },
  { key: "fee", header: "Trophy fee", numeric: true, cell: (r) => money(r.fee) },
];

const STATES = [
  { label: "Default", force: undefined },
  { label: "Hover", force: "hover" },
  { label: "Active", force: "active" },
  { label: "Focus", force: "focus" },
] as const;

const VARIANT_NAME: Record<(typeof BUTTON_VARIANTS)[number], string> = {
  primary: "Primary",
  cta: "Call to action",
  secondary: "Secondary",
  ghost: "Ghost",
  danger: "Danger",
};

function Block({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-6">
      <SectionHeading title={title} description={description} />
      {children}
    </section>
  );
}

function StateLabel({ children }: { children: ReactNode }) {
  return <span className="text-xs font-semibold tracking-wider text-muted uppercase">{children}</span>;
}

// ---------------------------------------------------------------------------

export function DesignSystem() {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [moved, setMoved] = useState(false);
  const olive = useToken("olive");
  const clay = useToken("clay");
  const [picked, setPicked] = useState<{ primary?: string; accent?: string }>({});
  const brand = olive && clay ? { primary: picked.primary ?? hexOf(olive) ?? "", accent: picked.accent ?? hexOf(clay) ?? "" } : null;

  function save() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Price list saved", description: "New quotes use these prices." });
    }, 1800);
  }

  return (
    <div className="flex flex-col gap-16">
      <Block title="Colour" description="Tokens live in src/app/globals.css. Components use them through Tailwind, never as hex.">
        {COLOURS.map((g) => (
          <div key={g.group} className="flex flex-col gap-3">
            <h3 className="text-xl">{g.group}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {g.items.map((s) => (
                <SwatchCard key={s.name} s={s} />
              ))}
            </div>
          </div>
        ))}
        <h3 className="text-xl">Contrast</h3>
        <ContrastTable />
      </Block>

      <Block title="Type" description="Fraunces for headings, weight 500, never italic. Geist for everything else.">
        <Card>
          <div className="flex flex-col gap-4">
            {TYPE_SCALE.map((t) => (
              <div key={t.name} className="flex flex-col gap-1 border-b border-line pb-4 last:border-b-0 last:pb-0">
                <StateLabel>{t.name}</StateLabel>
                <span className={cx("font-heading leading-tight", t.className)}>From first enquiry to trophy</span>
              </div>
            ))}
            <div className="grid gap-4 sm:grid-cols-3">
              <p className="font-normal">Geist 400 for body text and long reading.</p>
              <p className="font-medium">Geist 500 for labels and emphasis.</p>
              <p className="font-semibold">Geist 600 for buttons and titles in tables.</p>
            </div>
            <div className="flex flex-col gap-1">
              <StateLabel>Tabular figures</StateLabel>
              <p className="tabular text-2xl font-medium">US$ 11,110.00</p>
              <p className="tabular text-2xl font-medium">US$ 1,650.00</p>
            </div>
            <p className="font-heading text-2xl">Łódź, Grüße, Señor, Français</p>
          </div>
        </Card>
      </Block>

      <Block title="Spacing, shape and motion" description="Spacing only from this scale. Inner radius is the outer radius minus the padding.">
        <Card>
          <div className="flex flex-col gap-2">
            {SPACING.map((s) => (
              <div key={s.px} className="flex items-center gap-4">
                <span className="tabular w-12 text-right text-sm text-muted">{s.px}</span>
                <span className={cx("h-4 rounded-full bg-olive", s.className)} />
              </div>
            ))}
          </div>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-card border border-line bg-card p-2">
            <div className="flex h-full flex-col gap-1 rounded-inner bg-sand-tint p-4">
              <span className="font-semibold">Card 24px, inset 8px</span>
              <span className="text-sm text-muted">Inner radius 16px</span>
            </div>
          </div>
          <div className="rounded-card border border-line bg-card p-3">
            <div className="flex h-full flex-col gap-1 rounded-field bg-sand-tint p-4">
              <span className="font-semibold">Card 24px, inset 12px</span>
              <span className="text-sm text-muted">Inner radius 12px, like inputs</span>
            </div>
          </div>
        </div>
        <Card>
          <div className="flex flex-col gap-4">
            <p className="text-muted">Every transition uses the Basecamp curve (0.32, 0.72, 0, 1) over 600ms. Movement stops when the device asks for reduced motion.</p>
            <div className="rounded-full bg-sand-tint p-1">
              <div className="@container">
                <span className={cx("block size-10 rounded-full bg-olive", motion, moved && "translate-x-[calc(100cqw-100%)]")} />
              </div>
            </div>
            <div>
              <Button variant="secondary" size="sm" onClick={() => setMoved(!moved)}>
                Play the motion
              </Button>
            </div>
          </div>
        </Card>
      </Block>

      <Block title="Icons" description="Phosphor, light weight, from src/components/ui/icons.tsx only.">
        <Card>
          <div className="flex flex-wrap gap-6 text-ink">
            {Object.entries(Icons)
              .filter(([, v]) => typeof v === "function")
              .map(([name, Icon]) => {
                const I = Icon as (p: { className?: string }) => ReactNode;
                return (
                  <span key={name} className="flex w-24 flex-col items-center gap-2 text-center">
                    <span className="flex size-12 items-center justify-center rounded-full bg-sand-tint text-olive">
                      <I className="size-6" />
                    </span>
                    <span className="text-xs text-muted">{name}</span>
                  </span>
                );
              })}
          </div>
        </Card>
      </Block>

      <Block title="Buttons" description="Primary is olive. Call to action is clay: one per page, for the most important step.">
        <Card>
          <div className="flex flex-col gap-6 overflow-x-auto">
            {BUTTON_VARIANTS.map((v) => (
              <div key={v} className="flex flex-col gap-3">
                <h3 className="text-lg">{VARIANT_NAME[v]}</h3>
                <div className="flex flex-wrap items-end gap-4">
                  {STATES.map((s) => (
                    <div key={s.label} className="flex flex-col gap-2">
                      <StateLabel>{s.label}</StateLabel>
                      <Button variant={v} data-force={s.force} tabIndex={s.force ? -1 : undefined}>
                        {v === "cta" ? "Send quote" : v === "danger" ? "Delete" : "Save"}
                      </Button>
                    </div>
                  ))}
                  <div className="flex flex-col gap-2">
                    <StateLabel>Disabled</StateLabel>
                    <Button variant={v} disabled>
                      Save
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <StateLabel>Loading</StateLabel>
                    <Button variant={v} loading loadingLabel="Saving…">
                      Save
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <StateLabel>Small</StateLabel>
                    <Button variant={v} size="sm">
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
              <Button loading={saving} loadingLabel="Saving…" onClick={save}>
                Try loading
              </Button>
              <span className="text-sm text-muted">Saves for two seconds, then shows a toast.</span>
            </div>
          </div>
        </Card>
      </Block>

      <Block title="Form fields" description="Every field has a label, optional help text and an inline error that says what to do.">
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Input">
            <div className="flex flex-col gap-6">
              <Input label="Hunter name" placeholder="Anna Kowalska" hint="As it appears in their passport." />
              <Input label="Hunter name" defaultValue="Anna" data-force="hover" hint="Hover" />
              <Input label="Hunter name" defaultValue="Anna Kowalska" data-force="focus" hint="Focus" />
              <Input label="Email" type="email" defaultValue="anna@" error="That email address looks incomplete. Check the part after the @." />
              <Input label="Daily rate" numeric defaultValue="450.00" hint="In US dollars, per hunter per day." />
              <Input label="Outfitter" defaultValue="Set by Basecamp" disabled />
            </div>
          </Card>
          <div className="flex flex-col gap-4">
            <Card title="Textarea">
              <div className="flex flex-col gap-6">
                <Textarea label="Notes for the hunter" hint="Shown on the quote." placeholder="Bring a light jacket for early mornings." />
                <Textarea label="Notes for the hunter" error="Notes can be up to 500 characters. Shorten them a little." defaultValue="A long note" />
              </div>
            </Card>
            <Card title="Select">
              <div className="flex flex-col gap-6">
                <Select
                  label="Region"
                  placeholder="Choose a region"
                  options={[
                    { value: "lp", label: "Limpopo" },
                    { value: "nc", label: "Northern Cape" },
                  ]}
                  hint="Prices can differ per region."
                />
                <Select label="Region" options={[{ value: "", label: "Choose a region" }]} error="Choose a region so we know which prices to use." />
                <Select label="Region" options={[{ value: "lp", label: "Limpopo" }]} disabled />
              </div>
            </Card>
          </div>
          <Card title="Checkbox">
            <div className="flex flex-col gap-2">
              <Checkbox label="Include the observer fee" hint="For a partner who comes along but does not hunt." />
              <Checkbox label="Include the observer fee" defaultChecked />
              <Checkbox label="Include the observer fee" data-force="hover" />
              <Checkbox label="I have read the hunting terms" error="Tick this box to continue." />
              <Checkbox label="Include the observer fee" disabled />
            </div>
          </Card>
          <Card title="Toggle">
            <div className="flex flex-col gap-2">
              <Toggle label="Show prices in euro" hint="Hunters see both currencies." />
              <Toggle label="Show prices in euro" defaultChecked />
              <Toggle label="Show prices in euro" data-force="hover" />
              <Toggle label="Show prices in euro" defaultChecked loading hint="Saving" />
              <Toggle label="Send the welcome email" error="We could not save this. Try again in a minute." />
              <Toggle label="Show prices in euro" disabled />
            </div>
          </Card>
          <Card title="Segmented control" className="md:col-span-2">
            <div className="flex flex-col gap-6">
              <SegmentedControl
                label="Weapon"
                options={[
                  { value: "rifle", label: "Rifle" },
                  { value: "bow", label: "Bow" },
                  { value: "both", label: "Both" },
                ]}
                hint="Arrow keys move between options."
              />
              <SegmentedControl
                label="Season"
                options={[
                  { value: "2026", label: "2026" },
                  { value: "2027", label: "2027" },
                  { value: "2028", label: "2028", disabled: true },
                ]}
                defaultValue="2027"
              />
              <SegmentedControl
                label="Hunters"
                options={[
                  { value: "1", label: "1 hunter" },
                  { value: "2", label: "2 hunters" },
                ]}
                error="Choose how many people will hunt."
              />
              <SegmentedControl label="Weapon" options={[{ value: "rifle", label: "Rifle" }, { value: "bow", label: "Bow" }]} disabled />
            </div>
          </Card>
        </div>
      </Block>

      <Block title="Cards and headings">
        <SectionHeading
          eyebrow="Quotes"
          title="Section heading"
          description="A title in Fraunces, one line under it, actions on the right."
          actions={<Button variant="secondary" size="sm">Export</Button>}
        />
        <Card
          title="Quote for the 2027 season"
          description="Valid for 14 days."
          actions={<ShareToWhatsApp message="Here is your hunt quote." url="https://example.com/q/abc123" size="sm" />}
        >
          <p className="text-muted">White, 24px corners, a 1px line border all the way round, 24px padding.</p>
        </Card>
      </Block>

      <Block title="Table" description="From 760px wide a table. Narrower, each row becomes a card.">
        <Table columns={PRICE_COLUMNS} rows={ROWS} rowKey={(r) => r.id} caption="Sample trophy fees" />
      </Block>

      <Block title="Badges" description="Booking statuses in order, then tones for anything else.">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Badge key={s} status={s} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>Draft</Badge>
          <Badge tone="success">Paid</Badge>
          <Badge tone="warning">Due in 3 days</Badge>
          <Badge tone="error">Overdue</Badge>
        </div>
      </Block>

      <Block title="Empty state" description="An icon, one line on what goes here, one action.">
        <EmptyState
          icon={<Icons.Tag />}
          title="Your price list is empty. Add daily rates and trophy fees and every quote will use them."
          action={<Button>Add the first price</Button>}
        />
      </Block>

      <Block title="Loading" description="Skeletons shaped like the content. Never spinners.">
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <Card>
            <SkeletonText lines={4} />
          </Card>
        </div>
        <SkeletonTable />
      </Block>

      <Block title="Toast, dialog and sharing">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast({ title: "Quote sent", description: "Anna will get it on WhatsApp." })}>
            Show a success toast
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({ title: "The quote was not sent", description: "Check your connection and try again.", tone: "error" })
            }
          >
            Show an error toast
          </Button>
          <Button variant="secondary" onClick={() => setDialog(true)}>
            Open a dialog
          </Button>
          <ShareToWhatsApp message="Here is your hunt quote." url="https://example.com/q/abc123" />
        </div>
        <p className="text-sm text-muted">On a phone the dialog slides up as a bottom sheet.</p>
        <Dialog
          open={dialog}
          onClose={() => setDialog(false)}
          title="Delete this price"
          description="Quotes already sent keep their prices. New quotes will not include it."
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setDialog(false)}>
                Delete price
              </Button>
            </>
          }
        />
      </Block>

      <Block
        title="Outfitter brand layer"
        description="Pages a hunter sees use the outfitter's own colours. Olive becomes their primary colour and clay their accent. Pick two colours to preview."
      >
        {brand && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="color"
                  value={brand.primary}
                  onChange={(e) => setPicked({ ...picked, primary: e.target.value })}
                  className="size-11 cursor-pointer rounded-full border border-line bg-card"
                />
                Primary colour
              </label>
              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="color"
                  value={brand.accent}
                  onChange={(e) => setPicked({ ...picked, accent: e.target.value })}
                  className="size-11 cursor-pointer rounded-full border border-line bg-card"
                />
                Accent colour
              </label>
            </div>
            <div style={brandStyle(brand)} className="rounded-card border border-line bg-paper p-6">
              <div className="flex flex-col gap-4">
                <SectionHeading level={3} eyebrow="Your hunt" title="Plains game, June 2027" />
                <div className="flex flex-wrap gap-3">
                  <Button variant="cta">Accept the quote</Button>
                  <Button>Ask a question</Button>
                  <Badge status="Booked" />
                </div>
                <Toggle label="Send me trip reminders" defaultChecked />
              </div>
            </div>
          </div>
        )}
      </Block>
    </div>
  );
}
