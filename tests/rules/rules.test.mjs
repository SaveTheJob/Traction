import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
  Timestamp, addDoc, collection, collectionGroup, deleteDoc, deleteField, doc, getCountFromServer,
  getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where,
} from "firebase/firestore";

const ADMIN = "7l0wLOQs3BdKoyUlMPqTCqhfC802";
let env;
const ctx = (uid, extra = {}) =>
  env.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: true, ...extra }).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const minsAgo = (m) => Timestamp.fromMillis(Date.now() - m * 60_000);

const job = (over = {}) => ({
  company: "Acme", title: "Intern", location: "", url: "https://acme.com/j/1", status: "saved",
  priority: "medium", notes: "", salary: "", source: "manual", sourceSite: "acme.com", description: "",
  deadlineAt: null, appliedAt: null, followedUpAt: null,
  history: [{ status: "saved", at: Timestamp.now() }], interviews: [], fromDiscover: null,
  createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...over,
});
const iv = (i) => ({ id: `i${i}`, at: Timestamp.fromMillis(Date.now() + 86400000), type: "video", round: 1, location: "Zoom", notes: "" });
const sameAt = Timestamp.fromMillis(1700000000000);
const bigHistory = () => Array.from({ length: 49 }, (_, i) => ({ status: "saved", at: Timestamp.fromMillis(1700000000000 + i) }));
const contact = (over = {}) => ({
  name: "Pat", role: "", company: "", email: "", linkedinUrl: "", strength: "warm",
  lastContactedAt: null, checkInEveryDays: null, jobIds: [], interactions: [], notes: "",
  createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...over,
});
const account = (uid, over = {}) => ({
  email: `${uid}@example.com`, firstName: "", lastName: "", birthDate: "", status: "active",
  onboarded: false, goals: { weeklyApplications: null }, createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(), ...over,
});
const settings = (over = {}) => ({
  enabled: true, tracks: ["intern"], graduation: "2027-12", terms: { available: ["Summer 2027"], partTime: [] },
  needsSponsorship: true, locations: { preferred: ["Phoenix, AZ"], remoteOk: true }, roleFamilies: ["embedded"],
  includeKeywords: [], excludeKeywords: [], companies: { warm: [], target: [], hidden: [] }, minScore: 60,
  alerts: { webhook: "", minScore: 70 }, updatedAt: serverTimestamp(), ...over,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-offerward",
    firestore: { host: "127.0.0.1", port: 8086, rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8") },
  });
});
after(async () => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, "users/u1"), { ...account("u1"), createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    await setDoc(doc(db, "users/u1/jobs/j1"), { ...job(), history: [{ status: "saved", at: sameAt }], createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    await setDoc(doc(db, "users/u1/jobs/full"), { ...job(), history: [...bigHistory(), { status: "saved", at: sameAt }], createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    await setDoc(doc(db, "users/u1/jobs/big"), {
      ...job(), history: bigHistory(), interviews: Array.from({ length: 20 }, (_, i) => iv(i)),
      createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "users/u1/contacts/c1"), { ...contact(), createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    await setDoc(doc(db, "users/u1/notifications/n1"), { message: "hi", type: "info", read: false, createdAt: Timestamp.now() });
    await setDoc(doc(db, "users/u1/discover/feed"), { cards: [], cap: 300 });
    await setDoc(doc(db, "users/u1/discover/triage"), { cards: { k1: { status: "saved", at: Timestamp.now() } }, updatedAt: Timestamp.now() });
    await setDoc(doc(db, "users/u1/feedRequests/f1"), { company: "Axon", url: "https://x", status: "pending", createdAt: Timestamp.now() });
    await setDoc(doc(db, "feeds/greenhouse-axon"), { company: "Axon", origin: "user" });
    await setDoc(doc(db, "feeds/workday-nxp-careers"), { company: "NXP", origin: "config" });
    await setDoc(doc(db, "broadcasts/b1"), { message: "hello", type: "info", createdBy: ADMIN, createdAt: Timestamp.now() });
    await setDoc(doc(db, "system/discover"), { roleFamilies: [], inviteOnly: true });
    await setDoc(doc(db, "system/health"), { lastRun: {} });
    await setDoc(doc(db, "adminLogs/l1"), { action: "x" });
  });
});

describe("signed out", () => {
  test("cannot read an account", () => assertFails(getDoc(doc(anon(), "users/u1"))));
  test("cannot read jobs", () => assertFails(getDocs(collection(anon(), "users/u1/jobs"))));
  test("cannot read feeds", () => assertFails(getDocs(collection(anon(), "feeds"))));
  test("unknown collection denied", () => assertFails(setDoc(doc(ctx("u1"), "random/x"), { a: 1 })));
});

describe("account doc", () => {
  test("owner reads own", () => assertSucceeds(getDoc(doc(ctx("u1"), "users/u1"))));
  test("other user cannot read", () => assertFails(getDoc(doc(ctx("u2"), "users/u1"))));
  test("unverified user can create own account doc", () =>
    assertSucceeds(setDoc(doc(ctx("u3", { email_verified: false }), "users/u3"), account("u3"))));
  test("cannot create with another email", () =>
    assertFails(setDoc(doc(ctx("u3"), "users/u3"), account("u3", { email: "boss@example.com" }))));
  test("cannot create suspended or with extra fields", async () => {
    await assertFails(setDoc(doc(ctx("u3"), "users/u3"), account("u3", { status: "suspended" })));
    await assertFails(setDoc(doc(ctx("u4"), "users/u4"), account("u4", { plan: "pro" })));
  });
  test("owner edits name, birthDate, onboarded, goals", () =>
    assertSucceeds(updateDoc(doc(ctx("u1"), "users/u1"), {
      firstName: "Yug", birthDate: "2004-05-17", onboarded: true, goals: { weeklyApplications: 10 }, updatedAt: serverTimestamp(),
    })));
  test("bad birthDate / goal rejected", async () => {
    await assertFails(updateDoc(doc(ctx("u1"), "users/u1"), { birthDate: "05/17/2004", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(ctx("u1"), "users/u1"), { goals: { weeklyApplications: 0 }, updatedAt: serverTimestamp() }));
  });
  test("owner cannot change status", () =>
    assertFails(updateDoc(doc(ctx("u1"), "users/u1"), { status: "suspended", updatedAt: serverTimestamp() })));
  test("unverified owner cannot update", () =>
    assertFails(updateDoc(doc(ctx("u1", { email_verified: false }), "users/u1"), { firstName: "X", updatedAt: serverTimestamp() })));
  test("admin suspends", () => assertSucceeds(updateDoc(doc(ctx(ADMIN), "users/u1"), { status: "suspended" })));
  test("admin lists users and counts", async () => {
    await assertSucceeds(getDocs(query(collection(ctx(ADMIN), "users"), where("email", "==", "u1@example.com"))));
    await assertSucceeds(getCountFromServer(collection(ctx(ADMIN), "users")));
  });
  test("non-admin cannot list users", () => assertFails(getDocs(collection(ctx("u1"), "users"))));
  test("owner deletes own account doc", () => assertSucceeds(deleteDoc(doc(ctx("u1"), "users/u1"))));
});

describe("jobs", () => {
  const jobs = (db) => collection(db, "users/u1/jobs");
  test("owner creates a valid job", () => assertSucceeds(addDoc(jobs(ctx("u1")), job())));
  test("applied job needs appliedAt server time", async () => {
    await assertSucceeds(addDoc(jobs(ctx("u1")), job({ status: "applied", appliedAt: serverTimestamp(), history: [{ status: "applied", at: Timestamp.now() }] })));
    await assertFails(addDoc(jobs(ctx("u1")), job({ status: "applied", appliedAt: null, history: [{ status: "applied", at: Timestamp.now() }] })));
  });
  test("unverified owner cannot create", () => assertFails(addDoc(jobs(ctx("u1", { email_verified: false })), job())));
  test("other user cannot create or read", async () => {
    await assertFails(addDoc(jobs(ctx("u2")), job()));
    await assertSucceeds(addDoc(jobs(ctx("u1")), job()));
    await assertFails(getDoc(doc(ctx("u2"), "users/u1/jobs/j1")));
    await assertSucceeds(getDoc(doc(ctx("u1"), "users/u1/jobs/j1")));
  });
  test("unknown field, bad status, missing company rejected", async () => {
    await assertFails(addDoc(jobs(ctx("u1")), job({ isAdmin: true })));
    await assertFails(addDoc(jobs(ctx("u1")), job({ status: "hired", history: [{ status: "hired", at: Timestamp.now() }] })));
    await assertFails(addDoc(jobs(ctx("u1")), job({ company: "" })));
    // positive controls: same writes, offending value corrected
    await assertSucceeds(addDoc(jobs(ctx("u1")), job()));
    await assertSucceeds(addDoc(jobs(ctx("u1")), job({ status: "offer", history: [{ status: "offer", at: Timestamp.now() }] })));
    await assertSucceeds(addDoc(jobs(ctx("u1")), job({ company: "Acme" })));
  });
  test("history must start with one entry matching status", async () => {
    await assertFails(addDoc(jobs(ctx("u1")), job({ history: [] })));
    await assertFails(addDoc(jobs(ctx("u1")), job({ history: [{ status: "applied", at: Timestamp.now() }] })));
    await assertSucceeds(addDoc(jobs(ctx("u1")), job({ history: [{ status: "saved", at: Timestamp.now() }] })));
  });
  test("history time within skew window", async () => {
    await assertSucceeds(addDoc(jobs(ctx("u1")), job({ history: [{ status: "saved", at: minsAgo(4) }] })));
    await assertFails(addDoc(jobs(ctx("u1")), job({ history: [{ status: "saved", at: minsAgo(10) }] })));
  });
  test("status move appends exactly one history entry", async () => {
    const ref = doc(ctx("u1"), "users/u1/jobs/j1");
    let snap;
    await env.withSecurityRulesDisabled(async (c) => { snap = (await getDoc(doc(c.firestore(), "users/u1/jobs/j1"))).data(); });
    await assertSucceeds(updateDoc(ref, {
      status: "applied", appliedAt: serverTimestamp(), followedUpAt: null, updatedAt: serverTimestamp(),
      history: [...snap.history, { status: "applied", at: Timestamp.now() }],
    }));
  });
  test("status move without history append rejected", async () => {
    const ref = doc(ctx("u1"), "users/u1/jobs/j1");
    await assertFails(updateDoc(ref, { status: "applied", appliedAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(ref, {
      status: "applied", appliedAt: serverTimestamp(), updatedAt: serverTimestamp(),
      history: [{ status: "saved", at: sameAt }, { status: "applied", at: Timestamp.now() }],
    }));
  });
  test("rewriting history rejected", async () => {
    const ref = doc(ctx("u1"), "users/u1/jobs/j1");
    await assertFails(updateDoc(ref, {
      history: [{ status: "saved", at: Timestamp.now() }, { status: "saved", at: Timestamp.now() }], updatedAt: serverTimestamp(),
    }));
    // control: leaving history alone (only notes) is fine
    await assertSucceeds(updateDoc(ref, { notes: "ok", updatedAt: serverTimestamp() }));
  });
  test("status move append with a 10-minute-old time rejected", async () => {
    const ref = doc(ctx("u1"), "users/u1/jobs/j1");
    const move = (at) => ({
      status: "applied", appliedAt: serverTimestamp(), updatedAt: serverTimestamp(),
      history: [{ status: "saved", at: sameAt }, { status: "applied", at }],
    });
    await assertFails(updateDoc(ref, move(minsAgo(10))));
    await assertSucceeds(updateDoc(ref, move(minsAgo(4))));
  });
  test("history of 51 entries rejected, 50 accepted", async () => {
    const full = [...bigHistory(), { status: "saved", at: sameAt }];
    await assertFails(updateDoc(doc(ctx("u1"), "users/u1/jobs/full"), { status: "offer", updatedAt: serverTimestamp(), history: [...full, { status: "offer", at: Timestamp.now() }] }));
    await assertSucceeds(updateDoc(doc(ctx("u1"), "users/u1/jobs/big"), { status: "offer", updatedAt: serverTimestamp(), history: [...bigHistory(), { status: "offer", at: Timestamp.now() }] }));
  });
  test("editing other fields keeps history untouched", () =>
    assertSucceeds(updateDoc(doc(ctx("u1"), "users/u1/jobs/j1"), { notes: "call back", salary: "$30/hr", updatedAt: serverTimestamp() })));
  test("source cannot change", async () => {
    await assertFails(updateDoc(doc(ctx("u1"), "users/u1/jobs/j1"), { source: "discover", updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(ctx("u1"), "users/u1/jobs/j1"), { source: "manual", notes: "x", updatedAt: serverTimestamp() }));
  });
  test("interviews validated", async () => {
    const ok = { id: "i1", at: Timestamp.fromMillis(Date.now() + 86400000), type: "video", round: 1, location: "Zoom", notes: "" };
    await assertSucceeds(updateDoc(doc(ctx("u1"), "users/u1/jobs/j1"), { interviews: [ok], updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(ctx("u1"), "users/u1/jobs/j1"), { interviews: [{ ...ok, type: "lunch" }], updatedAt: serverTimestamp() }));
  });
  test("every interview up to 20 is validated", async () => {
    const ref = doc(ctx("u1"), "users/u1/jobs/j1");
    const list = (n, badAt) => Array.from({ length: n }, (_, i) => ({ ...iv(i), ...(i === badAt ? { type: "lunch" } : {}) }));
    await assertFails(updateDoc(ref, { interviews: list(6, 5), updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(ref, { interviews: list(6, -1), updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { interviews: list(20, 19), updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { interviews: list(21, -1), updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { interviews: [{ ...iv(0), at: "tomorrow" }], updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(ref, { interviews: list(20, -1), updatedAt: serverTimestamp() }));
    await assertFails(addDoc(jobs(ctx("u1")), job({ interviews: list(7, 6) })));
    await assertSucceeds(addDoc(jobs(ctx("u1")), job({ interviews: list(7, -1) })));
  });
  describe("large documents fit the rules budget", () => {
    const big = () => doc(ctx("u1"), "users/u1/jobs/big");
    test("(a) status move on 50-entry history and 20 interviews", () =>
      assertSucceeds(updateDoc(big(), { status: "offer", updatedAt: serverTimestamp(), history: [...bigHistory(), { status: "offer", at: Timestamp.now() }] })));
    test("(b) notes edit on the same doc", () =>
      assertSucceeds(updateDoc(big(), { notes: "n", updatedAt: serverTimestamp() })));
    test("(c) replace interviews with 20 valid ones, long history", () =>
      assertSucceeds(updateDoc(big(), { interviews: Array.from({ length: 20 }, (_, i) => ({ ...iv(i), round: 2 })), updatedAt: serverTimestamp() })));
    test("(d) status move that also changes 20 interviews", () =>
      assertSucceeds(updateDoc(big(), {
        status: "offer", updatedAt: serverTimestamp(), history: [...bigHistory(), { status: "offer", at: Timestamp.now() }],
        interviews: Array.from({ length: 20 }, (_, i) => ({ ...iv(i), round: 3 })),
      })));
    test("(a) control: bad appended entry on the same doc rejected", () =>
      assertFails(updateDoc(big(), { status: "offer", updatedAt: serverTimestamp(), history: [...bigHistory(), { status: "rejected", at: Timestamp.now() }] })));
  });
  test("owner deletes job", () => assertSucceeds(deleteDoc(doc(ctx("u1"), "users/u1/jobs/j1"))));
  test("admin reads across users (collection group)", async () => {
    await assertSucceeds(getCountFromServer(collectionGroup(ctx(ADMIN), "jobs")));
    await assertSucceeds(getDocs(query(collectionGroup(ctx(ADMIN), "jobs"), where("createdAt", ">=", minsAgo(60)))));
  });
  test("non-admin collection-group read rejected", () => assertFails(getDocs(collectionGroup(ctx("u1"), "jobs"))));
  test("admin edits a user's job (impersonation)", () =>
    assertSucceeds(updateDoc(doc(ctx(ADMIN), "users/u1/jobs/j1"), { notes: "admin", updatedAt: serverTimestamp() })));
});

describe("contacts", () => {
  test("owner creates valid contact", () => assertSucceeds(addDoc(collection(ctx("u1"), "users/u1/contacts"), contact())));
  test("bad strength / linkedin / too many jobIds rejected", async () => {
    const col = collection(ctx("u1"), "users/u1/contacts");
    await assertFails(addDoc(col, contact({ strength: "Hot" })));
    await assertFails(addDoc(col, contact({ linkedinUrl: "javascript:alert(1)" })));
    await assertFails(addDoc(col, contact({ jobIds: Array.from({ length: 51 }, (_, i) => `j${i}`) })));
  });
  test("other user cannot read", () => assertFails(getDoc(doc(ctx("u2"), "users/u1/contacts/c1"))));
});

describe("notifications and broadcasts", () => {
  test("owner reads and marks read", async () => {
    await assertSucceeds(getDocs(collection(ctx("u1"), "users/u1/notifications")));
    await assertSucceeds(updateDoc(doc(ctx("u1"), "users/u1/notifications/n1"), { read: true }));
  });
  test("owner cannot edit message", () => assertFails(updateDoc(doc(ctx("u1"), "users/u1/notifications/n1"), { message: "x" })));
  test("owner cannot create notifications; admin can", async () => {
    const n = { message: "m", type: "info", read: false, createdAt: serverTimestamp() };
    await assertFails(addDoc(collection(ctx("u1"), "users/u1/notifications"), n));
    await assertSucceeds(addDoc(collection(ctx(ADMIN), "users/u1/notifications"), n));
  });
  test("signed-in user reads latest broadcasts", () =>
    assertSucceeds(getDocs(query(collection(ctx("u1"), "broadcasts"), orderBy("createdAt", "desc"), limit(10)))));
  test("only admin broadcasts", async () => {
    const b = { message: "m", type: "info", createdBy: "u1", createdAt: serverTimestamp() };
    await assertFails(addDoc(collection(ctx("u1"), "broadcasts"), b));
    await assertSucceeds(addDoc(collection(ctx(ADMIN), "broadcasts"), { ...b, createdBy: ADMIN }));
  });
  test("admin logs admin-only and append-only", async () => {
    const l = { action: "GOD_MODE_ENTRY", actorUid: ADMIN, actorEmail: "a@x.com", target: "u1", outcome: "success", createdAt: serverTimestamp() };
    await assertFails(addDoc(collection(ctx("u1"), "adminLogs"), l));
    await assertSucceeds(addDoc(collection(ctx(ADMIN), "adminLogs"), l));
    await assertFails(deleteDoc(doc(ctx(ADMIN), "adminLogs/l1")));
  });
});

describe("discover", () => {
  test("owner saves valid settings", () => assertSucceeds(setDoc(doc(ctx("u1"), "users/u1/discover/settings"), settings())));
  test("invalid settings rejected", async () => {
    const ref = doc(ctx("u1"), "users/u1/discover/settings");
    await assertFails(setDoc(ref, settings({ minScore: 10 })));
    await assertFails(setDoc(ref, settings({ alerts: { webhook: "http://169.254.169.254/x", minScore: 70 } })));
    await assertFails(setDoc(ref, settings({ visaType: "F-1" })));
    await assertFails(setDoc(ref, settings({ companies: { warm: [], target: [], blocked: [] } })));
  });
  test("discord webhook allowed", () =>
    assertSucceeds(setDoc(doc(ctx("u1"), "users/u1/discover/settings"), settings({ alerts: { webhook: "https://discord.com/api/webhooks/1/a_B-c", minScore: 70 } }))));
  test("owner reads feed but cannot write it; can delete it", async () => {
    await assertSucceeds(getDoc(doc(ctx("u1"), "users/u1/discover/feed")));
    await assertFails(setDoc(doc(ctx("u1"), "users/u1/discover/feed"), { cards: [] }));
    await assertSucceeds(deleteDoc(doc(ctx("u1"), "users/u1/discover/feed")));
  });
  test("triage: one key per write, server updatedAt", async () => {
    const ref = doc(ctx("u1"), "users/u1/discover/triage");
    await assertSucceeds(setDoc(ref, { cards: { k2: { status: "dismissed", at: serverTimestamp() } }, updatedAt: serverTimestamp() }, { merge: true }));
    await assertSucceeds(updateDoc(ref, { "cards.k1": deleteField(), updatedAt: serverTimestamp() }));
    await assertFails(setDoc(ref, { cards: { k3: { status: "saved" }, k4: { status: "saved" } }, updatedAt: serverTimestamp() }, { merge: true }));
    await assertFails(updateDoc(ref, { "cards.k5": { status: "saved" } }));
  });
  test("other user cannot touch discover docs", async () => {
    await assertFails(getDoc(doc(ctx("u2"), "users/u1/discover/settings")));
    await assertFails(getDoc(doc(ctx("u2"), "users/u1/discover/feed")));
  });
  test("feed requests: create pending own, no update, delete own", async () => {
    const col = collection(ctx("u1"), "users/u1/feedRequests");
    const fr = { company: "Axon", url: "https://job-boards.greenhouse.io/axon", status: "pending", createdAt: serverTimestamp() };
    await assertSucceeds(addDoc(col, fr));
    await assertFails(addDoc(col, { ...fr, status: "added" }));
    await assertFails(updateDoc(doc(ctx("u1"), "users/u1/feedRequests/f1"), { status: "added" }));
    await assertSucceeds(deleteDoc(doc(ctx("u1"), "users/u1/feedRequests/f1")));
  });
  test("feed requests: admin can get and list another user's, but not delete them", async () => {
    await assertSucceeds(getDoc(doc(ctx(ADMIN), "users/u1/feedRequests/f1")));
    await assertSucceeds(getDocs(collection(ctx(ADMIN), "users/u1/feedRequests")));
    await assertFails(deleteDoc(doc(ctx(ADMIN), "users/u1/feedRequests/f1")));
    await assertFails(getDocs(collection(ctx("u2"), "users/u1/feedRequests")));
  });
  test("feeds and system/discover readable when signed in; health admin-only", async () => {
    await assertSucceeds(getDocs(collection(ctx("u1"), "feeds")));
    await assertSucceeds(getDoc(doc(ctx("u1"), "system/discover")));
    await assertFails(getDoc(doc(ctx("u1"), "system/health")));
    await assertSucceeds(getDoc(doc(ctx(ADMIN), "system/health")));
    await assertFails(setDoc(doc(ctx("u1"), "feeds/evil"), { company: "x" }));
  });
  test("admin removes user feeds only", async () => {
    await assertSucceeds(deleteDoc(doc(ctx(ADMIN), "feeds/greenhouse-axon")));
    await assertFails(deleteDoc(doc(ctx(ADMIN), "feeds/workday-nxp-careers")));
    await assertFails(deleteDoc(doc(ctx("u1"), "feeds/greenhouse-axon")));
  });
});
