import { describe, expect, it } from "vitest";
import {
  EMPTY_CONTACT_FORM, formFromContact, fromDateInputValue, isValidLinkedinUrl, toDateInputValue,
} from "../components/contactForm";
import type { Contact } from "../lib/db";

const last = new Date("2026-09-01T12:00:00");
const contact = {
  id: "c1", name: "Sarah", role: "EM", company: "Google", email: "s@g.com", linkedinUrl: "https://linkedin.com/in/s",
  strength: "hot", lastContactedAt: last, notes: "met at conf", checkInEveryDays: 30, jobIds: ["j1"], interactions: [],
} as unknown as Contact;

describe("contact form", () => {
  it("carries every editable field from the contact", () => {
    expect(formFromContact(contact)).toEqual({
      name: "Sarah", role: "EM", company: "Google", email: "s@g.com", linkedinUrl: "https://linkedin.com/in/s",
      strength: "hot", lastContactedAt: last, notes: "met at conf",
    });
  });
  it("defaults new contacts to warm, never contacted", () => {
    expect(EMPTY_CONTACT_FORM).toMatchObject({ strength: "warm", lastContactedAt: null, linkedinUrl: "" });
  });
  it("round-trips the date input without a day shift", () => {
    expect(toDateInputValue(fromDateInputValue("2026-01-31"))).toBe("2026-01-31");
    expect(fromDateInputValue("")).toBeNull();
    expect(toDateInputValue(null)).toBe("");
    expect(fromDateInputValue("2026-01-31")!.getHours()).toBe(12);
  });
  it("accepts empty or https LinkedIn links only", () => {
    expect(isValidLinkedinUrl("")).toBe(true);
    expect(isValidLinkedinUrl("https://linkedin.com/in/x")).toBe(true);
    expect(isValidLinkedinUrl("http://linkedin.com/in/x")).toBe(false);
    expect(isValidLinkedinUrl("linkedin.com/in/x")).toBe(false);
  });
});
