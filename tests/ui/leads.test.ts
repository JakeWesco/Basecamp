import { describe, expect, it } from "vitest";
import { checkLead, checkLostReason, formatPhone, normalisePhone, parseWhatsApp } from "../../src/lib/leads";

describe("phone numbers", () => {
  it("stores international format, whatever people type", () => {
    expect(normalisePhone("+27 79 709 1179")).toBe("+27797091179");
    expect(normalisePhone("0049 (151) 2345-6789")).toBe("+4915123456789");
    expect(normalisePhone("079 709 1179", "ZA")).toBe("+27797091179");
    expect(normalisePhone("(512) 555-0142", "US")).toBe("+15125550142");
  });

  it("asks for the country when a local number has none, and rejects junk", () => {
    expect(normalisePhone("079 709 1179")).toBe("needs-country");
    expect(normalisePhone("call me")).toBeNull();
    expect(normalisePhone("+12")).toBeNull();
  });

  it("shows numbers in readable groups", () => {
    expect(formatPhone("+27797091179")).toBe("+27 79 709 1179");
    expect(formatPhone("+4915123456789")).toBe("+49 1512 345 6789");
    expect(formatPhone("+48501234567")).toBe("+48 501 234 567");
  });
});

describe("lead form", () => {
  it("needs a name and a phone or an email", () => {
    const r = checkLead({ fullName: "", email: "", phone: "" });
    expect(!r.ok && r.errors).toMatchObject({ fullName: "Enter the hunter's name.", contact: expect.stringMatching(/phone number or an email/) });
  });

  it("accepts a quick lead from a show stand", () => {
    const r = checkLead({ fullName: " Jan  Kowalski ", phone: "+48 501 234 567", temperature: "hot" });
    expect(r.ok && r.value).toMatchObject({ full_name: "Jan Kowalski", phone: "+48501234567", email: null, temperature: "hot", marketing_consent: false });
  });

  it("uses the country for a local number and explains when it's missing", () => {
    expect(checkLead({ fullName: "Piet", phone: "082 555 1234", country: "ZA" }).ok).toBe(true);
    const r = checkLead({ fullName: "Piet", phone: "082 555 1234" });
    expect(!r.ok && r.errors.phone).toMatch(/Add the country code/);
  });

  it("keeps consent off unless ticked, and checks the extras", () => {
    expect(checkLead({ fullName: "A B", email: "a@b.de", consent: "on" }).ok && checkLead({ fullName: "A B", email: "a@b.de", consent: "on" })).toMatchObject({
      value: { marketing_consent: true },
    });
    const r = checkLead({ fullName: "A B", email: "a@", hunters: "0", observers: "x" });
    expect(!r.ok && r.errors).toMatchObject({ email: "That email address looks incomplete.", hunters: expect.any(String), observers: expect.any(String) });
  });

  it("needs a reason when a lead is lost", () => {
    expect(checkLostReason("").ok).toBe(false);
    expect(checkLostReason(" Booked elsewhere ")).toEqual({ ok: true, value: "Booked elsewhere" });
  });
});

describe("paste from WhatsApp", () => {
  it("reads a shared contact card", () => {
    const card = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Kowalski;Jan;;;",
      "FN:Jan Kowalski",
      "item1.TEL;waid=48501234567:+48 501 234 567",
      "item1.X-ABLabel:Mobile",
      "EMAIL;type=INTERNET:Jan.Kowalski@Example.pl",
      "END:VCARD",
    ].join("\n");
    expect(parseWhatsApp(card)).toEqual({ fullName: "Jan Kowalski", phone: "+48501234567", email: "jan.kowalski@example.pl" });
  });

  it("reads a copied chat message", () => {
    const msg = "[12/11/2026, 10:15] Hans Becker: Hello, we are two hunters interested in kudu and gemsbok in June. My number is +49 151 2345 6789, email hans.becker@jagd.de";
    expect(parseWhatsApp(msg)).toMatchObject({
      fullName: "Hans Becker",
      phone: "+4915123456789",
      email: "hans.becker@jagd.de",
      notes: expect.stringMatching(/kudu and gemsbok/),
    });
  });

  it("reads plain text with a name line or an introduction", () => {
    expect(parseWhatsApp("Name: Carlos Ruiz\nTel: +34 612 345 678")).toMatchObject({ fullName: "Carlos Ruiz", phone: "+34612345678" });
    expect(parseWhatsApp("Hi, my name is Mike Turner from Texas. Looking at a plains game hunt for 2027.").fullName).toBe("Mike Turner");
  });

  it("only fills what it finds", () => {
    expect(parseWhatsApp("Hello, is June still open?")).toEqual({});
    expect(parseWhatsApp("")).toEqual({});
  });
});
