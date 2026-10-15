import type { Contact, ContactInput } from "../lib/db";

/** Every ContactInput field as form state, so an edit round-trips fields the form doesn't show. */
export type ContactForm = ContactInput & {
  role: string; company: string; email: string; linkedinUrl: string; notes: string;
  lastContactedAt: Date | null;
};

export const EMPTY_CONTACT_FORM: ContactForm = {
  name: "", role: "", company: "", email: "", linkedinUrl: "", strength: "warm", lastContactedAt: null, notes: "",
};

export function formFromContact(c: Contact): ContactForm {
  return {
    name: c.name, role: c.role, company: c.company, email: c.email, linkedinUrl: c.linkedinUrl,
    strength: c.strength, lastContactedAt: c.lastContactedAt, notes: c.notes,
  };
}

/** Date to the `YYYY-MM-DD` an `<input type="date">` uses (local calendar day). */
export function toDateInputValue(d: Date | null): string {
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** `YYYY-MM-DD` to a noon-local Date (avoids timezone day shifts); empty means null. */
export function fromDateInputValue(v: string): Date | null {
  return v ? new Date(`${v}T12:00:00`) : null;
}

/** LinkedIn is optional; if given it must be a full https:// link (the rules require it). */
export function isValidLinkedinUrl(v: string): boolean {
  const t = v.trim();
  return t === "" || t.startsWith("https://");
}
