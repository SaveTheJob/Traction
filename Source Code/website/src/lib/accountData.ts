import { Timestamp, deleteDoc, getDoc, getDocs, writeBatch } from "firebase/firestore";
import type { DocumentReference } from "firebase/firestore";
import { db } from "./firebase";
import { refs } from "./db";

export function chunk<T>(items: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
}

export function serializeForExport(v: unknown): unknown {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(serializeForExport);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, serializeForExport(x)]));
  return v;
}

/** Everything stored for this user, as one JSON file. */
export async function exportAccountData(uid: string): Promise<Blob> {
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString() };
  const acct = await getDoc(refs.user(uid));
  out.account = acct.exists() ? acct.data() : null;
  out.jobs = (await getDocs(refs.jobs(uid))).docs.map((d) => ({ id: d.id, ...d.data() }));
  out.contacts = (await getDocs(refs.contacts(uid))).docs.map((d) => ({ id: d.id, ...d.data() }));
  out.notifications = (await getDocs(refs.notifications(uid))).docs.map((d) => ({ id: d.id, ...d.data() }));
  out.feedRequests = (await getDocs(refs.feedRequests(uid))).docs.map((d) => ({ id: d.id, ...d.data() }));
  const discover: Record<string, unknown> = {};
  for (const [name, ref] of [["settings", refs.discoverSettings(uid)], ["feed", refs.discoverFeed(uid)], ["triage", refs.discoverTriage(uid)]] as const) {
    const snap = await getDoc(ref);
    discover[name] = snap.exists() ? snap.data() : null;
  }
  out.discover = discover;
  return new Blob([JSON.stringify(serializeForExport(out), null, 2)], { type: "application/json" });
}

/** Deletes every document under users/{uid}, then the account doc. The caller deletes the
 * Auth user afterwards, so a failure here never leaves an Auth user without its data deleted. */
export async function deleteAccountData(uid: string, onProgress?: (deleted: number) => void): Promise<void> {
  const targets: DocumentReference[] = [];
  for (const col of [refs.jobs(uid), refs.contacts(uid), refs.notifications(uid), refs.feedRequests(uid)]) {
    (await getDocs(col)).forEach((d) => targets.push(d.ref));
  }
  targets.push(refs.discoverSettings(uid), refs.discoverFeed(uid), refs.discoverTriage(uid));
  let deleted = 0;
  for (const part of chunk(targets, 400)) {
    const batch = writeBatch(db);
    part.forEach((r) => batch.delete(r));
    await batch.commit();
    deleted += part.length;
    onProgress?.(deleted);
  }
  await deleteDoc(refs.user(uid));
}
