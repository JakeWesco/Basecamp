"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { SegmentedControl } from "@/components/ui";
import { convert, viewCurrencies, type Rates } from "@/lib/currency";
import { formatMoney } from "@/lib/prices";

// Lets a hunter see a quote in euro, pounds or rand. The quote's own
// currency stays what they pay; other currencies are a guide, at the
// exchange rate of the day the prices were locked.

type Ctx = { base: string; shown: string; rates: Rates | null };
const MoneyContext = createContext<Ctx | null>(null);
const SetShown = createContext<(c: string) => void>(() => {});

export function MoneyProvider({ base, rates, children }: { base: string; rates: Rates | null; children: ReactNode }) {
  const [shown, setShown] = useState(base);
  return (
    <MoneyContext.Provider value={{ base, shown, rates }}>
      <SetShown.Provider value={setShown}>{children}</SetShown.Provider>
    </MoneyContext.Provider>
  );
}

/** An amount in the chosen currency. "cents" for unit prices, so they multiply up to the line totals. */
export function Money({ amount, cents = false }: { amount: number; cents?: boolean }) {
  const ctx = useContext(MoneyContext);
  if (!ctx) return <>{amount}</>;
  if (ctx.shown === ctx.base) return <>{formatMoney(amount, ctx.base)}</>;
  const converted = convert(amount, ctx.shown, ctx.rates, cents);
  return <>{converted === null ? formatMoney(amount, ctx.base) : formatMoney(converted, ctx.shown)}</>;
}

const NAMES: Record<string, string> = { USD: "US dollars", EUR: "Euro", GBP: "Pounds", ZAR: "Rand", NAD: "Namibian dollars" };

function longDay(day: string) {
  return new Date(day + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** The currency switch, with a plain note on what the other currencies are. */
export function CurrencySwitch() {
  const ctx = useContext(MoneyContext);
  const setShown = useContext(SetShown);
  if (!ctx) return null;
  const options = viewCurrencies(ctx.base, ctx.rates);
  if (options.length < 2) return null;
  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl
        label="Show prices in"
        value={ctx.shown}
        onValueChange={setShown}
        options={options.map((c) => ({ value: c, label: c === ctx.base ? `${c}` : c }))}
        hint={
          ctx.shown === ctx.base
            ? `Prices are in ${NAMES[ctx.base] ?? ctx.base}. Pick another currency for a guide.`
            : `A guide only, at the European Central Bank rate on ${longDay(ctx.rates!.date)}. You pay in ${NAMES[ctx.base] ?? ctx.base}.`
        }
      />
    </div>
  );
}
