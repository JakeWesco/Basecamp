import "server-only";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Rate, SpeciesFee } from "@/lib/prices";
import { quoteTotals, type Quote, type QuoteLine } from "@/lib/quotes";

export type Area = "admin" | "agent";

export type QuoteSummary = {
  id: string;
  hunter_name: string;
  hunting_days: number;
  hunters: number;
  status: "draft" | "sent";
  updated_at: string;
  mine: boolean;
  total: number;
  currency: string;
  onRequest: number;
};

const num = (v: unknown) => (v == null ? null : Number(v));

function toLine(l: Record<string, unknown>): QuoteLine {
  return {
    ...(l as unknown as QuoteLine),
    unit_price: num(l.unit_price),
    quantity: Number(l.quantity),
  };
}

/** Quotes this user can see (RLS: admins all of the outfitter's, agents their own). */
export async function listQuotes(area: Area): Promise<QuoteSummary[]> {
  const me = await requireRole(area);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("quotes")
    .select("id, created_by, hunter_name, hunting_days, hunters, status, updated_at, currency, discount_percent, quote_lines(price_type, unit_price, quantity, is_free)")
    .eq("outfitter_id", me.outfitterId)
    .order("updated_at", { ascending: false });
  return (data ?? []).map((q) => {
    const lines = ((q.quote_lines as Record<string, unknown>[]) ?? []).map((l) => ({
      price_type: l.price_type as QuoteLine["price_type"],
      unit_price: num(l.unit_price),
      quantity: Number(l.quantity),
      is_free: Boolean(l.is_free),
    }));
    const totals = quoteTotals(lines, Number(q.discount_percent));
    return {
      id: q.id as string,
      hunter_name: q.hunter_name as string,
      hunting_days: q.hunting_days as number,
      hunters: q.hunters as number,
      status: q.status as "draft" | "sent",
      updated_at: q.updated_at as string,
      mine: q.created_by === auth.user?.id,
      total: totals.total,
      currency: q.currency as string,
      onRequest: totals.onRequest,
    };
  });
}

export type QuoteContext = {
  area: Area;
  isAdmin: boolean;
  userId: string;
  quote: Quote;
  lines: QuoteLine[];
  rates: (Rate & { agent_can_give_free: boolean })[];
  fees: SpeciesFee[];
  maxDiscount: number;
};

/** One quote with its lines and the price list it is built from. */
export async function loadQuote(area: Area, id: string): Promise<QuoteContext> {
  const me = await requireRole(area);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: quote } = await supabase.from("quotes").select("*").eq("id", id).eq("outfitter_id", me.outfitterId).maybeSingle();
  if (!quote) notFound();

  const [{ data: lines }, { data: rates }, { data: species }, { data: fees }, { data: outfitter }] = await Promise.all([
    supabase.from("quote_lines").select("*").eq("quote_id", id).order("sort_order").order("created_at"),
    supabase
      .from("rates")
      .select("id, name, unit, price_type, amount, sort_order, agent_can_give_free")
      .eq("outfitter_id", me.outfitterId)
      .eq("season", quote.season)
      .order("sort_order")
      .order("name"),
    supabase.from("species").select("id, name, is_published").eq("outfitter_id", me.outfitterId).order("sort_order").order("name"),
    supabase.from("trophy_fees").select("id, species_id, amount, on_request").eq("outfitter_id", me.outfitterId).eq("season", quote.season),
    supabase.from("outfitters").select("agent_max_discount_percent").eq("id", me.outfitterId).single(),
  ]);

  const feeBySpecies = new Map((fees ?? []).map((f) => [f.species_id as string, f]));
  return {
    area,
    isAdmin: me.role === "admin",
    userId: auth.user?.id ?? "",
    quote: { ...(quote as Quote), discount_percent: Number(quote.discount_percent) },
    lines: (lines ?? []).map(toLine),
    rates: (rates ?? []).map((r) => ({ ...(r as Rate & { agent_can_give_free: boolean }), amount: num(r.amount) })),
    fees: (species ?? [])
      .filter((s) => feeBySpecies.has(s.id as string))
      .map((s) => {
        const f = feeBySpecies.get(s.id as string)!;
        return {
          speciesId: s.id as string,
          name: s.name as string,
          isPublished: Boolean(s.is_published),
          feeId: f.id as string,
          amount: num(f.amount),
          onRequest: Boolean(f.on_request),
        };
      }),
    maxDiscount: Number(outfitter?.agent_max_discount_percent ?? 0),
  };
}
