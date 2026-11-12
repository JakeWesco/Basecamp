import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { validHex, validLogoUrl, type Brand } from "@/lib/brand-colors";
import type { LinePrice } from "@/lib/quotes";
import type { Unit } from "@/lib/prices";
import type { CostEstimate } from "@/lib/costs";

// A quote as a hunter sees it through a share link. Comes from
// public.shared_quote(token), which leaves out everything private.

export type SharedLine = LinePrice & { kind: "rate" | "trophy_fee" | "custom"; description: string; unit: Unit };

export type SharedQuote = {
  quote: {
    hunter_name: string;
    arrival_date: string | null;
    hunting_days: number;
    hunters: number;
    observers: number;
    season: string;
    currency: string;
    discount_percent: number;
    notes: string | null;
    locked_at: string | null;
  };
  outfitter: { name: string; email: string | null; phone: string | null; website: string | null };
  brand: Brand;
  lines: SharedLine[];
  costs: CostEstimate[];
};

const TOKEN = /^[0-9a-f]{64}$/;

/** Null when the link is wrong or turned off. Cached per request (page and metadata share it). */
export const getSharedQuote = cache(async (token: string): Promise<SharedQuote | null> => {
  if (!TOKEN.test(token)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("shared_quote", { token });
  if (error || !data) return null;
  const d = data as {
    quote: SharedQuote["quote"];
    outfitter: SharedQuote["outfitter"] & { logo_url: string | null; brand_primary: string | null; brand_accent: string | null };
    lines: Record<string, unknown>[];
    costs?: Record<string, unknown>[];
  };
  return {
    quote: { ...d.quote, discount_percent: Number(d.quote.discount_percent) },
    outfitter: { name: d.outfitter.name, email: d.outfitter.email, phone: d.outfitter.phone, website: d.outfitter.website },
    brand: {
      name: d.outfitter.name,
      logoUrl: validLogoUrl(d.outfitter.logo_url),
      primary: validHex(d.outfitter.brand_primary),
      accent: validHex(d.outfitter.brand_accent),
    },
    costs: (d.costs ?? []).map((c) => ({
      name: String(c.name),
      note: c.note == null ? null : String(c.note),
      basis: c.basis as CostEstimate["basis"],
      low: Number(c.low),
      high: Number(c.high),
    })),
    lines: d.lines.map((l) => ({
      kind: l.kind as SharedLine["kind"],
      description: String(l.description),
      unit: l.unit as Unit,
      price_type: l.price_type as SharedLine["price_type"],
      unit_price: l.unit_price == null ? null : Number(l.unit_price),
      quantity: Number(l.quantity),
      is_free: Boolean(l.is_free),
    })),
  };
});
