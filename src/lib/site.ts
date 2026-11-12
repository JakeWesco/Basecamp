import "server-only";
import { headers } from "next/headers";

/**
 * The address this request came in on, e.g. https://basecamp.example or
 * http://localhost:3000, for building share links. NEXT_PUBLIC_SITE_URL wins
 * when set (production behind a proxy).
 */
export async function siteOrigin(): Promise<string> {
  const fixed = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fixed) return fixed;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/** wa.me link that opens a chat with one number, message filled in. */
export function whatsAppChat(phone: string | null | undefined, message: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
