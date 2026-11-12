import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { validHex, validLogoUrl, type Brand } from "@/lib/brand-colors";

// The outfitter behind a planner page, from public.planner_outfitter(slug).
// Null when the slug is wrong or the planner is switched off.

export type PlannerOutfitter = {
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  language: string | null;
  brand: Brand;
};

export const getPlannerOutfitter = cache(async (slug: string): Promise<PlannerOutfitter | null> => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("planner_outfitter", { p_slug: slug });
  if (error || !data) return null;
  const o = data as Record<string, string | null>;
  return {
    name: String(o.name),
    phone: o.phone,
    email: o.email,
    website: o.website,
    language: o.language,
    brand: {
      name: String(o.name),
      logoUrl: validLogoUrl(o.logo_url),
      primary: validHex(o.brand_primary),
      accent: validHex(o.brand_accent),
    },
  };
});
