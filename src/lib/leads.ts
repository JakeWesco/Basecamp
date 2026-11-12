// Leads: labels, form checks, phone numbers in international format, and
// reading a pasted WhatsApp message or contact card. Pure functions, tested
// in tests/ui/leads.test.ts.

export const TEMPERATURES = ["hot", "warm", "cold"] as const;
export type Temperature = (typeof TEMPERATURES)[number];
export const TEMPERATURE_LABEL: Record<Temperature, string> = { hot: "Hot", warm: "Warm", cold: "Cold" };

export const LEAD_STATUSES = ["new", "contacted", "quoted", "booked", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  booked: "Booked",
  lost: "Lost",
};

export const SOURCES = ["show", "referral", "website", "whatsapp", "social_media", "past_client", "agent", "other"] as const;
/** Leads from the public hunt planner. Not offered in the form, but kept when such a lead is edited. */
export const PLANNER_SOURCE = "planner" as const;
export type Source = (typeof SOURCES)[number] | typeof PLANNER_SOURCE;
export const SOURCE_LABEL: Record<Source, string> = {
  planner: "Hunt planner",
  show: "Show",
  referral: "Referral",
  website: "Website",
  whatsapp: "WhatsApp",
  social_media: "Social media",
  past_client: "Past client",
  agent: "Agent",
  other: "Other",
};

export const BUDGETS = ["under_5000", "5000_10000", "10000_20000", "20000_40000", "over_40000"] as const;
export type Budget = (typeof BUDGETS)[number];
export const BUDGET_LABEL: Record<Budget, string> = {
  under_5000: "Under 5,000",
  "5000_10000": "5,000 to 10,000",
  "10000_20000": "10,000 to 20,000",
  "20000_40000": "20,000 to 40,000",
  over_40000: "Over 40,000",
};

/** Countries hunters often come from, and the outfitter countries, with dialling codes. */
export const COUNTRIES: { code: string; name: string; dial: string }[] = [
  { code: "US", name: "United States", dial: "1" },
  { code: "CA", name: "Canada", dial: "1" },
  { code: "DE", name: "Germany", dial: "49" },
  { code: "AT", name: "Austria", dial: "43" },
  { code: "CH", name: "Switzerland", dial: "41" },
  { code: "PL", name: "Poland", dial: "48" },
  { code: "CZ", name: "Czechia", dial: "420" },
  { code: "HU", name: "Hungary", dial: "36" },
  { code: "ES", name: "Spain", dial: "34" },
  { code: "FR", name: "France", dial: "33" },
  { code: "IT", name: "Italy", dial: "39" },
  { code: "PT", name: "Portugal", dial: "351" },
  { code: "NL", name: "Netherlands", dial: "31" },
  { code: "BE", name: "Belgium", dial: "32" },
  { code: "GB", name: "United Kingdom", dial: "44" },
  { code: "IE", name: "Ireland", dial: "353" },
  { code: "DK", name: "Denmark", dial: "45" },
  { code: "SE", name: "Sweden", dial: "46" },
  { code: "NO", name: "Norway", dial: "47" },
  { code: "FI", name: "Finland", dial: "358" },
  { code: "RU", name: "Russia", dial: "7" },
  { code: "MX", name: "Mexico", dial: "52" },
  { code: "AU", name: "Australia", dial: "61" },
  { code: "NZ", name: "New Zealand", dial: "64" },
  { code: "ZA", name: "South Africa", dial: "27" },
  { code: "NA", name: "Namibia", dial: "264" },
  { code: "BW", name: "Botswana", dial: "267" },
  { code: "ZW", name: "Zimbabwe", dial: "263" },
  { code: "ZM", name: "Zambia", dial: "260" },
  { code: "MZ", name: "Mozambique", dial: "258" },
  { code: "TZ", name: "Tanzania", dial: "255" },
].sort((a, b) => a.name.localeCompare(b.name));

const dialFor = (country?: string | null) => COUNTRIES.find((c) => c.code === country)?.dial;

/**
 * A phone number in international format: "+" and digits, like +27797091179.
 * Accepts spaces, dashes, brackets and a leading 00. A local number starting
 * with 0 gets the country's code when the country is known. Null if it can't
 * be read; "needs-country" if it's local and the country isn't known.
 */
export function normalisePhone(raw: string, country?: string | null): string | null | "needs-country" {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let digits = trimmed.replace(/[\s\-().\/]/g, "");
  if (!/^\+?\d+$/.test(digits)) return null;
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  if (!digits.startsWith("+")) {
    const dial = dialFor(country);
    if (!dial) return "needs-country";
    digits = "+" + dial + digits.replace(/^0+/, "");
  }
  return /^\+[1-9]\d{6,14}$/.test(digits) ? digits : null;
}

/** +27797091179 shown as "+27 79 709 1179"-ish: the code, then groups of three or four. */
export function formatPhone(e164: string): string {
  const c = COUNTRIES.map((x) => x.dial)
    .sort((a, b) => b.length - a.length)
    .find((d) => e164.startsWith("+" + d));
  const code = c ?? e164.slice(1, 3);
  const rest = e164.slice(1 + code.length);
  // Nine digits read as 3 3 3 in most countries (+48 501 234 567); South Africa writes 2 3 4.
  const groups =
    rest.length === 9 && code !== "27"
      ? [rest.slice(0, 3), rest.slice(3, 6), rest.slice(6)]
      : rest.length > 7
        ? [rest.slice(0, rest.length - 7), rest.slice(-7, -4), rest.slice(-4)]
        : [rest.slice(0, -4), rest.slice(-4)];
  return `+${code} ${groups.filter(Boolean).join(" ")}`;
}

// ---------------------------------------------------------------------------
// Form checks
// ---------------------------------------------------------------------------

export type LeadFieldErrors = Partial<
  Record<"fullName" | "email" | "phone" | "contact" | "hunters" | "observers" | "notes" | "roughDates" | "lostReason" | "form", string>
>;

export type LeadInput = {
  full_name: string;
  email: string | null;
  phone: string | null;
  country_code: string | null;
  source: Source | null;
  rough_dates: string | null;
  budget_band: Budget | null;
  hunters: number | null;
  observers: number | null;
  notes: string | null;
  temperature: Temperature;
  marketing_consent: boolean;
};

const text = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");
const pick = <T extends string>(v: unknown, list: readonly T[]): T | null => (list.includes(v as T) ? (v as T) : null);

function optionalCount(v: unknown, min: number, max: number): number | null | "bad" {
  const s = text(v);
  if (!s) return null;
  if (!/^\d+$/.test(s)) return "bad";
  const n = Number(s);
  return n >= min && n <= max ? n : "bad";
}

export function checkLead(input: Record<string, unknown>): { ok: true; value: LeadInput } | { ok: false; errors: LeadFieldErrors } {
  const errors: LeadFieldErrors = {};
  const fullName = text(input.fullName);
  if (!fullName) errors.fullName = "Enter the hunter's name.";
  else if (fullName.length > 120) errors.fullName = "That name is too long. Keep it under 120 characters.";

  const country = pick(text(input.country).toUpperCase(), COUNTRIES.map((c) => c.code));

  const email = text(input.email).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "That email address looks incomplete.";

  const rawPhone = text(input.phone);
  let phone: string | null = null;
  if (rawPhone) {
    const p = normalisePhone(rawPhone, country);
    if (p === "needs-country") errors.phone = "Add the country code, like +49 151 2345 6789, or choose the country under More details.";
    else if (p === null) errors.phone = "That phone number looks wrong. Use digits with the country code, like +27 79 709 1179.";
    else phone = p;
  }
  if (!email && !rawPhone) errors.contact = "Add a phone number or an email, so you can reach them.";

  const hunters = optionalCount(input.hunters, 1, 20);
  if (hunters === "bad") errors.hunters = "Enter the number of hunters, from 1 to 20.";
  const observers = optionalCount(input.observers, 0, 20);
  if (observers === "bad") errors.observers = "Enter the number of observers, from 0 to 20.";

  const roughDates = text(input.roughDates);
  if (roughDates.length > 100) errors.roughDates = "Keep the dates short, like June 2027.";
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  if (notes.length > 2000) errors.notes = "Notes can be up to 2000 characters. Shorten them a little.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      full_name: fullName,
      email: email || null,
      phone,
      country_code: country,
      source: pick(input.source, [...SOURCES, PLANNER_SOURCE]),
      rough_dates: roughDates || null,
      budget_band: pick(input.budget, BUDGETS),
      hunters: hunters as number | null,
      observers: observers as number | null,
      notes: notes || null,
      temperature: pick(input.temperature, TEMPERATURES) ?? "warm",
      marketing_consent: input.consent === "on" || input.consent === true,
    },
  };
}

export function checkLostReason(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const r = text(raw);
  if (!r) return { ok: false, error: "Add a short reason, like “booked elsewhere” or “no budget this year”." };
  if (r.length > 200) return { ok: false, error: "Keep the reason short, under 200 characters." };
  return { ok: true, value: r };
}

// ---------------------------------------------------------------------------
// Paste from WhatsApp
// ---------------------------------------------------------------------------

export type Pasted = { fullName?: string; phone?: string; email?: string; notes?: string };

const NAME = /^[\p{L}][\p{L}'’. -]{1,60}$/u;

function looksLikeName(s: string) {
  const t = s.trim();
  return NAME.test(t) && t.split(/\s+/).length <= 5 && !/^(hi|hello|hallo|hey|dear|good|thanks|thank)\b/i.test(t);
}

/**
 * Pulls a name, phone and email out of a pasted WhatsApp contact card (vCard),
 * a chat line ("[12/11/2026, 10:15] Jan Kowalski: ...") or plain text. Only
 * fills what it finds; the person checks the form before saving.
 */
export function parseWhatsApp(raw: string): Pasted {
  const out: Pasted = {};
  const textIn = raw.replace(/\r\n?/g, "\n").trim();
  if (!textIn) return out;

  // Contact card
  const fn = textIn.match(/^FN[^:\n]*:(.+)$/im);
  if (fn) out.fullName = fn[1].trim();
  else {
    const n = textIn.match(/^N[;:]([^\n]*)$/im);
    if (n) {
      const [last, first] = n[1].replace(/^[^:]*:/, "").split(";");
      const name = [first, last].filter((x) => x && x.trim()).join(" ").trim();
      if (name) out.fullName = name;
    }
  }
  const waid = textIn.match(/waid=(\d{7,15})/i);
  const tel = textIn.match(/^(?:item\d+\.)?TEL[^:\n]*:(.+)$/im);
  const email = textIn.match(/[^\s@<>:;"']+@[^\s@<>:;"']+\.[A-Za-z]{2,}/);
  if (email) out.email = email[0].toLowerCase();

  const phoneCandidate = waid ? `+${waid[1]}` : tel ? tel[1].trim() : textIn.match(/(?:\+|00)\d[\d\s\-().]{6,20}\d/)?.[0];
  if (phoneCandidate) {
    const p = normalisePhone(phoneCandidate);
    if (p && p !== "needs-country") out.phone = p;
  }

  if (!out.fullName) {
    // WhatsApp chat export: "[12/11/2026, 10:15] Jan Kowalski: message" or "12/11/2026, 10:15 - Jan Kowalski: message"
    const chat = textIn.match(/^\[?\d{1,4}[./-]\d{1,2}[./-]\d{1,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?\]?\s*(?:-\s*)?([^:\n]{2,60}):\s*(.*)$/im);
    if (chat && looksLikeName(chat[1]) && !/^\+?\d/.test(chat[1])) {
      out.fullName = chat[1].trim();
      out.notes = chat[2].trim() || undefined;
    }
  }
  if (!out.fullName) {
    const labelled = textIn.match(/^(?:name|naam|nombre|nom|imi[eę] i nazwisko)\s*[:\-]\s*(.+)$/im);
    if (labelled && looksLikeName(labelled[1])) out.fullName = labelled[1].trim();
  }
  if (!out.fullName) {
    // "My name is Mike Turner from Texas": capitalised words after the phrase.
    const intro = textIn.match(/\b(?:my name is|i am|i'm|this is|ich bin|mein name ist|nazywam si[eę]|me llamo|je m'appelle)\s+(.+)/i);
    const name = intro?.[1].match(/^\p{Lu}[\p{L}'’-]+(?:\s+\p{Lu}[\p{L}'’-]+){0,3}/u)?.[0];
    if (name && looksLikeName(name)) out.fullName = name.trim();
  }
  if (!out.fullName) {
    const first = textIn.split("\n").map((l) => l.trim()).find(Boolean);
    if (first && looksLikeName(first) && first.split(/\s+/).length >= 2) out.fullName = first;
  }
  // Keep the message as notes, but only when it told us who it is from.
  const found = Boolean(out.fullName || out.phone || out.email);
  if (found && !out.notes && !fn && textIn.length <= 2000) {
    const message = textIn
      .split("\n")
      .filter((l) => !(out.fullName && l.trim() === out.fullName) && !(out.email && l.toLowerCase().includes(out.email)))
      .join("\n")
      .trim();
    if (message.length > 20) out.notes = message;
  }
  return out;
}
