import "server-only";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { brandStyle, validHex, validLogoUrl, type Brand } from "./brand-colors";

/**
 * Reads an outfitter's name, logo and colours. RLS only returns the row to
 * members of that outfitter. Falls back to Basecamp's colours when unset.
 */
export async function getOutfitterBrand(outfitterId: string, fallbackName = ""): Promise<Brand> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("outfitters")
    .select("name, logo_url, brand_primary, brand_accent")
    .eq("id", outfitterId)
    .maybeSingle();
  return {
    name: data?.name ?? fallbackName,
    logoUrl: validLogoUrl(data?.logo_url),
    primary: validHex(data?.brand_primary),
    accent: validHex(data?.brand_accent),
  };
}

/** Wrap any page a hunter sees: everything inside uses the outfitter's colours. */
export function BrandScope({ brand, children, className }: { brand: Brand; children: ReactNode; className?: string }) {
  return (
    <div data-brand="outfitter" style={brandStyle(brand)} className={className}>
      {children}
    </div>
  );
}
