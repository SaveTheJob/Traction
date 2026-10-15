import { describe, expect, it } from "vitest";
import { normalizeSettings, cardView } from "./discover";

describe("discover settings", () => {
  it("normalizes alerts and hidden companies with defaults", () => {
    const s = normalizeSettings({ companies: { warm: ["A"] }, alerts: { webhook: "x", minScore: 500 } });
    expect(s.companies).toEqual({ warm: ["A"], target: [], hidden: [] });
    expect(s.alerts.minScore).toBe(100);
  });

  it("always yields integer scores inside the rule ranges and drops invalid webhooks", () => {
    const s = normalizeSettings({ minScore: 12.6, alerts: { webhook: "x", minScore: "7" } });
    expect(s.minScore).toBe(40);
    expect(s.alerts).toEqual({ webhook: "", minScore: 70 });
    expect(Number.isInteger(normalizeSettings({ minScore: 77.5 }).minScore)).toBe(true);
  });
});

describe("cardView", () => {
  const card = { roleKey: "k", company: "Acme", title: "T", score: 80, closed: false } as never;
  it("merges triage status, defaulting to new", () => {
    expect(cardView(card, {}).status).toBe("new");
    expect(cardView(card, { k: { status: "saved", jobId: "j", at: null } }).status).toBe("saved");
    expect(cardView(card, { k: { status: "saved", jobId: "j", at: null } }).jobId).toBe("j");
  });
});
