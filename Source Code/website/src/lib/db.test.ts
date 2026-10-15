import { Timestamp, serverTimestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import {
  contactFromDoc, contactUpdate, hostnameOf, jobFromDoc, jobStatusChange, jobUpdate, newAccountDoc,
  newContactDoc, newJobDoc, toDate,
} from "./db";

const now = new Date("2026-10-14T12:00:00Z");
const isServerTs = (v: unknown) => serverTimestamp().isEqual(v as ReturnType<typeof serverTimestamp>);

describe("helpers", () => {
  it("toDate handles Timestamp, null and junk", () => {
    expect(toDate(Timestamp.fromDate(now))?.toISOString()).toBe(now.toISOString());
    expect(toDate(null)).toBeNull();
    expect(toDate("Oct 14, 2026")).toBeNull();
  });
  it("hostnameOf strips www and tolerates junk", () => {
    expect(hostnameOf("https://www.linkedin.com/jobs/view/1")).toBe("linkedin.com");
    expect(hostnameOf("not a url")).toBe("");
    expect(hostnameOf("")).toBe("");
  });
});

describe("jobs", () => {
  const input = { company: " Acme ", title: "Intern", status: "saved" as const, priority: "medium" as const };
  it("newJobDoc fills every field with one history entry", () => {
    const d = newJobDoc({ ...input, url: "https://www.acme.com/j" }, "manual", now);
    expect(d.company).toBe("Acme");
    expect(d.sourceSite).toBe("acme.com");
    expect(d.history).toEqual([{ status: "saved", at: Timestamp.fromDate(now) }]);
    expect(d.appliedAt).toBeNull();
    expect(d.interviews).toEqual([]);
    expect(isServerTs(d.createdAt) && isServerTs(d.updatedAt)).toBe(true);
    expect(Object.keys(d).sort()).toEqual([
      "appliedAt", "company", "createdAt", "deadlineAt", "description", "followedUpAt", "fromDiscover", "history",
      "interviews", "location", "notes", "priority", "salary", "source", "sourceSite", "status", "title", "updatedAt", "url",
    ]);
  });
  it("newJobDoc as applied sets appliedAt to server time", () => {
    expect(isServerTs(newJobDoc({ ...input, status: "applied" }, "extension", now).appliedAt)).toBe(true);
  });
  it("jobUpdate without status change leaves history alone", () => {
    const job = jobFromDoc("j1", newJobDocAsStored());
    const u = jobUpdate(job, { ...input, notes: "hi" }, now);
    expect(u.history).toBeUndefined();
    expect(u.notes).toBe("hi");
    expect(isServerTs(u.updatedAt)).toBe(true);
  });
  it("jobStatusChange appends history and stamps appliedAt once", () => {
    const job = jobFromDoc("j1", newJobDocAsStored());
    const u = jobStatusChange(job, "applied", now)!;
    expect(u.history).toHaveLength(2);
    expect(isServerTs(u.appliedAt)).toBe(true);
    expect(u.followedUpAt).toBeNull();
    const applied = { ...job, status: "applied" as const, appliedAt: now };
    expect(jobStatusChange(applied, "interviewing", now)!.appliedAt).toBeUndefined();
  });
  it("jobStatusChange to same status is a no-op", () => {
    expect(jobStatusChange(jobFromDoc("j1", newJobDocAsStored()), "saved", now)).toBeNull();
  });
  it("jobFromDoc tolerates missing fields", () => {
    const j = jobFromDoc("x", { company: "A", title: "B" });
    expect(j.status).toBe("saved");
    expect(j.history).toEqual([]);
    expect(j.interviews).toEqual([]);
  });
});

describe("contacts and account", () => {
  it("newContactDoc normalizes", () => {
    const d = newContactDoc({ name: " Pat ", strength: "warm", lastContactedAt: now });
    expect(d.name).toBe("Pat");
    expect(d.lastContactedAt).toEqual(Timestamp.fromDate(now));
    expect(d.jobIds).toEqual([]);
  });
  it("contactUpdate keeps createdAt out", () => {
    const c = contactFromDoc("c1", { name: "Pat", strength: "hot" });
    expect("createdAt" in contactUpdate(c, { name: "Pat", strength: "cold", lastContactedAt: null })).toBe(false);
  });
  it("newAccountDoc matches the rules' create shape", () => {
    const d = newAccountDoc({ email: "a@b.com", displayName: "Ada Lovelace" });
    expect(d).toMatchObject({ email: "a@b.com", firstName: "Ada", lastName: "Lovelace", birthDate: "", status: "active", onboarded: false, goals: { weeklyApplications: null } });
  });
});

function newJobDocAsStored() {
  return {
    company: "Acme", title: "Intern", location: "", url: "", status: "saved", priority: "medium", notes: "", salary: "",
    source: "manual", sourceSite: "", description: "", deadlineAt: null, appliedAt: null, followedUpAt: null,
    history: [{ status: "saved", at: Timestamp.fromDate(now) }], interviews: [], fromDiscover: null,
    createdAt: Timestamp.fromDate(now), updatedAt: Timestamp.fromDate(now),
  };
}
