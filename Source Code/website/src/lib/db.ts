/**
 * The only module that knows Firestore paths and document shapes.
 * Layout and limits: docs/superpowers/specs/2026-10-14-firestore-restructure-design.md
 */
import type { DocumentData } from "firebase/firestore";
import { Timestamp, collection, doc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export type JobStatus = "saved" | "applied" | "interviewing" | "offer" | "rejected";
export type Priority = "high" | "medium" | "low";
export type JobSource = "manual" | "extension" | "discover";
export type InterviewType = "phone" | "video" | "onsite" | "technical" | "other";
export type Strength = "hot" | "warm" | "cold";
export type InteractionType = "email" | "call" | "coffee" | "message" | "meeting" | "other";
export type NoticeType = "info" | "success" | "warning";
export type AccountStatus = "active" | "suspended";

export const JOB_STATUSES: JobStatus[] = ["saved", "applied", "interviewing", "offer", "rejected"];
export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  saved: "Saved", applied: "Applied", interviewing: "Interviewing", offer: "Offer", rejected: "Rejected",
};
export const PRIORITY_LABEL: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };
export const STRENGTH_LABEL: Record<Strength, string> = { hot: "Hot", warm: "Warm", cold: "Cold" };

export interface HistoryEntry { status: JobStatus; at: Date }
export interface Interview { id: string; at: Date; type: InterviewType; round: number; location: string; notes: string }
export interface Interaction { id: string; at: Date; type: InteractionType; note: string }

export interface Job {
  id: string; company: string; title: string; location: string; url: string; status: JobStatus;
  priority: Priority; notes: string; salary: string; source: JobSource; sourceSite: string; description: string;
  deadlineAt: Date | null; appliedAt: Date | null; followedUpAt: Date | null; history: HistoryEntry[];
  interviews: Interview[]; fromDiscover: { roleKey: string; fitScore: number } | null;
  createdAt: Date | null; updatedAt: Date | null;
}
/** What the job form edits. */
export interface JobInput {
  company: string; title: string; status: JobStatus; priority: Priority;
  location?: string; url?: string; notes?: string; salary?: string; description?: string; deadlineAt?: Date | null;
  fromDiscover?: { roleKey: string; fitScore: number } | null;
}

export interface Contact {
  id: string; name: string; role: string; company: string; email: string; linkedinUrl: string; strength: Strength;
  lastContactedAt: Date | null; checkInEveryDays: number | null; jobIds: string[]; interactions: Interaction[];
  notes: string; createdAt: Date | null; updatedAt: Date | null;
}
export interface ContactInput {
  name: string; strength: Strength; lastContactedAt: Date | null;
  role?: string; company?: string; email?: string; linkedinUrl?: string; notes?: string;
}

export interface Account {
  uid: string; email: string; firstName: string; lastName: string; birthDate: string; status: AccountStatus;
  onboarded: boolean; goals: { weeklyApplications: number | null }; createdAt: Date | null; updatedAt: Date | null;
}

// ── Paths ─────────────────────────────────────────────────────────────────
export const refs = {
  user: (uid: string) => doc(db, "users", uid),
  jobs: (uid: string) => collection(db, "users", uid, "jobs"),
  job: (uid: string, id: string) => doc(db, "users", uid, "jobs", id),
  contacts: (uid: string) => collection(db, "users", uid, "contacts"),
  contact: (uid: string, id: string) => doc(db, "users", uid, "contacts", id),
  notifications: (uid: string) => collection(db, "users", uid, "notifications"),
  notification: (uid: string, id: string) => doc(db, "users", uid, "notifications", id),
  feedRequests: (uid: string) => collection(db, "users", uid, "feedRequests"),
  discoverSettings: (uid: string) => doc(db, "users", uid, "discover", "settings"),
  discoverFeed: (uid: string) => doc(db, "users", uid, "discover", "feed"),
  discoverTriage: (uid: string) => doc(db, "users", uid, "discover", "triage"),
  feeds: () => collection(db, "feeds"),
  feed: (id: string) => doc(db, "feeds", id),
  broadcasts: () => collection(db, "broadcasts"),
  adminLogs: () => collection(db, "adminLogs"),
  systemDiscover: () => doc(db, "system", "discover"),
  systemHealth: () => doc(db, "system", "health"),
};

// ── Helpers ───────────────────────────────────────────────────────────────
export function toDate(v: unknown): Date | null {
  return v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : null;
}
const ts = (d: Date | null | undefined) => (d ? Timestamp.fromDate(d) : null);
const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const oneOf = <T extends string>(v: unknown, all: readonly T[], d: T): T => (all.includes(v as T) ? (v as T) : d);

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// ── Jobs ──────────────────────────────────────────────────────────────────
export function jobFromDoc(id: string, d: DocumentData): Job {
  return {
    id, company: s(d.company, 200), title: s(d.title, 200), location: s(d.location, 200), url: s(d.url, 2000),
    status: oneOf(d.status, JOB_STATUSES, "saved"), priority: oneOf(d.priority, ["high", "medium", "low"] as const, "medium"),
    notes: typeof d.notes === "string" ? d.notes : "", salary: s(d.salary, 100),
    source: oneOf(d.source, ["manual", "extension", "discover"] as const, "manual"), sourceSite: s(d.sourceSite, 200),
    description: typeof d.description === "string" ? d.description : "",
    deadlineAt: toDate(d.deadlineAt), appliedAt: toDate(d.appliedAt), followedUpAt: toDate(d.followedUpAt),
    history: Array.isArray(d.history)
      ? d.history.flatMap((h: DocumentData) => {
          const at = toDate(h?.at);
          return at ? [{ status: oneOf(h.status, JOB_STATUSES, "saved"), at }] : [];
        })
      : [],
    interviews: Array.isArray(d.interviews)
      ? d.interviews.flatMap((i: DocumentData) => {
          const at = toDate(i?.at);
          return at && typeof i.id === "string"
            ? [{ id: i.id, at, type: oneOf(i.type, ["phone", "video", "onsite", "technical", "other"] as const, "other"),
                 round: Number(i.round) || 1, location: s(i.location, 300), notes: s(i.notes, 2000) }]
            : [];
        })
      : [],
    fromDiscover: d.fromDiscover && typeof d.fromDiscover.roleKey === "string"
      ? { roleKey: d.fromDiscover.roleKey, fitScore: Number(d.fromDiscover.fitScore) || 0 } : null,
    createdAt: toDate(d.createdAt), updatedAt: toDate(d.updatedAt),
  };
}

function editableJobFields(i: JobInput) {
  const url = s(i.url, 2000);
  return {
    company: s(i.company, 200), title: s(i.title, 200), location: s(i.location, 200), url,
    priority: i.priority, notes: (i.notes ?? "").slice(0, 5000), salary: s(i.salary, 100),
    description: (i.description ?? "").slice(0, 30000), deadlineAt: ts(i.deadlineAt), sourceSite: hostnameOf(url),
  };
}

/** A complete new job doc in the shape firestore.rules accepts. */
export function newJobDoc(i: JobInput, source: JobSource, now = new Date()): DocumentData {
  return {
    ...editableJobFields(i), status: i.status, source,
    appliedAt: i.status === "applied" ? serverTimestamp() : null, followedUpAt: null,
    history: [{ status: i.status, at: Timestamp.fromDate(now) }], interviews: [],
    fromDiscover: i.fromDiscover ?? null, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  };
}

/** Status move: appends history; first move to applied stamps appliedAt and restarts follow-ups.
 * Returns null when the status doesn't change. */
export function jobStatusChange(job: Job, status: JobStatus, now = new Date()): DocumentData | null {
  if (status === job.status) return null;
  const out: DocumentData = {
    status, updatedAt: serverTimestamp(),
    history: [...job.history.map((h) => ({ status: h.status, at: Timestamp.fromDate(h.at) })),
              { status, at: Timestamp.fromDate(now) }],
  };
  if (status === "applied" && !job.appliedAt) {
    out.appliedAt = serverTimestamp();
    out.followedUpAt = null;
  }
  return out;
}

/** Form save: edited fields plus, if the status changed, the status move. */
export function jobUpdate(job: Job, i: JobInput, now = new Date()): DocumentData {
  return { ...editableJobFields(i), ...(jobStatusChange(job, i.status, now) ?? {}), updatedAt: serverTimestamp() };
}

// ── Contacts ──────────────────────────────────────────────────────────────
export function contactFromDoc(id: string, d: DocumentData): Contact {
  return {
    id, name: s(d.name, 200), role: s(d.role, 200), company: s(d.company, 200), email: s(d.email, 200),
    linkedinUrl: s(d.linkedinUrl, 300), strength: oneOf(d.strength, ["hot", "warm", "cold"] as const, "warm"),
    lastContactedAt: toDate(d.lastContactedAt),
    checkInEveryDays: typeof d.checkInEveryDays === "number" ? d.checkInEveryDays : null,
    jobIds: Array.isArray(d.jobIds) ? d.jobIds.filter((x: unknown) => typeof x === "string") : [],
    interactions: Array.isArray(d.interactions)
      ? d.interactions.flatMap((x: DocumentData) => {
          const at = toDate(x?.at);
          return at && typeof x.id === "string"
            ? [{ id: x.id, at, type: oneOf(x.type, ["email", "call", "coffee", "message", "meeting", "other"] as const, "other"), note: s(x.note, 1000) }]
            : [];
        })
      : [],
    notes: typeof d.notes === "string" ? d.notes : "", createdAt: toDate(d.createdAt), updatedAt: toDate(d.updatedAt),
  };
}
function editableContactFields(i: ContactInput) {
  const linkedin = s(i.linkedinUrl, 300);
  return {
    name: s(i.name, 200), role: s(i.role, 200), company: s(i.company, 200), email: s(i.email, 200),
    linkedinUrl: linkedin.startsWith("https://") ? linkedin : "", strength: i.strength,
    lastContactedAt: ts(i.lastContactedAt), notes: (i.notes ?? "").slice(0, 5000),
  };
}
export function newContactDoc(i: ContactInput): DocumentData {
  return { ...editableContactFields(i), checkInEveryDays: null, jobIds: [], interactions: [],
           createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
}
export function contactUpdate(_c: Contact, i: ContactInput): DocumentData {
  return { ...editableContactFields(i), updatedAt: serverTimestamp() };
}

// ── Account ───────────────────────────────────────────────────────────────
export function accountFromDoc(uid: string, d: DocumentData): Account {
  return {
    uid, email: s(d.email, 320), firstName: s(d.firstName, 100), lastName: s(d.lastName, 100),
    birthDate: typeof d.birthDate === "string" ? d.birthDate : "",
    status: d.status === "suspended" ? "suspended" : "active", onboarded: d.onboarded === true,
    goals: { weeklyApplications: typeof d.goals?.weeklyApplications === "number" ? d.goals.weeklyApplications : null },
    createdAt: toDate(d.createdAt), updatedAt: toDate(d.updatedAt),
  };
}
/** First-sign-in account doc (allowed before email verification). */
export function newAccountDoc(u: { email: string | null; displayName: string | null }): DocumentData {
  const [first = "", ...rest] = (u.displayName ?? "").trim().split(/\s+/);
  return {
    email: u.email ?? "", firstName: first.slice(0, 100), lastName: rest.join(" ").slice(0, 100), birthDate: "",
    status: "active", onboarded: false, goals: { weeklyApplications: null },
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  };
}
