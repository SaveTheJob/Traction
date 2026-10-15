# Offerward Round 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Offerward's Firestore data model (per-user tree, one Discover feed doc per user), remove the parked features, fix the known bugs, add export/delete/verification, rename to Offerward, and bring the website, extension, collector, rules, tests and tooling onto it.

**Architecture:**
- **Data layer.** Everything a user owns lives under `users/{uid}`. A single website module (`src/lib/db.ts`) owns every Firestore path and converts between documents and app types.
- **Collector.** It writes one `discover/feed` document per user, only when it changed.
- **Rules.** Strict, shape-validated rules (`firestore.rules`) are the security boundary, and are tested in the emulator.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Firebase JS SDK 12 (Firestore, Auth), Tailwind 4, Vitest; Chrome extension MV3 (plain JS, Firestore REST); Python 3.11+ collector (firebase-admin, PyYAML, requests, pytest); Firebase CLI emulators with `@firebase/rules-unit-testing`.

**Spec:** `docs/superpowers/specs/2026-10-14-firestore-restructure-design.md`. Read it before any task: it holds every field list, limit and enum referenced here.

## Global Constraints

- **Name:** the product name shown to users is exactly `Offerward`. Internal identifiers (Firebase project `traction-37`, server paths `/opt/traction*`, unit names `traction-collector.*`, the Python package `collector`) stay as they are.
- **No git commits.** Agents never run `git commit` or `git push`. Each task ends by listing the changed files; the owner commits by hand. Never add `Co-Authored-By` or any Claude attribution anywhere.
- **No deploys.** Deploys, GitHub actions, branch deletion and broadcasts happen only in the Ship section, with the owner's explicit go-ahead.
- **Secrets:** never read, print or copy `~/.config/traction/*.json` contents. Never create key files inside the repo.
- **Names and formats:** collection and field names are camelCase. Status-like values are the lowercase codes from the spec. Moments are Firestore Timestamps named `…At`; calendar values are ISO strings (`birthDate` `YYYY-MM-DD`, `graduation` `YYYY-MM`).
- **Timestamps:** client-written `createdAt`/`updatedAt` use `serverTimestamp()`. Items inside lists (`history[].at`, `interviews[].at`, `interactions[].at`) use client time (`Timestamp.fromDate(new Date())`); Firestore can't put server timestamps in lists, so the rules allow at most 5 minutes before and 1 minute after `request.time`.
- **One cap:** Discover's cap is 300 cards for every user. No `plan` field exists anywhere.
- **Style:** UI keeps the existing look (`premium-glass` classes, white/slate text, lucide icons, rounded-2xl). Match surrounding code style and comment density.
- **Node tooling:** `node_modules/.bin` works after `npm ci`. Run `npm` scripts from `Source Code/website`.
- **Python:** use `Source Code/collector/.venv` (create it with `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt -r requirements-dev.txt` if missing).

## Deviations from the spec (decided while planning)

1. **`triage` validation.** Firestore rules can't extract the single changed key from a map. The rules enforce:
   - doc keys `cards` and `updatedAt` only;
   - `updatedAt == request.time`;
   - at most one `cards` entry changes per write;
   - `cards.size() <= 2000`.

   Each entry's value shape is validated by the collector when it reads the doc; bad entries are ignored. This only affects the user's own data.
2. **One extra index.** The collector loads enabled settings with a collection-group query on `discover` (`where enabled == true`), so `firestore.indexes.json` also has a `discover.enabled` collection-group field override.
3. **Bundle work.** The export libraries are already loaded on demand, so the bundle work is splitting the main chunk with `manualChunks`.

## Review Focus

1. **Editing a job while the job list updates** (another tab or the extension saves): the edit form keeps what the user typed. *Test: Task 5, `JobModal` keeps local state.*
2. **A status change that isn't a move** (re-selecting the same status, or editing other fields): `history` doesn't grow, and the rules accept the write. *Test: Task 2 `jobUpdate` unit test, plus the Task 1 rules cases.*
3. **Clock skew:** a device clock up to 4 minutes slow still saves jobs; 10 minutes off is rejected with a clear message. *Test: Task 1 rules cases at -4 and -10 minutes; Task 5 shows an error toast on `permission-denied`.*
4. **Deleting an account with Discover data and many jobs** (more than 500 docs in total) completes, with no partial account left that can still sign in. *Test: Task 4, `deleteAccountData` deletes in chunks of up to 400 and deletes the Auth user last.*
5. **A Discover feed near the size limit** (400 cards with long reasons and snippets) is trimmed below 900 KB, never written oversized. *Test: Task 11, `test_feed_size_limit`.*

---

## File map

| Area | Files |
|---|---|
| Rules | `firestore.rules`, `firestore.indexes.json`, `tests/rules/package.json`, `tests/rules/rules.test.mjs`, `tests/rules/firebase.json` |
| Web data layer | create `src/lib/db.ts`, `src/lib/db.test.ts`, `src/lib/app.ts`; modify `package.json` (vitest, lint deps, scripts), `vite.config.ts` |
| Removals | delete `src/pages/ResumeBuilder.tsx`, `src/components/DocumentVaultModal.tsx`; modify `App.tsx`, `Sidebar.tsx`, `Dashboard.tsx`, `PipelineCard.tsx`, `JobContext.tsx`, `Account.tsx`, `admin/UserCommand.tsx`, `lib/adminLogger.ts`, `pages/Discover.tsx`; create `docs/backlog.md` |
| Account | `context/AuthContext.tsx`, `pages/Onboarding.tsx`, `pages/Account.tsx`, `pages/Signup.tsx`, create `pages/VerifyEmail.tsx`, create `lib/accountData.ts`, `App.tsx` |
| Jobs | `context/JobContext.tsx`, `components/NewApplicationModal.tsx`, `pages/Pipeline.tsx`, `components/PipelineCard.tsx`, `components/StatusBadge.tsx`, `pages/Dashboard.tsx`, `pages/Analytics.tsx`, `components/ConversionFunnel.tsx`, `utils/export.ts`, `utils/date.ts` |
| Network | `context/NetworkContext.tsx`, `components/NewContactModal.tsx`, `components/NetworkStatusBadge.tsx`, `pages/Network.tsx` |
| Notices & admin | `context/NotificationContext.tsx`, `components/NotificationDropdown.tsx`, `components/admin/*.tsx`, `lib/adminLogger.ts` |
| Discover web | `lib/discover.ts`, `hooks/useDiscoveryProfile.ts` → `hooks/useDiscover.ts`, `pages/Discover.tsx`, `pages/DiscoverSettings.tsx` |
| Shell & rename | `index.html`, `src/pages/NotFound.tsx`, `PrivacyPolicy.tsx`, `Login.tsx`, `Signup.tsx`, `Logo.tsx`, `firebase.json` (website), `.firebaserc` |
| Extension | `manifest.json`, `config.js`, `popup.html`, `popup.js`, `content.js`, `utils/jobParser.js`, `utils/popup/firestoreService.js`, `background.js`, create `tests/extension/commit.test.mjs` |
| Collector | `collector/profile.py`, `collector/store.py`, create `collector/feed.py`, `collector/firestore_sync.py`, `collector/runner.py`, `collector/notify.py`, `collector/__main__.py`, `collector/config.py`, `collector/util.py`, `config.example.yaml`, `README.md`, `profiles/example-embedded-intern.yaml`, create `tests/` + `requirements-dev.txt` + `pytest.ini` |
| Repo | `.gitignore`, `README.md`, untrack `.firebase/**`, `extension.zip`; `docs/backlog.md` |

---

### Task 1: Firestore rules, indexes and the emulator rules suite

**Files:**
- Replace: `firestore.rules`, `firestore.indexes.json`
- Create: `tests/rules/package.json`, `tests/rules/firebase.json`, `tests/rules/rules.test.mjs`, `tests/rules/README.md`

**Interfaces:**
- Produces: the security contract every later task writes against. Admin UID list: `['7l0wLOQs3BdKoyUlMPqTCqhfC802']`.

- [ ] **Step 1: Create the test harness**

`tests/rules/package.json`:
```json
{
  "name": "offerward-rules-tests",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "firebase emulators:exec --only firestore --project demo-offerward \"node --test rules.test.mjs\""
  },
  "devDependencies": {
    "@firebase/rules-unit-testing": "^5.0.0",
    "firebase": "^12.9.0"
  }
}
```
`tests/rules/firebase.json`:
```json
{
  "firestore": { "rules": "../../firestore.rules" },
  "emulators": { "firestore": { "host": "127.0.0.1", "port": 8086 }, "ui": { "enabled": false } }
}
```
Note: `../../` is fine here because the emulator reads the file directly; only `firebase deploy` refuses paths outside the project directory. If `emulators:exec` hangs on this machine (it timed out once before), start the emulator with `firebase emulators:start --only firestore --project demo-offerward` in another shell and run `FIRESTORE_EMULATOR_HOST=127.0.0.1:8086 node --test rules.test.mjs`. Install with `npm install --legacy-peer-deps` if peer ranges conflict.

- [ ] **Step 2: Write the failing test suite**

`tests/rules/rules.test.mjs`:
```js
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
    await setDoc(doc(db, "users/u1/jobs/j1"), { ...job(), createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
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
    await assertFails(getDoc(doc(ctx("u2"), "users/u1/jobs/j1")));
  });
  test("unknown field, bad status, missing company rejected", async () => {
    await assertFails(addDoc(jobs(ctx("u1")), job({ isAdmin: true })));
    await assertFails(addDoc(jobs(ctx("u1")), job({ status: "hired", history: [{ status: "hired", at: Timestamp.now() }] })));
    await assertFails(addDoc(jobs(ctx("u1")), job({ company: "" })));
  });
  test("history must start with one entry matching status", async () => {
    await assertFails(addDoc(jobs(ctx("u1")), job({ history: [] })));
    await assertFails(addDoc(jobs(ctx("u1")), job({ history: [{ status: "applied", at: Timestamp.now() }] })));
  });
  test("history time within skew window", async () => {
    await assertSucceeds(addDoc(jobs(ctx("u1")), job({ history: [{ status: "saved", at: minsAgo(4) }] })));
    await assertFails(addDoc(jobs(ctx("u1")), job({ history: [{ status: "saved", at: minsAgo(10) }] })));
  });
  test("status move appends exactly one history entry", async () => {
    const ref = doc(ctx("u1"), "users/u1/jobs/j1");
    const snap = await env.withSecurityRulesDisabled(async (c) => (await getDoc(doc(c.firestore(), "users/u1/jobs/j1"))).data());
    await assertSucceeds(updateDoc(ref, {
      status: "applied", appliedAt: serverTimestamp(), followedUpAt: null, updatedAt: serverTimestamp(),
      history: [...snap.history, { status: "applied", at: Timestamp.now() }],
    }));
  });
  test("status move without history append rejected", () =>
    assertFails(updateDoc(doc(ctx("u1"), "users/u1/jobs/j1"), { status: "applied", appliedAt: serverTimestamp(), updatedAt: serverTimestamp() })));
  test("rewriting history rejected", () =>
    assertFails(updateDoc(doc(ctx("u1"), "users/u1/jobs/j1"), {
      history: [{ status: "saved", at: Timestamp.now() }, { status: "saved", at: Timestamp.now() }], updatedAt: serverTimestamp(),
    })));
  test("editing other fields keeps history untouched", () =>
    assertSucceeds(updateDoc(doc(ctx("u1"), "users/u1/jobs/j1"), { notes: "call back", salary: "$30/hr", updatedAt: serverTimestamp() })));
  test("source cannot change", () =>
    assertFails(updateDoc(doc(ctx("u1"), "users/u1/jobs/j1"), { source: "discover", updatedAt: serverTimestamp() })));
  test("interviews validated", async () => {
    const ok = { id: "i1", at: Timestamp.fromMillis(Date.now() + 86400000), type: "video", round: 1, location: "Zoom", notes: "" };
    await assertSucceeds(updateDoc(doc(ctx("u1"), "users/u1/jobs/j1"), { interviews: [ok], updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(ctx("u1"), "users/u1/jobs/j1"), { interviews: [{ ...ok, type: "lunch" }], updatedAt: serverTimestamp() }));
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
```

- [ ] **Step 3: Run the suite to see it fail against the old rules**

Run (from `tests/rules`): `npm install --legacy-peer-deps && npm test`
Expected: most tests FAIL. The current rules use the old top-level collections.

- [ ] **Step 4: Write the new rules**

Replace `firestore.rules` with:
```
rules_version = '2';

// Offerward Firestore rules. Deploy from the repo root: firebase deploy --only firestore
// The Firebase web config is public, so these rules are the security boundary. Anything not
// matched is denied. The collector writes with the Admin SDK, which bypasses rules.
// Layout and limits: docs/superpowers/specs/2026-10-14-firestore-restructure-design.md

service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }
    function verified() { return signedIn() && request.auth.token.email_verified == true; }
    // Keep in sync with VITE_ADMIN_UIDS in Source Code/website/.env.local.
    function isAdmin() { return verified() && request.auth.uid in ['7l0wLOQs3BdKoyUlMPqTCqhfC802']; }
    function isOwner(uid) { return verified() && request.auth.uid == uid; }

    function str(v, max) { return v is string && v.size() <= max; }
    function reqStr(v, max) { return v is string && v.size() > 0 && v.size() <= max; }
    function tsOrNull(v) { return v == null || v is timestamp; }
    function nowish(t) {
      return t is timestamp && t > request.time - duration.value(5, 'm') && t < request.time + duration.value(1, 'm');
    }
    function changed() { return request.resource.data.diff(resource.data).affectedKeys(); }

    // ── Account ─────────────────────────────────────────────────────────────
    function validGoals(g) {
      return g is map && g.keys().hasOnly(['weeklyApplications'])
        && (g.weeklyApplications == null
            || (g.weeklyApplications is int && g.weeklyApplications >= 1 && g.weeklyApplications <= 100));
    }
    function validBirthDate(d) { return d == '' || (d is string && d.matches('[0-9]{4}-[0-9]{2}-[0-9]{2}')); }

    match /users/{uid} {
      allow read: if (signedIn() && request.auth.uid == uid) || isAdmin();
      // Created by the app on first sign-in, before email verification.
      allow create: if signedIn() && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['email', 'firstName', 'lastName', 'birthDate', 'status',
                                                  'onboarded', 'goals', 'createdAt', 'updatedAt'])
        && request.resource.data.email == request.auth.token.get('email', '')
        && str(request.resource.data.firstName, 100) && str(request.resource.data.lastName, 100)
        && validBirthDate(request.resource.data.birthDate)
        && request.resource.data.status == 'active'
        && request.resource.data.onboarded is bool
        && validGoals(request.resource.data.goals)
        && request.resource.data.createdAt == request.time
        && request.resource.data.updatedAt == request.time;
      allow update: if (isOwner(uid)
          && changed().hasOnly(['firstName', 'lastName', 'birthDate', 'onboarded', 'goals', 'updatedAt'])
          && str(request.resource.data.firstName, 100) && str(request.resource.data.lastName, 100)
          && validBirthDate(request.resource.data.birthDate)
          && request.resource.data.onboarded is bool
          && validGoals(request.resource.data.goals)
          && request.resource.data.updatedAt == request.time)
        || (isAdmin() && changed().hasOnly(['status', 'updatedAt'])
            && request.resource.data.status in ['active', 'suspended']);
      allow delete: if isOwner(uid);

      // ── Jobs ──────────────────────────────────────────────────────────────
      function jobStatus(s) { return s in ['saved', 'applied', 'interviewing', 'offer', 'rejected']; }
      function validInterview(i) {
        return i is map && i.keys().hasOnly(['id', 'at', 'type', 'round', 'location', 'notes'])
          && reqStr(i.id, 64) && i.at is timestamp
          && i.type in ['phone', 'video', 'onsite', 'technical', 'other']
          && i.round is int && i.round >= 1 && i.round <= 20
          && str(i.location, 300) && str(i.notes, 2000);
      }
      function validInterviews(l) {
        return l is list && l.size() <= 20
          && (l.size() < 1 || validInterview(l[0])) && (l.size() < 2 || validInterview(l[1]))
          && (l.size() < 3 || validInterview(l[2])) && (l.size() < 4 || validInterview(l[3]))
          && (l.size() < 5 || validInterview(l[4]));
      }
      function validJobFields(d) {
        return d.keys().hasOnly(['company', 'title', 'location', 'url', 'status', 'priority', 'notes', 'salary',
                                 'source', 'sourceSite', 'description', 'deadlineAt', 'appliedAt', 'followedUpAt',
                                 'history', 'interviews', 'fromDiscover', 'createdAt', 'updatedAt'])
          && reqStr(d.company, 200) && reqStr(d.title, 200) && str(d.location, 200) && str(d.url, 2000)
          && jobStatus(d.status) && d.priority in ['high', 'medium', 'low']
          && str(d.notes, 5000) && str(d.salary, 100)
          && d.source in ['manual', 'extension', 'discover'] && str(d.sourceSite, 200)
          && str(d.description, 30000)
          && tsOrNull(d.deadlineAt) && tsOrNull(d.appliedAt) && tsOrNull(d.followedUpAt)
          && d.history is list && d.history.size() >= 1 && d.history.size() <= 50
          && validInterviews(d.interviews)
          && (d.fromDiscover == null
              || (d.fromDiscover is map && d.fromDiscover.keys().hasOnly(['roleKey', 'fitScore'])
                  && reqStr(d.fromDiscover.roleKey, 64) && d.fromDiscover.fitScore is int));
      }
      function lastHistory(d) { return d.history[d.history.size() - 1]; }

      match /jobs/{jobId} {
        allow read, delete: if isOwner(uid) || isAdmin();
        allow create: if (isOwner(uid) || isAdmin())
          && validJobFields(request.resource.data)
          && request.resource.data.history.size() == 1
          && request.resource.data.history[0].keys().hasOnly(['status', 'at'])
          && request.resource.data.history[0].status == request.resource.data.status
          && nowish(request.resource.data.history[0].at)
          && (request.resource.data.status != 'applied' || request.resource.data.appliedAt == request.time)
          && request.resource.data.createdAt == request.time
          && request.resource.data.updatedAt == request.time;
        allow update: if (isOwner(uid) || isAdmin())
          && validJobFields(request.resource.data)
          && request.resource.data.source == resource.data.source
          && request.resource.data.createdAt == resource.data.createdAt
          && request.resource.data.updatedAt == request.time
          && (
            // status unchanged: history untouched
            (request.resource.data.status == resource.data.status
              && request.resource.data.history == resource.data.history)
            ||
            // status changed: append exactly one matching entry
            (request.resource.data.status != resource.data.status
              && request.resource.data.history.size() == resource.data.history.size() + 1
              && request.resource.data.history[0:resource.data.history.size()] == resource.data.history
              && lastHistory(request.resource.data).keys().hasOnly(['status', 'at'])
              && lastHistory(request.resource.data).status == request.resource.data.status
              && nowish(lastHistory(request.resource.data).at))
          );
      }

      // ── Contacts ──────────────────────────────────────────────────────────
      function validContact(d) {
        return d.keys().hasOnly(['name', 'role', 'company', 'email', 'linkedinUrl', 'strength', 'lastContactedAt',
                                 'checkInEveryDays', 'jobIds', 'interactions', 'notes', 'createdAt', 'updatedAt'])
          && reqStr(d.name, 200) && str(d.role, 200) && str(d.company, 200) && str(d.email, 200)
          && str(d.linkedinUrl, 300) && (d.linkedinUrl == '' || d.linkedinUrl.matches('https://.*'))
          && d.strength in ['hot', 'warm', 'cold']
          && tsOrNull(d.lastContactedAt)
          && (d.checkInEveryDays == null
              || (d.checkInEveryDays is int && d.checkInEveryDays >= 7 && d.checkInEveryDays <= 365))
          && d.jobIds is list && d.jobIds.size() <= 50
          && d.interactions is list && d.interactions.size() <= 100
          && str(d.notes, 5000);
      }
      match /contacts/{contactId} {
        allow read, delete: if isOwner(uid) || isAdmin();
        allow create: if (isOwner(uid) || isAdmin()) && validContact(request.resource.data)
          && request.resource.data.createdAt == request.time && request.resource.data.updatedAt == request.time;
        allow update: if (isOwner(uid) || isAdmin()) && validContact(request.resource.data)
          && request.resource.data.createdAt == resource.data.createdAt
          && request.resource.data.updatedAt == request.time;
      }

      // ── Notifications to this user ────────────────────────────────────────
      match /notifications/{id} {
        allow read: if isOwner(uid) || isAdmin();
        allow update: if isOwner(uid) && changed().hasOnly(['read']) && request.resource.data.read is bool;
        allow delete: if isOwner(uid) || isAdmin();
        allow create: if isAdmin()
          && request.resource.data.keys().hasOnly(['message', 'type', 'read', 'createdAt'])
          && reqStr(request.resource.data.message, 1000)
          && request.resource.data.type in ['info', 'success', 'warning']
          && request.resource.data.read == false
          && request.resource.data.createdAt == request.time;
      }

      // ── "Add a careers page" requests (answered by the collector) ─────────
      match /feedRequests/{id} {
        allow read, delete: if isOwner(uid) || (isAdmin() && request.method == 'get');
        allow create: if isOwner(uid)
          && request.resource.data.keys().hasOnly(['company', 'url', 'status', 'createdAt'])
          && str(request.resource.data.company, 80) && reqStr(request.resource.data.url, 500)
          && request.resource.data.status == 'pending'
          && request.resource.data.createdAt == request.time;
      }

      // ── Discover ──────────────────────────────────────────────────────────
      function validSettings(d) {
        return d.keys().hasOnly(['enabled', 'tracks', 'graduation', 'terms', 'needsSponsorship', 'locations',
                                 'roleFamilies', 'includeKeywords', 'excludeKeywords', 'companies', 'minScore',
                                 'alerts', 'updatedAt'])
          && d.enabled is bool
          && d.tracks is list && d.tracks.size() <= 2 && d.tracks.hasOnly(['intern', 'newgrad'])
          && d.graduation is string && (d.graduation == '' || d.graduation.matches('20[0-9]{2}-(0[1-9]|1[0-2])'))
          && d.terms is map && d.terms.keys().hasOnly(['available', 'partTime'])
          && d.terms.available is list && d.terms.available.size() <= 12
          && d.terms.partTime is list && d.terms.partTime.size() <= 12
          && d.needsSponsorship is bool
          && d.locations is map && d.locations.keys().hasOnly(['preferred', 'remoteOk'])
          && d.locations.preferred is list && d.locations.preferred.size() <= 50 && d.locations.remoteOk is bool
          && d.roleFamilies is list && d.roleFamilies.size() <= 20
          && d.includeKeywords is list && d.includeKeywords.size() <= 50
          && d.excludeKeywords is list && d.excludeKeywords.size() <= 50
          && d.companies is map && d.companies.keys().hasOnly(['warm', 'target', 'hidden'])
          && d.companies.warm is list && d.companies.warm.size() <= 100
          && d.companies.target is list && d.companies.target.size() <= 100
          && d.companies.hidden is list && d.companies.hidden.size() <= 100
          && d.minScore is int && d.minScore >= 40 && d.minScore <= 90
          && d.alerts is map && d.alerts.keys().hasOnly(['webhook', 'minScore']) && d.alerts.webhook is string
          && (d.alerts.webhook == ''
              || d.alerts.webhook.matches('https://((ptb|canary)[.])?discord(app)?[.]com/api/webhooks/[0-9]+/[A-Za-z0-9_-]+')
              || d.alerts.webhook.matches('https://ntfy[.]sh/[A-Za-z0-9_-]{1,64}'))
          && d.alerts.minScore is int && d.alerts.minScore >= 40 && d.alerts.minScore <= 100
          && d.updatedAt == request.time;
      }
      match /discover/settings {
        allow read: if isOwner(uid) || isAdmin();
        allow create, update: if isOwner(uid) && validSettings(request.resource.data);
        allow delete: if isOwner(uid);
      }
      match /discover/feed {
        allow read: if isOwner(uid) || isAdmin();
        allow delete: if isOwner(uid);
      }
      // One entry changes per write. Entry values are validated by the collector
      // (rules cannot extract the single changed key from a map).
      match /discover/triage {
        allow read: if isOwner(uid) || isAdmin();
        allow delete: if isOwner(uid);
        allow create: if isOwner(uid)
          && request.resource.data.keys().hasOnly(['cards', 'updatedAt'])
          && request.resource.data.cards is map && request.resource.data.cards.size() <= 1
          && request.resource.data.updatedAt == request.time;
        allow update: if isOwner(uid)
          && request.resource.data.keys().hasOnly(['cards', 'updatedAt'])
          && request.resource.data.cards is map && request.resource.data.cards.size() <= 2000
          && request.resource.data.cards.diff(resource.data.cards).affectedKeys().size() <= 1
          && request.resource.data.updatedAt == request.time;
      }
    }

    // Admin reads across every user's jobs (counts, "today by hour").
    match /{path=**}/jobs/{jobId} {
      allow read: if isAdmin();
    }

    // ── Shared, collector-written ───────────────────────────────────────────
    match /feeds/{feedId} {
      allow read: if signedIn();
      allow delete: if isAdmin() && resource.data.origin == 'user';
    }
    match /broadcasts/{id} {
      allow read: if signedIn();
      allow delete: if isAdmin();
      allow create: if isAdmin()
        && request.resource.data.keys().hasOnly(['message', 'type', 'createdBy', 'createdAt'])
        && reqStr(request.resource.data.message, 1000)
        && request.resource.data.type in ['info', 'success', 'warning']
        && request.resource.data.createdBy == request.auth.uid
        && request.resource.data.createdAt == request.time;
    }
    match /adminLogs/{id} {
      allow read: if isAdmin();
      allow create: if isAdmin()
        && request.resource.data.keys().hasOnly(['action', 'actorUid', 'actorEmail', 'target', 'outcome', 'createdAt'])
        && request.resource.data.actorUid == request.auth.uid
        && request.resource.data.outcome in ['success', 'blocked', 'error']
        && request.resource.data.createdAt == request.time;
    }
    match /system/discover {
      allow read: if signedIn();
    }
    match /system/health {
      allow read: if isAdmin();
    }
  }
}
```
Notes:
- Rules have no loops, so `validInterviews` checks the first five entries; the collector and the UI cap the list at 20. Keep the function as written.
- `request.method == 'get'` restricts admins to single reads of feed requests.
- If `history[0:n]` slicing is rejected by the emulator, replace it with `request.resource.data.history.size() == resource.data.history.size() + 1 && request.resource.data.history.hasAll(resource.data.history)`. That's weaker but acceptable; note it in the task report.

Replace `firestore.indexes.json` with:
```json
{
  "indexes": [],
  "fieldOverrides": [
    {
      "collectionGroup": "feedRequests", "fieldPath": "status",
      "indexes": [
        { "order": "ASCENDING", "queryScope": "COLLECTION" },
        { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" }
      ]
    },
    {
      "collectionGroup": "jobs", "fieldPath": "createdAt",
      "indexes": [
        { "order": "ASCENDING", "queryScope": "COLLECTION" },
        { "order": "DESCENDING", "queryScope": "COLLECTION" },
        { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" },
        { "order": "DESCENDING", "queryScope": "COLLECTION_GROUP" }
      ]
    },
    {
      "collectionGroup": "discover", "fieldPath": "enabled",
      "indexes": [
        { "order": "ASCENDING", "queryScope": "COLLECTION" },
        { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" }
      ]
    }
  ]
}
```

- [ ] **Step 5: Run the suite to green**

Run (from `tests/rules`): `npm test`
Expected: all tests PASS. Fix rules, not tests, unless a test contradicts the spec. Report any test you changed and why.

- [ ] **Step 6: Document and hand off**

`tests/rules/README.md`: one paragraph on how to run the suite (both the `npm test` route and the manual-emulator route above). Add `tests/rules/node_modules/` to the root `.gitignore`.
Report the changed files: `firestore.rules`, `firestore.indexes.json`, `tests/rules/*`, `.gitignore`. Do not commit.

---

### Task 2: Website data module (`db.ts`), app constants, Vitest

**Files:**
- Create: `Source Code/website/src/lib/db.ts`, `Source Code/website/src/lib/db.test.ts`, `Source Code/website/src/lib/app.ts`
- Modify: `Source Code/website/package.json` (devDependency `vitest`; scripts `"test": "vitest run"`)

**Interfaces:**
- Produces (exact names used by Tasks 3–9):
  - types `JobStatus, Priority, JobSource, InterviewType, Strength, InteractionType, NoticeType, HistoryEntry, Interview, Interaction, Job, JobInput, Contact, ContactInput, Account, AccountStatus`;
  - label maps `JOB_STATUSES, JOB_STATUS_LABEL, PRIORITY_LABEL, STRENGTH_LABEL`;
  - refs object `refs` with `user(uid)`, `jobs(uid)`, `job(uid,id)`, `contacts(uid)`, `contact(uid,id)`, `notifications(uid)`, `notification(uid,id)`, `feedRequests(uid)`, `discoverSettings(uid)`, `discoverFeed(uid)`, `discoverTriage(uid)`, `feeds()`, `feed(id)`, `broadcasts()`, `adminLogs()`, `systemDiscover()`, `systemHealth()`;
  - functions `toDate`, `hostnameOf`, `jobFromDoc`, `newJobDoc`, `jobUpdate`, `jobStatusChange`, `contactFromDoc`, `newContactDoc`, `contactUpdate`, `accountFromDoc`, `newAccountDoc`.
  - `app.ts` exports `APP_NAME = "Offerward"`, `APP_URL`, `CONTACT_EMAIL`, `EXTENSION_URL`.

- [ ] **Step 1: Add Vitest**

Run (in `Source Code/website`): `npm install -D vitest@^3`. Then add `"test": "vitest run"` and `"lint": "eslint ."` to `package.json` scripts (lint is fixed in Task 10).

- [ ] **Step 2: Write the failing tests** — `src/lib/db.test.ts`:
```ts
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
    const u = jobStatusChange(job, "applied", now);
    expect(u.history).toHaveLength(2);
    expect(isServerTs(u.appliedAt)).toBe(true);
    expect(u.followedUpAt).toBeNull();
    const applied = { ...job, status: "applied" as const, appliedAt: now };
    expect(jobStatusChange(applied, "interviewing", now).appliedAt).toBeUndefined();
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
```

- [ ] **Step 3: Run to see it fail**

Run: `npm test`
Expected: FAIL, "Cannot find module './db'".

- [ ] **Step 4: Implement `src/lib/app.ts`**
```ts
/** Product-wide constants. Project-specific values come from .env.local so moving to a new
 * Firebase project is a config change (see docs/owner-checklist.md). */
export const APP_NAME = "Offerward";
export const APP_URL: string = import.meta.env.VITE_APP_URL ?? "https://traction-37.web.app";
export const CONTACT_EMAIL: string = import.meta.env.VITE_CONTACT_EMAIL ?? "contact@yugthapar.com";
/** Chrome Web Store listing; empty until published under the new name. */
export const EXTENSION_URL: string = import.meta.env.VITE_EXTENSION_URL ?? "";
```
Add `VITE_APP_URL=https://traction-37.web.app` and `VITE_CONTACT_EMAIL=contact@yugthapar.com` to `Source Code/website/.env.local`.

- [ ] **Step 5: Implement `src/lib/db.ts`**
```ts
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
```

- [ ] **Step 6: Run the tests to green**

Run: `npm test` then `node node_modules/typescript/bin/tsc -b` (or `npx tsc -b`)
Expected: all PASS; tsc may still report errors in files that use the old types. That's expected until Tasks 3–9, so report them but don't fix them here.

- [ ] **Step 7: Hand off**

Report the changed files (`package.json`, `package-lock.json`, `src/lib/db.ts`, `src/lib/db.test.ts`, `src/lib/app.ts`, `.env.local`). Do not commit.

---

### Task 3: Remove Pro, AI Resume and the document vault; write the backlog

**Files:**
- Delete: `src/pages/ResumeBuilder.tsx`, `src/components/DocumentVaultModal.tsx`
- Modify: `src/App.tsx`, `src/components/Sidebar.tsx`, `src/pages/Dashboard.tsx`, `src/components/PipelineCard.tsx`, `src/context/JobContext.tsx` (vault state, `FREE_PLAN_JOB_LIMIT`, `limitError`), `src/pages/Account.tsx` (Plans & Pricing section, Stripe links, plan badge), `src/components/admin/UserCommand.tsx` (plan editing), `src/lib/adminLogger.ts` (`PLAN_UPGRADE`), `src/pages/Discover.tsx` (`isPro` banner → single line), `src/context/AuthContext.tsx` (`plan` on profile), `src/components/NewApplicationModal.tsx` (limit error UI)
- Create: `docs/backlog.md`

**Interfaces:**
- Produces: no `plan`, `openVault`, `isVaultOpen`, `limitError` or `FREE_PLAN_JOB_LIMIT` anywhere. Later tasks must not reintroduce them.

- [ ] **Step 1: Prove they're referenced (the failing check)**

Run: `grep -rnE "ResumeBuilder|DocumentVault|openVault|isVaultOpen|FREE_PLAN_JOB_LIMIT|limitError|plan ===|\.plan\b|billing\.stripe|PLAN_UPGRADE|isPro|CLAUDE_KEY" src`
Expected: many matches.

- [ ] **Step 2: Remove them**

- Delete the two files.
- In `App.tsx`, drop the `ResumeBuilder` lazy import, the `resume` route and the `DocumentVaultModal` render.
- In `Sidebar.tsx`, drop the "AI Resume" nav item (and the `Sparkles` import if unused).
- In `Dashboard.tsx` and `PipelineCard.tsx`, drop the folder (vault) buttons and `openVault`.
- In `JobContext.tsx`, delete the vault state, `openVault`/`closeVault`/`isVaultOpen`/`vaultJobId`, `FREE_PLAN_JOB_LIMIT`, `limitError`/`clearLimitError` and the limit check.
- In `Account.tsx`, delete the whole "Plans & Pricing" section (the `{/* Plans & Pricing */}` block through the end of the Pro card), `handleCheckout`, and any plan badge.
- In `UserCommand.tsx`, remove the plan select and the `PLAN_UPGRADE` logging.
- In `adminLogger.ts`, remove `PLAN_UPGRADE` from the action union.
- In `Discover.tsx`, replace the `capped && (isPro ? … : …)` banner with this, and remove `isPro`:
```tsx
{capped && (
  <div className="premium-glass rounded-2xl border border-blue-400/20 px-4 py-3 mb-5 sm:mb-6 text-xs sm:text-sm text-slate-200 flex items-center gap-2">
    <Sparkles className="w-4 h-4 text-blue-300 shrink-0" />
    <span>
      Showing your top {run?.cap} of {run?.matches?.toLocaleString()} matches. Raise your minimum score in Tune matches to narrow them down.
    </span>
  </div>
)}
```
- In `AuthContext.tsx`, remove `plan` from `UserProfile` and from the new-profile object. (Task 4 replaces this type entirely; keep the file compiling here.)
- In `NewApplicationModal.tsx`, remove the `limitError` banner.

- [ ] **Step 3: Write `docs/backlog.md`**
```markdown
# Parked features

Removed from Offerward in Round 1 (2026-10-14). The last commit containing their code is
`56a1fe8` on `master`; restore files from there with `git show 56a1fe8:<path>`.

## Pro plan and payments
- **What it did:** a Free/Pro plan on each account; Free capped jobs at 50 and Discover at 25 cards; an "Upgrade" button opened a Stripe *test-mode* billing link; admins could change a user's plan.
- **Why parked:** nothing ever set the plan after payment (no webhook), and every new account was created as Pro, so limits never applied.
- **To bring back properly:** a live Stripe product and Checkout; a server endpoint (Cloud Function) for the Stripe webhook that sets `users/{uid}.plan`; rules keeping `plan` server-only; server-side enforcement of limits (counts checked in rules or a function); restore the Discover per-plan cap in the collector (`live_cap`).
- **Files then:** `src/pages/Account.tsx` (Plans & Pricing), `src/context/JobContext.tsx` (limit), `src/components/admin/UserCommand.tsx` (plan edit), collector `settings.live_cap`.

## AI Resume
- **What it did:** generated or improved a resume with Claude, called directly from the browser using an API key each user pasted in (stored in localStorage).
- **Why parked:** hard-coded model `claude-3-5-sonnet-20240620` is retired; browser-side keys are fragile and expose users' keys to the page.
- **To bring back properly:** a server-side proxy (Cloud Function) holding one key, a current model, per-user rate limits, and PDF export.
- **Files then:** `src/pages/ResumeBuilder.tsx`, sidebar item, `/resume` route.

## Document vault
- **What it did:** a per-job "documents" modal that *simulated* uploads (progress bar, `url: "#"`); nothing was stored.
- **Why parked:** never connected to storage.
- **To bring back properly:** Firebase Storage with rules scoped to `users/{uid}/…`, size/type limits, real upload/download/delete, and a `documents` field (or subcollection) on jobs.
- **Files then:** `src/components/DocumentVaultModal.tsx`, vault buttons in `Dashboard.tsx` and `PipelineCard.tsx`, `documents` on jobs.
```

- [ ] **Step 4: Verify**

Run: the Step 1 grep again → no matches in `src`. Then run `npx tsc -b`; remaining errors may only come from the old data layer (fixed in Tasks 4–9). Report them.

- [ ] **Step 5: Hand off**

List the deleted and modified files and `docs/backlog.md`. Do not commit.

---

### Task 4: Account: sign-up, email verification, onboarding, export and delete

**Files:**
- Modify: `src/context/AuthContext.tsx`, `src/pages/Onboarding.tsx`, `src/pages/Account.tsx`, `src/pages/Signup.tsx`, `src/App.tsx`, `src/components/admin/UserCommand.tsx` (types only), `src/hooks/useEffectiveUserId.ts` (unchanged API)
- Create: `src/pages/VerifyEmail.tsx`, `src/lib/accountData.ts`, `src/lib/accountData.test.ts`

**Interfaces:**
- Consumes: `refs`, `accountFromDoc`, `newAccountDoc`, `Account` (Task 2).
- Produces: `useAuth()` returns `{ user, account: Account | null, impersonatedUser: Account | null, isAdmin, loading, needsVerification: boolean, signOut, updatePassword, impersonateUser, refreshUser }`. `userProfile` is renamed `account` everywhere. `lib/accountData.ts` exports `exportAccountData(uid): Promise<Blob>` and `deleteAccountData(uid, onProgress?): Promise<void>`.

- [ ] **Step 1: Write the failing tests** for `accountData` (pure helpers only), `src/lib/accountData.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { chunk, serializeForExport } from "./accountData";
import { Timestamp } from "firebase/firestore";

describe("accountData helpers", () => {
  it("chunk splits into batches of at most n", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 400)).toEqual([]);
  });
  it("serializeForExport turns Timestamps into ISO strings, recursively", () => {
    const t = Timestamp.fromDate(new Date("2026-10-14T12:00:00Z"));
    expect(serializeForExport({ a: t, b: [{ at: t }], c: "x" })).toEqual({
      a: "2026-10-14T12:00:00.000Z", b: [{ at: "2026-10-14T12:00:00.000Z" }], c: "x",
    });
  });
});
```
Run `npm test`. Expected: FAIL (module missing).

- [ ] **Step 2: Implement `src/lib/accountData.ts`**
```ts
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

const SUBCOLLECTIONS = ["jobs", "contacts", "notifications", "feedRequests"] as const;

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
  for (const name of SUBCOLLECTIONS) {
    const col = name === "jobs" ? refs.jobs(uid) : name === "contacts" ? refs.contacts(uid)
      : name === "notifications" ? refs.notifications(uid) : refs.feedRequests(uid);
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
```

- [ ] **Step 3: Rewrite `AuthContext.tsx` around `Account`**
  - **Profile load:**
    - On auth change, `getDoc(refs.user(uid))`.
    - If the doc is missing, `setDoc(refs.user(uid), newAccountDoc(user))`. This works before verification.
    - Then load it with `accountFromDoc`.
    - Also subscribe with `onSnapshot`, so `onboarded` updates without a page reload.
  - **`needsVerification`:** `!!user && !user.emailVerified && user.providerData.some(p => p.providerId === "password")`.
  - **`refreshUser`:** `await user.reload(); await user.getIdToken(true); setUser({...auth.currentUser})`. This forces the `email_verified` claim to refresh.
  - **`impersonateUser`:** takes an `Account`, and logs via `recordAdminLog("GOD_MODE_ENTRY", target.email)` (the new logger signature from Task 8; until then, keep the call compiling).
  - **Rename** `userProfile` → `account` and `UserProfile` → `Account` (re-export the type from `db.ts`), and update every consumer: `grep -rn "userProfile\|UserProfile" src`.

- [ ] **Step 4: Email verification**
  - **Sign-up:** after `createUserWithEmailAndPassword`, call `sendEmailVerification(cred.user, { url: APP_URL })`, then `navigate("/verify-email")`.
  - **Create `src/pages/VerifyEmail.tsx`:**
    - a glass card titled "Check your inbox";
    - text: "We sent a link to {email}. Open it, then come back here.";
    - buttons "I've verified" (calls `refreshUser()`, then navigates to "/" if `emailVerified`, otherwise shows "Not verified yet"), "Resend email" (calls `sendEmailVerification`, then disables itself for 60 s) and "Sign out".
  - **`App.tsx`:**
    - add a public `/verify-email` route;
    - in `AppRoutes`, before the onboarding check, `if (!loading && needsVerification && location.pathname !== "/verify-email" && !isPublicRoute) return <Navigate to="/verify-email" replace />`;
    - the onboarding check uses `account && !account.onboarded`.

- [ ] **Step 5: Onboarding and Account**
  - **`Onboarding.tsx`:**
    - fields first name, last name, birth date;
    - use `<input type="date">` and store its `YYYY-MM-DD` value directly;
    - update `refs.user(uid)` with `{ firstName, lastName, birthDate, onboarded: true, updatedAt: serverTimestamp() }`;
    - remove `utils/dob.ts` usage (delete `dob.ts` if nothing else imports it);
    - the Discover preset step stays.
  - **`Account.tsx`:**
    - the profile form edits `firstName`, `lastName` and `birthDate` (date input) and saves them the same way;
    - add a **"Your data"** section with two buttons:
      - **"Export my data":** `exportAccountData(uid)`, then download as `offerward-export-YYYY-MM-DD.json` via `URL.createObjectURL`;
      - **"Delete my account":** opens a confirm dialog that requires typing `DELETE`, then:
```ts
const handleDeleteAccount = async () => {
  const current = auth.currentUser;
  if (!current) return;
  setDeleting(true);
  try {
    await deleteAccountData(current.uid, (n) => setDeleteProgress(n));
    await deleteUser(current);
    navigate("/login?deleted=1", { replace: true });
  } catch (e) {
    if ((e as { code?: string }).code === "auth/requires-recent-login") {
      setDeleteError("For your security, sign out and sign back in, then delete your account again. Your data has already been removed.");
    } else {
      setDeleteError("Something went wrong. Please try again.");
    }
  } finally {
    setDeleting(false);
  }
};
```
  - **`Login.tsx`:** if `?deleted=1`, show a green notice: "Your account and all its data were deleted."

- [ ] **Step 6: Verify**

Run: `npm test` (accountData tests pass) and `npx tsc -b` (no errors in the touched files).

- [ ] **Step 7: Hand off**

List the changed files. Do not commit.

---

### Task 5: Jobs, pipeline, dashboard, analytics and export on the new model

**Files:**
- Modify: `src/context/JobContext.tsx`, `src/components/NewApplicationModal.tsx`, `src/pages/Pipeline.tsx`, `src/components/PipelineCard.tsx`, `src/components/StatusBadge.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Analytics.tsx`, `src/components/ConversionFunnel.tsx`, `src/utils/export.ts`, `src/utils/date.ts`
- Test: `src/context/jobForm.test.ts` (create)

**Interfaces:**
- Consumes: `refs`, `Job`, `JobInput`, `JobStatus`, `jobFromDoc`, `newJobDoc`, `jobUpdate`, `jobStatusChange`, `JOB_STATUS_LABEL`, `PRIORITY_LABEL` (Task 2); `useAuth().account` (Task 4).
- Produces: `useJobs()` returns `{ jobs: Job[], createJob(input: JobInput, source?: JobSource): Promise<string | null>, updateJob(id, input: JobInput): Promise<void>, updateJobStatus(id, status: JobStatus): Promise<void>, markFollowedUp(id): Promise<void>, deleteJob(id): Promise<void>, isModalOpen, editingJobId, openModal(id?), closeModal }`. `addJob` is removed (callers use `createJob`). Errors surface via a toast: export `jobsErrorMessage(e: unknown): string` from `JobContext`, which returns "Your device clock looks off; check your time settings and try again." for `permission-denied`, else "Couldn't save. Try again.".

- [ ] **Step 1: Write the failing test for the form's initial-state helper** (Review Focus 1), `src/context/jobForm.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { formFromJob, EMPTY_FORM } from "../components/jobForm";
import type { Job } from "../lib/db";

const job = { id: "j1", company: "Acme", title: "Intern", location: "", url: "https://a.com", status: "applied",
  priority: "high", notes: "n", salary: "$30/hr", deadlineAt: null } as unknown as Job;

describe("job form", () => {
  it("prefills from a job", () => {
    expect(formFromJob(job)).toMatchObject({ company: "Acme", status: "applied", priority: "high", url: "https://a.com", salary: "$30/hr" });
  });
  it("defaults for new jobs: location optional, status applied", () => {
    expect(EMPTY_FORM).toMatchObject({ location: "", status: "applied", priority: "medium" });
  });
});
```
Create `src/components/jobForm.ts` exporting `EMPTY_FORM: JobInput & { location: string; url: string; notes: string; salary: string }` and `formFromJob(job: Job)`. Run `npm test` and confirm it passes.

- [ ] **Step 2: Rewrite `JobContext.tsx`**
  - **Listen:** `onSnapshot(query(refs.jobs(uid), orderBy("createdAt", "asc")), snap => setJobs(snap.docs.map(d => jobFromDoc(d.id, d.data()))))`.
  - **`createJob`:** `addDoc(refs.jobs(uid), newJobDoc(input, source ?? "manual"))`.
  - **`updateJob`:** `updateDoc(refs.job(uid, id), jobUpdate(current, input))`.
  - **`updateJobStatus`:** `const u = jobStatusChange(current, status); if (u) updateDoc(...)`.
  - **`markFollowedUp`:** `updateDoc(ref, { followedUpAt: serverTimestamp(), updatedAt: serverTimestamp() })`.
  - Remove all `"Wishlist"` handling.
  - `uid` = `useEffectiveUserId()`.

- [ ] **Step 3: Rewrite `NewApplicationModal.tsx`** (bug fixes)
  - The form state initializes **once per open**. The effect depends on `[isModalOpen, editingJobId]` only; read the job via a ref or `jobs.find` inside the effect, without listing `jobs` as a dependency (use a `useRef` snapshot when opening). That way an incoming snapshot never resets the fields.
  - **Location** is optional; remove `required` and the `!location` guard.
  - **Status options** come from `JOB_STATUSES` with labels; priority from `PRIORITY_LABEL`.
  - **Fields:** company, title, location, link (`url`), status, priority, notes. Salary, deadline and description wait for Round 2's panel. Pass through the existing values on edit so nothing is lost.
  - **Save errors:** on failure, show `jobsErrorMessage(e)` inline and keep the modal open.

- [ ] **Step 4: Pipeline, card, badge**
  - `Pipeline.tsx` `COLUMNS` ids become the lowercase codes, with labels from `JOB_STATUS_LABEL`.
  - The priority filter uses `Priority` codes.
  - `PipelineCard`:
    - shows `appliedAt` (formatted `MMM d, yyyy` with date-fns `format`), falling back to "Saved {createdAt}";
    - uses `job.url`;
    - `priorityMeta` keyed by codes.
  - `StatusBadge` takes `JobStatus` and maps to `JOB_STATUS_LABEL`; keep the colors.

- [ ] **Step 5: Dashboard**
  - **Rows:** `key={activity.id}` (was the index).
  - **Greeting:** `Welcome back, {account?.firstName || user?.displayName?.split(" ")[0] || "there"}!`.
  - **Counts and filter options** use the codes.
  - **The "Added" column** shows `appliedAt ?? createdAt`, formatted, and sorts on that date's time.
  - **Bulk delete** uses `Promise.all`.

- [ ] **Step 6: Analytics and export**
  - **Analytics.tsx:**
    - the timeline uses `job.appliedAt ?? job.createdAt` (skip jobs with neither);
    - month key via `format(d, "MMM yyyy")`, sorted by the first day of the month;
    - week key via `utils/date.getWeekNumber(d)`;
    - status data labels via `JOB_STATUS_LABEL`.
  - **ConversionFunnel** props are unchanged; pass counts from the codes.
  - **export.ts:**
    - columns read `JOB_STATUS_LABEL[job.status]`, `job.url` and `format(job.appliedAt ?? job.createdAt, "MMM d, yyyy")` (or "—");
    - `statusColors` keyed by the codes.

- [ ] **Step 7: Verify**

Run `npm test`, `npx tsc -b` and `npx vite build`. Expected: PASS and a clean build for these files; other-area errors are reported only.

- [ ] **Step 8: Hand off**

List the files. Do not commit.

---

### Task 6: Network on the new model

**Files:**
- Modify: `src/context/NetworkContext.tsx`, `src/components/NewContactModal.tsx`, `src/components/NetworkStatusBadge.tsx`, `src/pages/Network.tsx`

**Interfaces:**
- Consumes: `refs`, `Contact`, `ContactInput`, `Strength`, `STRENGTH_LABEL`, `contactFromDoc`, `newContactDoc`, `contactUpdate`.
- Produces: `useNetwork()` returns `{ contacts: Contact[], addContact(input: ContactInput): Promise<void>, updateContact(id, input): Promise<void>, deleteContact(id): Promise<void>, isNetworkModalOpen, editingContactId, openNetworkModal(id?), closeNetworkModal }` (existing modal API names kept).

- [ ] **Step 1: Context.** Listen with `onSnapshot(query(refs.contacts(uid), orderBy("createdAt", "desc")))` → `contactFromDoc`. Writes use `newContactDoc` and `contactUpdate`.
- [ ] **Step 2: Modal.**
  - "Status" becomes **"Strength"**, with options from `STRENGTH_LABEL`.
  - "Last contacted" is `<input type="date" className="… color-scheme-dark">`, bound to `YYYY-MM-DD`. Empty means `null`; otherwise `new Date(value + "T12:00:00")`, which avoids timezone day-shifts.
  - Add a **LinkedIn URL** field (optional; validate it starts with `https://`, otherwise show "Use the full https:// link").
  - **The form initializes once per open**, the same fix as Task 5 Step 3.
- [ ] **Step 3: Badge and page.**
  - `NetworkStatusBadge` takes `Strength` and shows the label.
  - `Network.tsx`:
    - sorts `lastContactedAt` by time, with nulls last;
    - shows "Never" for null, else `formatDistanceToNowStrict(d, { addSuffix: true })`;
    - shows a LinkedIn icon link (`Linkedin` from lucide) when `linkedinUrl` is set.
- [ ] **Step 4: Verify.** Run `npx tsc -b` and `npx vite build`.
- [ ] **Step 5: Hand off.** List the files. Do not commit.

---

### Task 7: Notifications and broadcasts

**Files:**
- Modify: `src/context/NotificationContext.tsx`, `src/components/NotificationDropdown.tsx`, `src/components/admin/BroadcastControl.tsx`

**Interfaces:**
- Consumes: `refs.broadcasts()`, `refs.notifications(uid)`, `refs.notification(uid,id)`.
- Produces: a notification item type `{ id, source: "broadcast" | "direct", message, type: NoticeType, createdAt: Date, read: boolean }`.

- [ ] **Step 1: NotificationContext**
  - **Two listeners:**
    - `query(refs.broadcasts(), orderBy("createdAt", "desc"), limit(10))`, with read state kept in localStorage exactly as today;
    - `query(refs.notifications(uid), orderBy("createdAt", "desc"), limit(20))`, with read state from the doc's `read`.
  - **Merge and sort** by `createdAt` descending.
  - **"Mark read":** for direct notifications, `updateDoc(refs.notification(uid,id), { read: true })`; for broadcasts, the existing localStorage path.
  - Remove the old `targetUserId` logic and the 1-hour recency filter. Show the latest 10 broadcasts regardless of age, and let the read state dim them.
- [ ] **Step 2: BroadcastControl**
  - An empty target means a global broadcast: `addDoc(refs.broadcasts(), { message, type, createdBy: user.uid, createdAt: serverTimestamp() })`.
  - A target UID means a direct notification: `addDoc(refs.notifications(target), { message, type, read: false, createdAt: serverTimestamp() })`.
  - Log through `recordAdminLog` (Task 8 signature).
- [ ] **Step 3: Verify.** Run `npx tsc -b`.
- [ ] **Step 4: Hand off.** List the files. Do not commit.

---

### Task 8: Admin portal: honest vitals, user search, logs

**Files:**
- Modify: `src/lib/adminLogger.ts`, `src/components/admin/SystemVitals.tsx`, `src/components/admin/UserCommand.tsx`, `src/components/admin/SecurityPulse.tsx`, `src/components/admin/CollectorHealth.tsx`

**Interfaces:**
- Produces: `recordAdminLog(action: AdminAction, target: string, outcome?: "success" | "blocked" | "error"): Promise<void>`, which writes `{ action, actorUid, actorEmail, target, outcome, createdAt: serverTimestamp() }` to `refs.adminLogs()` using `auth.currentUser`. Update every caller (`grep -rn recordAdminLog src`).

- [ ] **Step 1: adminLogger** with the signature above. `AdminAction` = `"GOD_MODE_ENTRY" | "STATUS_CHANGE" | "GLOBAL_BROADCAST" | "DIRECT_BROADCAST" | "FEED_REMOVED"`.
- [ ] **Step 2: SystemVitals**
  - **Tiles:**
    - Users: `getCountFromServer(collection(db, "users"))`;
    - Applications: `getCountFromServer(collectionGroup(db, "jobs"))`;
    - Suspended: `getCountFromServer(query(collection(db,"users"), where("status","==","suspended")))`;
    - Firestore latency: time `getDoc(refs.systemHealth())`, shown as `{ms} ms`.
  - **Delete** `getHealthPercent`, `getThreatLevel` and the fake progress bars.
  - **Hourly chart:** `query(collectionGroup(db, "jobs"), where("createdAt", ">=", startOfToday), orderBy("createdAt"))`.
  - **Refresh** the counts every 60 s with `setInterval`. Count queries are one read each per 1,000 docs, so no live listeners on whole collections.
  - Keep `<CollectorHealth />`.
- [ ] **Step 3: UserCommand**
  - **Search by email:** `where("email","==",q)`.
  - **Search by name and birth date:** `firstName`, `lastName` and `birthDate` (date input, ISO).
  - **Lookup by UID:** `getDoc(refs.user(q))`.
  - **Edit:** only `status` (active / suspended), with `updatedAt: serverTimestamp()`; log `STATUS_CHANGE`.
  - **Impersonate** unchanged (it now takes an `Account`).
- [ ] **Step 4: SecurityPulse.** Read `query(refs.adminLogs(), orderBy("createdAt","desc"), limit(20))` and show `actorEmail`, `action`, `target`, `outcome` and time.
- [ ] **Step 5: CollectorHealth**
  - Reads `refs.systemHealth()` → `lastRun.{at, durationSec, usersServed, uniqueRoles, writes, failedSources}`.
  - The feeds table reads `refs.feeds()`, shows `updatedAt`, and shows "Remove" only for `origin === "user"`; removal logs `FEED_REMOVED`.
- [ ] **Step 6: Verify.** Run `npx tsc -b`.
- [ ] **Step 7: Hand off.** List the files. Do not commit.

---

### Task 9: Discover web on the feed/triage/settings docs

**Files:**
- Modify: `src/lib/discover.ts`, `src/pages/Discover.tsx`, `src/pages/DiscoverSettings.tsx`, `src/pages/Onboarding.tsx` (preset link unchanged)
- Rename: `src/hooks/useDiscoveryProfile.ts` → `src/hooks/useDiscover.ts`
- Test: `src/lib/discover.test.ts` (create)

**Interfaces:**
- Consumes: `refs.discoverSettings/Feed/Triage`, `refs.feedRequests`, `refs.feeds`, `refs.systemDiscover`, `useJobs().createJob` (Task 5).
- Produces:
  - from `useDiscover.ts`:
    - `useDiscoverSettings()` → `{ uid, settings: DiscoverSettings | null, loading, canEdit, isImpersonating, save(next), remove() }`;
    - `useDiscoverFeed()` → `{ feed: DiscoverFeed | null, loading }`;
    - `useTriage()` → `{ triage: Record<string, TriageEntry>, setStatus(key, entry | null) }`;
    - `useSystemDiscover()` → `{ families, inviteOnly }`;
  - from `discover.ts`: `DiscoverSettings` (the settings shape, with `companies.hidden` and `alerts`), `DiscoverCard`, `DiscoverFeed`, `TriageEntry = { status: "saved" | "dismissed"; jobId?: string; at: Date | null }`, and `normalizeSettings` (renamed from `normalizeProfile`).

- [ ] **Step 1: Write the failing tests**, `src/lib/discover.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { normalizeSettings, cardView } from "./discover";

describe("discover settings", () => {
  it("normalizes alerts and hidden companies with defaults", () => {
    const s = normalizeSettings({ companies: { warm: ["A"] }, alerts: { webhook: "x", minScore: 500 } });
    expect(s.companies).toEqual({ warm: ["A"], target: [], hidden: [] });
    expect(s.alerts.minScore).toBe(100);
  });
});

describe("cardView", () => {
  const card = { roleKey: "k", company: "Acme", title: "T", score: 80, closed: false } as never;
  it("merges triage status, defaulting to new", () => {
    expect(cardView(card, {}).status).toBe("new");
    expect(cardView(card, { k: { status: "saved", jobId: "j", at: null } }).status).toBe("saved");
  });
});
```
- [ ] **Step 2: `discover.ts`**
  - Rename `DiscoveryProfile` → `DiscoverSettings` and `blocked` → `hidden`, and add `alerts: { webhook, minScore }`. Remove `notify`.
  - Add the `DiscoverCard` type, with the exact feed card fields from the spec, `postedAt` and `firstSeenAt` as `Date | null`.
  - Add `DiscoverFeed = { refreshedAt: Date | null; totalMatches: number; cap: number; failedSources: number; cards: DiscoverCard[] }`, and `feedFromDoc(d)`.
  - Add `cardView(card, triage)` → `{ ...card, status: "new" | "saved" | "dismissed", jobId?: string }`.
  - Run the tests and confirm they pass.
- [ ] **Step 3: `useDiscover.ts`**
  - **Settings:** `onSnapshot(refs.discoverSettings(uid))`; `save` = `setDoc(ref, { ...next, updatedAt: serverTimestamp() })`.
  - **`remove`** deletes settings, feed and triage, then every `feedRequests` doc (`getDocs` + `deleteDoc`).
  - **Feed:** `onSnapshot(refs.discoverFeed(uid))` → `feedFromDoc`.
  - **Triage:** `onSnapshot(refs.discoverTriage(uid))`. `setStatus(key, entry)`:
    - for an entry: `setDoc(ref, { cards: { [key]: { status, ...(jobId ? { jobId } : {}), at: serverTimestamp() } }, updatedAt: serverTimestamp() }, { merge: true })`;
    - for `null`: `updateDoc(ref, { [`cards.${key}`]: deleteField(), updatedAt: serverTimestamp() })`.
  - **System:** `onSnapshot(refs.systemDiscover())`.
- [ ] **Step 4: `Discover.tsx`**
  - **Cards and run info** come from `feed` (`refreshedAt`, `totalMatches`, `cap`, `failedSources`); drop the `collectorRuns` listener.
  - **Merged views:** cards go through `cardView` with the triage doc.
  - **Save to pipeline:**
    - reuse a job whose `fromDiscover?.roleKey === card.roleKey`;
    - otherwise `createJob({ company, title, location, url, status: "saved", priority, notes, fromDiscover: { roleKey, fitScore: score } }, "discover")`;
    - then `setStatus(roleKey, { status: "saved", jobId })`.
  - **Dismiss** → `setStatus(key, { status: "dismissed" })`. **Restore** → `setStatus(key, null)`.
  - **Hide company** → `save({ ...settings, companies: { ...settings.companies, hidden: [...hidden, company] } })`.
  - **"My focus"** → `card.tier === "core"`.
  - **CLOSED badge** → `card.closed`.
  - **Banner:** "capped" means `totalMatches > cap`.
  - **Rename** product-visible strings to `APP_NAME`.
- [ ] **Step 5: `DiscoverSettings.tsx`**
  - Uses `useDiscoverSettings`, with "Hidden" (was "blocked") and `alerts`.
  - Feed requests: `addDoc(refs.feedRequests(uid), { company, url, status: "pending", createdAt: serverTimestamp() })`, listing `onSnapshot(query(refs.feedRequests(uid), orderBy("createdAt","desc")))`.
  - "Delete my Discover data" → `remove()`, with the toast "Deleted."; there is no next-refresh wait now.
  - Company autocomplete reads `refs.feeds()` names plus the companies of the current feed cards (no extra discoveries query).
- [ ] **Step 6: Verify.** Run `npm test` and `npx tsc -b`.
- [ ] **Step 7: Hand off.** List the files. Do not commit.

---

### Task 10: Shell, rename, privacy policy, 404, lint, hosting, bundle

**Files:**
- Modify: `index.html`, `src/App.tsx`, `src/components/Logo.tsx`, `src/pages/Login.tsx`, `src/pages/Signup.tsx`, `src/pages/Onboarding.tsx`, `src/pages/PrivacyPolicy.tsx`, `src/components/Sidebar.tsx`, `vite.config.ts`, `package.json`, `Source Code/website/firebase.json`, `eslint.config.js` (only if needed)
- Create: `src/pages/NotFound.tsx`

**Interfaces:**
- Consumes: `APP_NAME`, `APP_URL`, `CONTACT_EMAIL` (Task 2).

- [ ] **Step 1: The failing check for the rename**

Run: `grep -rniE "savethejob|traction" src index.html | grep -v "traction-37"`
Expected: matches.

- [ ] **Step 2: Rename**
  - **Text:** every user-visible "SaveTheJob" or "Traction" becomes `APP_NAME` (in TSX) or "Offerward" (in HTML).
  - **localStorage keys** may keep their old names. If you change any (for example `discover_last_visit_*`), keep reading the old key once as a fallback.
  - **`index.html`:**
```html
<title>Offerward: job search tracker</title>
<meta name="description" content="Track applications, discover early-career roles screened for sponsorship and citizenship requirements, and save jobs from any careers page." />
<meta name="theme-color" content="#0f172a" />
<meta property="og:title" content="Offerward" />
<meta property="og:description" content="Track applications and discover early-career roles that fit you." />
<meta property="og:type" content="website" />
```
  - **PrivacyPolicy.tsx:**
    - replace every hard-coded `https://traction-37.web.app` with `APP_URL` (and `/account` links with `${APP_URL}/account`);
    - replace every `contact@yugthapar.com` with `CONTACT_EMAIL`;
    - replace the product name with `APP_NAME`;
    - remove sentences about payments and plans if any refer to this product (keep the generic legal-category tables);
    - update "Last updated" to the implementation date.
- [ ] **Step 3: 404.** Create `src/pages/NotFound.tsx`: a glass card with "Page not found", a short line, and a `Link` to "/". Use it for the `*` route.
- [ ] **Step 4: Lint**
  - Add the devDependencies `eslint.config.js` imports: `@eslint/js`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` (versions compatible with the installed `eslint`; check with `npm ls eslint`).
  - Run `npm run lint`. Fix errors in files changed in Round 1.
  - For pre-existing files, fix real bugs (hooks rules); for style-only rules, disable that rule per file with a comment explaining why.
  - Goal: `npm run lint` exits 0.
- [ ] **Step 5: Static hosting.** Replace `Source Code/website/firebase.json` with:
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      { "source": "/assets/**", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
      { "source": "/index.html", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
    ]
  }
}
```
  - Deploy becomes `npm run build && firebase deploy --only hosting` (documented in Task 13).
- [ ] **Step 6: Bundle.** In `vite.config.ts`, add:
```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
        react: ["react", "react-dom", "react-router-dom"],
        charts: ["recharts"],
        dnd: ["@hello-pangea/dnd"],
      },
    },
  },
},
```
  - Keep `chunkSizeWarningLimit` at its default. If one chunk still warns, report its size; don't raise the limit.
- [ ] **Step 7: Verify.** Run `npm run lint`, `npm test`, `npx tsc -b`, `npx vite build` (all clean), and the Step 1 grep (no matches except `traction-37` in config/env).
- [ ] **Step 8: Hand off.** List the files. Do not commit.

---

### Task 11: Collector: feed builder (pure logic) with tests

**Files:**
- Create: `Source Code/collector/collector/feed.py`, `Source Code/collector/tests/__init__.py`, `Source Code/collector/tests/conftest.py`, `Source Code/collector/tests/test_feed.py`, `Source Code/collector/requirements-dev.txt` (`pytest>=8`), `Source Code/collector/pytest.ini`
- Modify: `Source Code/collector/collector/store.py` (`closed_at` column, `feeds_written` table; remove `pushes` usage)

**Interfaces:**
- Produces (used by Task 12):
  - **`feed.py`:**
    - `CAP=300`, `MAX_CARDS=400`, `MAX_BYTES=900_000`, `SHOW_DISMISSED_DAYS=30`, `KEEP_SAVED_AFTER_CLOSE_DAYS=30`, `DISMISS_MEMORY_DAYS=180`, `SCORE_DELTA=3`;
    - `card_from_row(row: Mapping, screen: dict | None) -> dict`;
    - `parse_triage(raw: dict | None) -> dict[str, dict]` (validates entries: `status in {saved, dismissed}`, `at` epoch float; drops bad ones);
    - `build_cards(live_rows, triaged_rows, triage, screen_of, now, cap=CAP) -> list[dict]`;
    - `needs_write(prev: dict[str, dict] | None, cards: list[dict]) -> bool`;
    - `compact(cards) -> dict[str, dict]`;
    - `expired_dismissals(triage, now) -> list[str]`.
  - **`store.py`:**
    - `Store.close_missing` also sets `closed_at`;
    - `Store.last_feed(uid) -> dict | None`;
    - `Store.save_feed(uid, compact: dict)`;
    - `Store.roles_by_keys(uid, keys) -> dict[str, Row]` (the old `match_rows`, kept name-compatible).

- [ ] **Step 1: pytest setup**

`pytest.ini`:
```ini
[pytest]
testpaths = tests
markers =
    emulator: needs FIRESTORE_EMULATOR_HOST (Firestore emulator)
addopts = -m "not emulator"
```
`tests/conftest.py`:
```python
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
```

- [ ] **Step 2: Write the failing tests**, `tests/test_feed.py`:
```python
import json

from collector import feed as F

NOW = 1_800_000_000.0
DAY = 86400


def row(key, score, active=1, closed_at=None, **kw):
    base = {"key": key, "company": f"Co {key}", "title": f"Engineer {key}", "location": "Phoenix, AZ",
            "url": f"https://x.com/{key}", "track": "intern", "terms": '["Summer 2027"]', "category": "Hardware",
            "sources": '["simplify-intern"]', "hints": "[]", "posted_ts": NOW - DAY, "first_seen": NOW - DAY,
            "last_seen": NOW, "active": active, "closed_at": closed_at, "score": score,
            "reasons": '["Core role match: firmware"]', "tier": "core", "excluded": ""}
    base.update(kw)
    return base


no_screen = lambda url: None  # noqa: E731


def test_live_cards_capped_and_sorted():
    live = [row(f"k{i}", 50 + i) for i in range(10)]
    cards = F.build_cards(live, {}, {}, no_screen, NOW, cap=3)
    assert [c["roleKey"] for c in cards] == ["k9", "k8", "k7"]


def test_triaged_roles_dont_use_cap_and_dismissed_memory_excludes():
    live = [row("a", 90), row("b", 80), row("c", 70)]
    triage = {"a": {"status": "dismissed", "at": NOW - 40 * DAY}, "b": {"status": "saved", "at": NOW}}
    triaged = {"a": live[0], "b": live[1]}
    cards = F.build_cards(live, triaged, triage, no_screen, NOW, cap=1)
    keys = [c["roleKey"] for c in cards]
    assert "a" not in keys          # dismissed 40 days ago: out of the feed, still remembered
    assert keys == ["b", "c"]       # saved kept, plus 1 live untriaged


def test_saved_kept_until_30_days_after_close():
    old = row("s", 80, active=0, closed_at=NOW - 31 * DAY)
    recent = row("t", 80, active=0, closed_at=NOW - 5 * DAY)
    triage = {"s": {"status": "saved", "at": NOW - 60 * DAY}, "t": {"status": "saved", "at": NOW - 60 * DAY}}
    cards = F.build_cards([], {"s": old, "t": recent}, triage, no_screen, NOW)
    assert [c["roleKey"] for c in cards] == ["t"]
    assert cards[0]["closed"] is True


def test_card_shape():
    c = F.card_from_row(row("k", 77), {"status": "screened", "citizen": True, "snippets": ["Must be a U.S. citizen."], "grad_window": ""})
    assert set(c) == {"roleKey", "company", "title", "location", "url", "track", "terms", "postedAt", "firstSeenAt",
                      "score", "tier", "reasons", "flags", "snippets", "gradWindow", "closed"}
    assert c["flags"]["citizen"] is True and c["terms"] == ["Summer 2027"]


def test_feed_size_limit():
    big = "x" * 4000
    live = [row(f"k{i:03}", 100 - (i % 50), reasons=json.dumps([big] * 3)) for i in range(400)]
    cards = F.build_cards(live, {}, {}, lambda u: {"snippets": [big[:260]] * 3, "status": "screened"}, NOW, cap=400)
    assert len(cards) <= F.MAX_CARDS
    assert len(json.dumps(cards, default=str).encode()) <= F.MAX_BYTES
    assert cards == sorted(cards, key=lambda c: -c["score"])


def test_needs_write_rules():
    cards = F.build_cards([row("a", 80), row("b", 70)], {}, {}, no_screen, NOW)
    prev = F.compact(cards)
    assert F.needs_write(None, cards)
    assert not F.needs_write(prev, cards)
    assert not F.needs_write(prev, F.build_cards([row("a", 82), row("b", 70)], {}, {}, no_screen, NOW))
    assert F.needs_write(prev, F.build_cards([row("a", 83), row("b", 70)], {}, {}, no_screen, NOW))
    assert F.needs_write(prev, F.build_cards([row("a", 80)], {}, {}, no_screen, NOW))


def test_parse_triage_drops_garbage_and_expired_dismissals():
    raw = {"cards": {"ok": {"status": "saved", "at": NOW}, "bad": {"status": "loved"}, "nomap": "x",
                     "old": {"status": "dismissed", "at": NOW - 200 * DAY}}}
    t = F.parse_triage(raw)
    assert set(t) == {"ok", "old"}
    assert F.expired_dismissals(t, NOW) == ["old"]
```
Run: `.venv/bin/pip install -r requirements-dev.txt && .venv/bin/python -m pytest tests/test_feed.py -q`. Expected: FAIL (no module `collector.feed`).

- [ ] **Step 3: Implement `collector/feed.py`**
```python
"""Builds each user's Discover feed doc (users/{uid}/discover/feed). Pure logic: no Firestore."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Callable, Mapping

CAP = 300
MAX_CARDS = 400
MAX_BYTES = 900_000
SHOW_DISMISSED_DAYS = 30
KEEP_SAVED_AFTER_CLOSE_DAYS = 30
DISMISS_MEMORY_DAYS = 180
SCORE_DELTA = 3
DAY = 86400


def _ts(x):
    return datetime.fromtimestamp(x, tz=timezone.utc) if x else None


def _loads(v):
    try:
        return json.loads(v or "[]")
    except (TypeError, ValueError):
        return []


def card_from_row(row: Mapping, screen: dict | None) -> dict:
    screen = screen or {}
    hints = set(_loads(row["hints"]))
    return {
        "roleKey": row["key"],
        "company": row["company"],
        "title": row["title"],
        "location": row["location"] or "",
        "url": row["url"] or "",
        "track": row["track"],
        "terms": _loads(row["terms"]),
        "postedAt": _ts(row["posted_ts"]),
        "firstSeenAt": _ts(row["first_seen"]),
        "score": int(row["score"] or 0),
        "tier": row["tier"] or "",
        "reasons": _loads(row["reasons"]),
        "flags": {
            "citizen": bool(screen.get("citizen")) or "citizen" in hints,
            "exportControl": bool(screen.get("export")),
            "noSponsor": bool(screen.get("no_sponsor")) or "no_sponsor" in hints,
            "sponsorFriendly": bool(screen.get("sponsor")) or "sponsor" in hints,
            "screened": screen.get("status") == "screened",
        },
        "snippets": list(screen.get("snippets") or [])[:3],
        "gradWindow": screen.get("grad_window") or "",
        "closed": not row["active"],
    }


def parse_triage(raw: dict | None) -> dict[str, dict]:
    """Validate the user-written triage doc; bad entries are ignored (rules can't check values)."""
    out: dict[str, dict] = {}
    cards = (raw or {}).get("cards")
    if not isinstance(cards, dict):
        return out
    for key, v in cards.items():
        if not isinstance(key, str) or len(key) > 64 or not isinstance(v, dict):
            continue
        if v.get("status") not in ("saved", "dismissed"):
            continue
        at = v.get("at")
        at = at.timestamp() if hasattr(at, "timestamp") else (float(at) if isinstance(at, (int, float)) else None)
        entry = {"status": v["status"], "at": at}
        if isinstance(v.get("jobId"), str):
            entry["jobId"] = v["jobId"][:128]
        out[key] = entry
    return out


def _size(cards: list[dict]) -> int:
    return len(json.dumps(cards, default=str).encode())


def build_cards(live_rows, triaged_rows: Mapping[str, Mapping], triage: dict[str, dict],
                screen_of: Callable[[str], dict | None], now: float, cap: int = CAP) -> list[dict]:
    """live_rows: open roles at/above the user's bar, best first. triaged_rows: role rows for triage keys."""
    cards: list[dict] = []
    live_keys: list[str] = []
    for r in live_rows:
        if r["key"] in triage:
            continue
        if len(live_keys) >= cap:
            break
        cards.append(card_from_row(r, screen_of(r["url"])))
        live_keys.append(r["key"])
    for key, t in triage.items():
        r = triaged_rows.get(key)
        if r is None:
            continue
        if t["status"] == "dismissed":
            if t["at"] is None or now - t["at"] > SHOW_DISMISSED_DAYS * DAY:
                continue
        else:  # saved
            closed_at = r["closed_at"] if "closed_at" in r.keys() else None
            if not r["active"] and closed_at and now - closed_at > KEEP_SAVED_AFTER_CLOSE_DAYS * DAY:
                continue
        cards.append(card_from_row(r, screen_of(r["url"])))
    cards.sort(key=lambda c: -c["score"])
    live = set(live_keys)
    while (len(cards) > MAX_CARDS or _size(cards) > MAX_BYTES) and any(c["roleKey"] in live for c in cards):
        for i in range(len(cards) - 1, -1, -1):  # drop the lowest-scoring live card
            if cards[i]["roleKey"] in live:
                live.discard(cards.pop(i)["roleKey"])
                break
    return cards


def compact(cards: list[dict]) -> dict[str, dict]:
    return {c["roleKey"]: {"score": c["score"], "closed": c["closed"], "flags": c["flags"]} for c in cards}


def needs_write(prev: dict[str, dict] | None, cards: list[dict]) -> bool:
    if prev is None:
        return True
    cur = compact(cards)
    if set(cur) != set(prev):
        return True
    for k, c in cur.items():
        p = prev[k]
        if abs(c["score"] - p["score"]) >= SCORE_DELTA or c["closed"] != p["closed"] or c["flags"] != p["flags"]:
            return True
    return False


def expired_dismissals(triage: dict[str, dict], now: float) -> list[str]:
    return sorted(k for k, t in triage.items()
                  if t["status"] == "dismissed" and t["at"] is not None and now - t["at"] > DISMISS_MEMORY_DAYS * DAY)
```
Note: `card_from_row` and `build_cards` must accept both `sqlite3.Row` and plain dicts (the tests use dicts). For `closed_at`, use `r["closed_at"] if "closed_at" in r.keys() else None`; this works for both.

- [ ] **Step 4: Store changes**
  - **Schema:** in `SCHEMA`, add `closed_at REAL` to `roles`, and add the table:
```sql
CREATE TABLE IF NOT EXISTS feeds_written (
    uid        TEXT PRIMARY KEY,
    cards      TEXT NOT NULL,
    written_at REAL NOT NULL
);
```
  - **Migrate existing databases:** in `Store.__init__`, after the existing column cleanup, run `ALTER TABLE roles ADD COLUMN closed_at REAL` if the column is missing.
  - **`close_missing`:** sets `closed_at=?` (`seen_at`) with `active=0`.
  - **`upsert`:** sets `closed_at=NULL` when a role reappears.
  - **New methods:**
    - `last_feed(uid)` returns `json.loads(cards)` or None;
    - `save_feed(uid, compact)` upserts with the current time;
    - `candidates` and `match_rows` return `r.closed_at` too (`r.*` already does).
  - **Remove** the `pushes` table methods (`pushes`, `mark_pushed`, `touch_push`, `forget_push`, `tombstone_push`, `expire_tombstones`) and the `pushes` CREATE. Leave a `DROP TABLE IF EXISTS pushes` in `__init__`.
  - **Keep `known_uids` and `forget_user`**, now based on `matches` and `feeds_written`.

- [ ] **Step 5: Run to green.** `.venv/bin/python -m pytest -q` passes.
- [ ] **Step 6: Hand off.** List the files. Do not commit.

---

### Task 12: Collector: Firestore layer, runner, profile, alerts, rename

**Files:**
- Modify: `collector/firestore_sync.py` (rewrite), `collector/runner.py`, `collector/profile.py`, `collector/notify.py`, `collector/__main__.py`, `collector/config.py`, `collector/util.py`, `collector/feeds.py` (request objects), `config.example.yaml`, `profiles/example-embedded-intern.yaml` (unchanged format; importer maps to the new names), `README.md`
- Create: `tests/test_profile.py`, `tests/test_score.py`, `tests/test_feeds.py`, `tests/test_emulator.py`

**Interfaces:**
- Consumes: Task 11's `feed.py` and `store.py`.
- Produces (`FirestoreSync`):
  - `load_settings(families, allowlist) -> list[Profile]`: collection-group `discover` with `enabled == True`, then keep only docs whose id is `settings`; uid = `snap.reference.parent.parent.id`;
  - `read_triage(uid) -> dict` (raw);
  - `write_feed(uid, doc)`;
  - `delete_triage_keys(uid, keys)`;
  - `pending_feed_requests() -> list[tuple[DocumentReference, dict, str]]`;
  - `count_added_feeds(uid)`, `resolve_feed_request(ref, status, reason, feed_id="", duplicate=False)`;
  - `feeds()`, `add_feed`, `mirror_config_feed`, `feed_status(fid, ok, error, count, current: dict | None)` (writes only when status/count/error changed);
  - `write_system_discover(families, invite_only, store)`, `write_system_health(summary)`;
  - `due_followups(uid, days)`, which reads `users/{uid}/jobs` where `status == "applied"`, `appliedAt` older than `days`, and `followedUpAt == None`;
  - `write_settings(uid, doc)`, used by `import-profile`.

- [ ] **Step 1: Port the earlier ad-hoc tests to pytest (they should fail first on the renamed fields)**
  - `tests/test_profile.py`:
    - `Profile.from_doc` reads `companies.hidden` and `alerts.{webhook,minScore}`;
    - `to_doc()` writes exactly the settings keys from the spec;
    - the caps (50 keywords, 100 companies, 12 terms) hold;
    - `(a+)+$` keywords stay literal;
    - bad webhooks are dropped;
    - non-bool `needsSponsorship` becomes False;
    - there's no `plan` attribute.
  - `tests/test_score.py`:
    - state codes (`IN` vs "Remote in USA");
    - graduation windows (Dec 2027 ok, May 2027 bad, "Junior 2027" isn't June);
    - citizenship and defense gating by `needs_sponsorship`;
    - no cap-exempt bonus without sponsorship;
    - hidden company excluded;
    - an exclude keyword beats a core match;
    - the product family lifts `avoid`.

    Copy the assertions from `docs/superpowers/plans/reference/collector-offline-checks.py` (the ad-hoc script used to verify the scorer and feeds parser before this round); write each as its own `def test_…`, and update field names (`blocked` → `hidden`) as you go.
  - `tests/test_feeds.py`:
    - `entry_from_url` parses Workday (both hosts), Greenhouse (including embed), Lever, Lever EU, Ashby, SmartRecruiters;
    - it rejects `example.com`, the metadata IP, lookalike hosts, userinfo, ports and `file://`;
    - `feed_id` formats.

  Run: `.venv/bin/python -m pytest -q`. Expected: the profile tests FAIL (`hidden` / `alerts` not supported yet).

- [ ] **Step 2: `profile.py`**
  - `blocked` → `hidden` (`companies.hidden`).
  - `webhook` / `notify_min_score` read from `alerts.webhook` / `alerts.minScore`.
  - Remove `plan`.
  - `to_doc()` emits `companies: {warm, target, hidden}` and `alerts: {webhook, minScore}`.
  - `from_yaml` maps the YAML's `companies.blocked` (old) or `companies.hidden`, plus `webhook` and `notify_min_score`.
  - In `score.py`, rename the uses of `profile.blocked` to `profile.hidden`.

- [ ] **Step 3: Rewrite `firestore_sync.py`** for the new layout, keeping the `Writer` class (batched writes, after-commit callbacks).
  - Paths:
    - `self.db.collection("users").document(uid).collection("discover").document("feed")`;
    - `…document("triage")`, `…document("settings")`;
    - `collection("feeds")`, `collection("system").document("discover")` and `…document("health")`.
  - `load_settings`:
    ```python
    q = self.db.collection_group("discover").where(filter=FieldFilter("enabled", "==", True))
    for snap in q.stream():
        if snap.id != "settings":
            continue
        uid = snap.reference.parent.parent.id
    ```
    Then the allowlist filter and `Profile.from_doc`. Import `FieldFilter` from `google.cloud.firestore_v1.base_query` (this also removes the positional-argument warning).
  - `write_feed(uid, doc)`: `self.w.set(ref, doc)` (full overwrite).
  - `delete_triage_keys(uid, keys)`: `self.w.update(ref, {f"cards.{k}": firestore.DELETE_FIELD for k in keys})`.
  - `pending_feed_requests`:
    ```python
    q = self.db.collection_group("feedRequests").where(filter=FieldFilter("status", "==", "pending"))
    ```
    It returns `(snap.reference, snap.to_dict(), snap.reference.parent.parent.id)`.
  - `count_added_feeds(uid)`: queries `users/{uid}/feedRequests` where `status == "added"` and excludes `duplicate`.
  - `feed_status(...)`: compares against the `current` feed doc (from `feeds()`) and only writes `{status, earlyCareerCount, lastError, updatedAt}` when one of them differs. Status values are `ok` / `failing`.
  - `add_feed`: sets `{…, origin: "user", status: "checking", earlyCareerCount: 0, lastError: "", createdAt, updatedAt}`.
  - `write_system_discover`: `{roleFamilies: [{id,label}], inviteOnly, updatedAt}`, written only when the signature changes (store meta).
  - `write_system_health(summary)`: `{lastRun: {at: SERVER_TIMESTAMP, **summary}}`.
  - Delete the `sync_user`, `_prune`, `triaged`, `existing_profiles` and `purge_user` code.

- [ ] **Step 4: `runner.py`**
  - **Per user,** replacing the `sync_user` block:
```python
triage = parse_triage(fs.read_triage(prof.uid))
live = store.candidates(prof.uid, prof.min_score)
triaged_rows = store.match_rows(prof.uid, sorted(triage))
lookup = _ScreenLookup(store)
cards = build_cards(live, triaged_rows, triage, lookup.get, now_ts())
expired = expired_dismissals(triage, now_ts())
if expired:
    fs.delete_triage_keys(prof.uid, expired)
if needs_write(store.last_feed(prof.uid), cards):
    fs.write_feed(prof.uid, {
        "refreshedAt": fs.fs.SERVER_TIMESTAMP, "totalMatches": len(live), "cap": CAP,
        "failedSources": len(errors), "cards": cards,
    })
    fs.flush()
    store.save_feed(prof.uid, compact(cards))
    users[prof.uid]["wrote"] = True
hot = [c for c in cards if c["roleKey"] in new_keys and c["score"] >= prof.notify_min_score]
```
  - **Alerts:** `send_digest(prof.webhook, hot, followups, app_url)`, where `notify._lines` now reads card dicts (`score`, `company`, `title`, `location`, `track`, `url`).
  - **Remove** the per-user `write_user_run` call.
  - **Global summary:** `fs.write_system_health(summary)` and `fs.write_system_discover(...)`.
  - **Remove** the purge block. Keep `store.drop_users_except` and add `store.forget_user` for uids that are no longer served.
  - **Feeds:** the feed-status loop passes `current=fs_feeds.get(fid)`.
  - **Feed requests:** `process_requests(fs, cfg, known)` now gets `(ref, data, uid)` tuples; update `feeds.py` accordingly (`fs.resolve_feed_request(ref, …)`).

- [ ] **Step 5: Admin failure alert**
  - **Config:** `config.py` DEFAULTS gains `"notify": {"admin_webhook": ""}`, and `config.example.yaml` gains:
```yaml
notify:
  admin_webhook: ""   # optional Discord webhook / https://ntfy.sh/<topic>: told when a run or a source fails
```
  - **`notify.py`:** add `send_admin_alert(url, title, lines)`, which validates the URL with `valid_webhook` and posts the same way as `send_digest`.
  - **`__main__.py` `run`:**
    ```python
    try:
        summary = run(...)
    except Exception as e:
        send_admin_alert(cfg["notify"]["admin_webhook"], "Offerward collector run failed", [repr(e)[:500]])
        raise
    if summary["failedSources"]:
        send_admin_alert(cfg["notify"]["admin_webhook"], "Offerward collector: sources failed",
                         [f"{k}: {v[:150]}" for k, v in summary["failedSources"].items()])
    ```

- [ ] **Step 6: Rename and import**
  - `util.USER_AGENT` → `"OfferwardCollector/1.0 (+https://traction-37.web.app)"`; the runner sets `OfferwardCollector/1.0 (+{app_url})`.
  - Digest titles say "Offerward".
  - `README.md`: "Traction collector" → "Offerward collector", and the Firestore section describes the new layout (no `discoveries`/`collectorRuns`). Keep the server paths.
  - `import-profile` writes via `fs.write_settings(uid, {**prof.to_doc(), "updatedAt": SERVER_TIMESTAMP})`.

- [ ] **Step 7: Emulator integration test**, `tests/test_emulator.py` (marked `emulator`).
  - **Fixture:**
    - generates a throwaway RSA key with `cryptography` into `tmp_path/fake-sa.json` (project `demo-offerward`);
    - writes a config with `db_path` / `report_dir` in `tmp_path`;
    - monkeypatches `collector.runner.gather` to return a fixed list of ~20 `Posting`s (no network). Include one with a citizenship hint, one closed on the second run, and companies for hidden / warm tests.
  - **Seed** with `google.cloud.firestore.Client(project="demo-offerward", credentials=AnonymousCredentials())`:
    - `users/uA/discover/settings` (needsSponsorship true);
    - `users/uB/discover/settings` (false);
    - `users/uC/discover/settings` (enabled false);
    - `users/uB/feedRequests/r1` pending to `https://example.com`.
  - **Assert after run 1:**
    - uA and uB have `discover/feed` with `cap == 300` and cards sorted by score;
    - uA has no live citizen-flagged cards, while uB's carries `flags.citizen`;
    - uC has no feed;
    - `r1` is `rejected`;
    - `system/discover` and `system/health` exist;
    - `feeds/*` mirrors exist for the config watchlist (use a 2-entry watchlist).
  - **Then:** set uB triage `{k: dismissed, at: now-40d}` and `{k2: saved}`, and run again (same postings except one closed).
  - **Assert after run 2:**
    - the dismissed key is absent from uB's feed;
    - the saved one is present;
    - no feed write for uA if nothing changed: capture `fs.writes`, or the feed's `refreshedAt` is unchanged.

  Run: start the emulator (`firebase emulators:start --only firestore --project demo-offerward` from `tests/rules/`), then `FIRESTORE_EMULATOR_HOST=127.0.0.1:8086 .venv/bin/python -m pytest -m emulator -q`. Expected: PASS.

- [ ] **Step 8: Verify the whole collector**
  - `.venv/bin/python -m pytest -q` (offline), plus the emulator run above.
  - A live dry run: `.venv/bin/python -m collector --config <scratch config> run --dry-run --profile profiles/example-embedded-intern.yaml`. Expected: `done:` with `failedSources: {}` (network permitting) and a report written.
- [ ] **Step 9: Hand off.** List the files. Do not commit.

---

### Task 13: Chrome extension 1.1

**Files:**
- Modify: `Source Code/extension/manifest.json`, `popup.html`, `popup.js`, `content.js`, `utils/jobParser.js`, `utils/popup/firestoreService.js`, `background.js`, `css/content.css` (name strings only)
- Create: `tests/extension/commit.test.mjs`, `tests/extension/README.md`

**Interfaces:**
- Consumes: the jobs rules from Task 1.
- Produces: `firestoreService.buildJobCommit({ job, uid, projectId, docId, nowIso })` returns the REST `documents:commit` request body. It's exported on `self.STJPopup` (the existing global) and through `globalThis.__OFFERWARD_TEST__`, so Node can load it.

- [ ] **Step 1: Write the failing test**, `tests/extension/commit.test.mjs`. It runs inside the rules emulator from `tests/rules`, using that package's dependencies (`node --test ../extension/commit.test.mjs` from `tests/rules`):
```js
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

const src = readFileSync(new URL("../../Source Code/extension/utils/popup/firestoreService.js", import.meta.url), "utf8");
const sandbox = { self: {}, URL, console };
sandbox.window = sandbox.self;
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
// Inside the vm, `globalThis` is the sandbox object itself.
const svc = sandbox.__OFFERWARD_TEST__ ?? sandbox.self.STJPopup?.firestoreService;

const host = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8086";
const project = "demo-offerward";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
// The emulator accepts unsigned tokens (as @firebase/rules-unit-testing does).
const token = (uid, verified = true) => {
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: "none", typ: "JWT" })}.${b64({
    iss: `https://securetoken.google.com/${project}`, aud: project, sub: uid, user_id: uid, iat: now, exp: now + 3600,
    auth_time: now, email: `${uid}@example.com`, email_verified: verified, firebase: { sign_in_provider: "password", identities: {} },
  })}.`;
};

async function commit(uid, body, verified = true) {
  const res = await fetch(`http://${host}/v1/projects/${project}/databases/(default)/documents:commit`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token(uid, verified)}` },
    body: JSON.stringify(body),
  });
  return res.status;
}

const job = { title: "Firmware Intern", company: "Acme", location: "Phoenix, AZ", priority: "high",
              status: "applied", url: "https://www.linkedin.com/jobs/view/1" };

test("extension commit body is accepted by the rules", async () => {
  const body = svc.buildJobCommit({ job, uid: "u1", projectId: project, docId: "abc123", nowIso: new Date().toISOString() });
  assert.equal(await commit("u1", body), 200);
});
test("saving into another user's folder is rejected", async () => {
  const body = svc.buildJobCommit({ job, uid: "u2", projectId: project, docId: "x1", nowIso: new Date().toISOString() });
  assert.equal(await commit("u1", body), 403);
});
test("unverified email accounts are rejected", async () => {
  const body = svc.buildJobCommit({ job, uid: "u3", projectId: project, docId: "x2", nowIso: new Date().toISOString() });
  assert.equal(await commit("u3", body, false), 403);
});
```
Run with the emulator up. Expected: FAIL (`buildJobCommit` is undefined).

- [ ] **Step 2: Implement `buildJobCommit` and `saveJob`** in `firestoreService.js`:
```js
  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
  }
  /** REST documents:commit body for a new job in users/{uid}/jobs (see firestore.rules). */
  function buildJobCommit({ job, uid, projectId, docId, nowIso }) {
    const name = `projects/${projectId}/databases/(default)/documents/users/${uid}/jobs/${docId}`;
    const s = (v, max) => ({ stringValue: String(v || "").trim().slice(0, max) });
    const fields = {
      company: s(job.company, 200), title: s(job.title, 200), location: s(job.location, 200),
      url: s(job.url, 2000), status: { stringValue: job.status }, priority: { stringValue: job.priority },
      notes: s("", 5000), salary: s("", 100), source: { stringValue: "extension" },
      sourceSite: s(hostOf(job.url), 200), description: s("", 30000),
      deadlineAt: { nullValue: null }, followedUpAt: { nullValue: null }, fromDiscover: { nullValue: null },
      history: { arrayValue: { values: [{ mapValue: { fields: {
        status: { stringValue: job.status }, at: { timestampValue: nowIso } } } }] } },
      interviews: { arrayValue: { values: [] } },
    };
    const transforms = [
      { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
      { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
    ];
    if (job.status === "applied") transforms.push({ fieldPath: "appliedAt", setToServerValue: "REQUEST_TIME" });
    else fields.appliedAt = { nullValue: null };
    return { writes: [{ update: { name, fields }, currentDocument: { exists: false }, updateTransforms: transforms }] };
  }

  function newDocId() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    return Array.from(bytes, (b) => chars[b % chars.length]).join("");
  }

  async function saveJob(job, session) {
    const config = assertConfig();
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents:commit`;
    const body = buildJobCommit({ job, uid: session.uid, projectId: config.projectId, docId: newDocId(), nowIso: new Date().toISOString() });
    return postJson(url, body, session.idToken);
  }
```
Export `{ getConfigError, saveJob, buildJobCommit }`, and also set `globalThis.__OFFERWARD_TEST__ = { buildJobCommit }`. Delete the old `toFirestoreFields`.

- [ ] **Step 3: Popup**
  - **`popup.js`:** builds `{ title, company, location, priority, status, url }`, with lowercase status and priority codes and no `dateApplied` or `userId`. It calls `firestoreService.saveJob(job, session)`.
  - **Error messages:** on 403, show "Couldn't save. Check that your email is verified and your device clock is right."; otherwise "Couldn't save. Try again."
  - **`popup.html`:**
    - status options `saved` / `applied` (selected) / `interviewing`, with labels Saved / Applied / Interviewing;
    - priority values `high` / `medium` / `low`;
    - "SaveTheJob" → "Offerward" in the title and text;
    - the success text links to `https://traction-37.web.app/pipeline` ("Open in Offerward").

- [ ] **Step 4: Coverage and parsing**
  - **`manifest.json`:**
    - `"name": "Offerward"`, `"version": "1.1"`, `action.default_title: "Offerward"`, description "Save jobs from any careers page into your Offerward pipeline.";
    - add these to `host_permissions` and both content-script `matches`, keeping existing entries: `"*://*.myworkdayjobs.com/*"`, `"*://*.myworkdaysite.com/*"`, `"*://jobs.ashbyhq.com/*"`, `"*://jobs.smartrecruiters.com/*"`, `"*://jobs.eu.lever.co/*"`;
    - remove the never-matching `"*://*.workdayjobs.com/*"`.
  - **`content.js` `knownSites`:** add `"myworkdayjobs.com"`, `"myworkdaysite.com"`, `"ashbyhq.com"` and `"smartrecruiters.com"`.
  - **`jobParser.js`:** extract a JSON-LD `JobPosting` first:
    - parse every `script[type="application/ld+json"]`;
    - walk arrays and `@graph`;
    - take `title`, `hiringOrganization.name`, and `jobLocation[].address.addressLocality` + `addressRegion`, or `"Remote"` if `jobLocationType == "TELECOMMUTE"`;
    - fall back to the existing selectors.
  - **`background.js`:** add `myworkdayjobs|myworkdaysite|ashbyhq|smartrecruiters` to the major-board regex.

- [ ] **Step 5: Run to green.** From `tests/rules` with the emulator running: `node --test ../extension/commit.test.mjs` passes. Also load the extension unpacked in Chrome and confirm the popup opens. If Chrome isn't available, report that it was skipped.
- [ ] **Step 6: Package.** `cd "Source Code/extension" && zip -r ../../dist/offerward-extension-1.1.zip . -x "*.DS_Store"` (create `dist/` at the repo root, which is git-ignored in Task 14). This is the Web Store upload.
- [ ] **Step 7: Hand off.** List the files. Do not commit.

---

### Task 14: Repo cleanup and documentation

**Files:**
- Modify: `.gitignore`, `README.md`, `Source Code/collector/deploy/PROXMOX-SETUP.md` (wording only), `docs/owner-checklist.md` (tick items done by Round 1 tasks only if verifiably done)
- Untrack: `.firebase/hosting.ZGlzdA.cache`, `.firebase/hosting.eQ.cache`, `Source Code/website/.firebase/hosting.ZGlzdA.cache`, `extension.zip`
- Dependency updates: `Source Code/website/package.json`, `package-lock.json`

- [ ] **Step 1: Untrack artifacts**

Run: `git rm --cached -r .firebase "Source Code/website/.firebase" extension.zip` (this is unstaging, not a commit). Append to `.gitignore`:
```
# Build and deploy artifacts
.firebase/
Source Code/website/.firebase/
dist/
extension.zip
tests/rules/node_modules/
```

- [ ] **Step 2: Dependabot security updates**

Run: `git fetch origin && git branch -r | grep dependabot`, and for each branch `git diff origin/master...origin/<branch> --stat` to see the bump. Apply the equivalent updates on this branch:
- direct dependencies: `npm install vite@^7.3.2 jspdf@^4.2.1` (use the exact versions from the branches if newer);
- transitive ones: `npm audit fix` (never `--force`);
- `npm ci`, then `npm test`, `npx tsc -b` and `npx vite build` must still pass.

List each Dependabot branch and whether it's covered, so the owner can close its pull request.

- [ ] **Step 3: README rewrite.** Sections:
  1. **Offerward:** a one-paragraph description.
  2. **Features:** pipeline, network, analytics, Discover, extension.
  3. **Repository layout:** `Source Code/website`, `Source Code/extension`, `Source Code/collector`, `firestore.rules`, `tests/`, `docs/`.
  4. **Getting started:** website `npm ci`, `.env.local` keys (`VITE_FIREBASE_*`, `VITE_ADMIN_UIDS`, `VITE_APP_URL`, `VITE_CONTACT_EMAIL`), `npm run dev`.
  5. **Tests:** `npm test` (website), `tests/rules` (`npm test`), the collector (`pytest`, `pytest -m emulator`), the extension commit test.
  6. **Deploy:**
     - rules and indexes from the repo root (`firebase deploy --only firestore`);
     - the site from `Source Code/website` (`npm run build && firebase deploy --only hosting`);
     - the extension (zip in `dist/`, upload to the Web Store);
     - the collector (`Source Code/collector/deploy/PROXMOX-SETUP.md`).
  7. **Data model:** a link to the spec.
  8. **Roadmap:** a link to `docs/roadmap.md`.
  9. **Admins:** `isAdmin` in the rules plus `VITE_ADMIN_UIDS`.
  10. **Security:** the rules are the boundary; never commit keys.

  Remove the "Indeed supported" style claims that aren't true. List the supported sites from `manifest.json`.
- [ ] **Step 4: Verify.**
  - `git status --short` shows the untracked artifacts as deleted from the index, and no key files or `.db` files.
  - Every test command from the README runs.
- [ ] **Step 5: Hand off.** List the files and the Dependabot coverage table. Do not commit.

---

## Final verification (controller, after Task 14)

- [ ] **Website:** `npm run lint && npm test && npx tsc -b && npx vite build` in `Source Code/website`.
- [ ] **Rules:** `npm test` in `tests/rules`.
- [ ] **Extension:** with the emulator up, `node --test ../extension/commit.test.mjs` from `tests/rules`.
- [ ] **Collector:** `.venv/bin/python -m pytest -q`, plus `pytest -m emulator` with the emulator up.
- [ ] **Code review:** dispatch the final whole-branch reviewer (subagent-driven-development final review).
- [ ] **Commit commands:** give the owner one block per task, with explicit paths and no attribution lines.

## Ship (only with the owner's go-ahead at each step)

1. **Rules and indexes:** `firebase deploy --only firestore --project traction-37 --non-interactive` from the repo root. Then confirm that anonymous REST reads return `PERMISSION_DENIED`.
2. **Website:** `npm run build && firebase deploy --only hosting --project traction-37` from `Source Code/website`. Then check that the live bundle contains `Offerward`, and that `/verify-email` and `/does-not-exist` render.
3. **Discover:**
   - `import-profile --uid 7l0wLOQs3BdKoyUlMPqTCqhfC802 --from ~/.config/traction/my-profile.yaml`. The owner's account doc must exist first, so the owner signs in once.
   - Then one `run` from this machine.
   - Verify `users/<uid>/discover/feed` has about 300 cards, and that `system/*` exists.
4. **Backups:** `firebase firestore:backups:schedules:create --project traction-37 --recurrence DAILY --retention 14d`. If the project needs the Blaze plan for this, report it and add it to the owner checklist instead.
5. **Extension:** the owner uploads `dist/offerward-extension-1.1.zip` with the listing updates in `docs/owner-checklist.md`.
6. **GitHub:**
   - after the owner merges Round 1 into `master`: `git push origin --delete main`;
   - the owner closes the Dependabot pull requests covered in Task 14.
7. **Reset notice:** show the owner this draft; post it via the admin Broadcast page only after approval:
   > "Offerward (formerly SaveTheJob) has been rebuilt. As part of the move, data saved before October 14, 2026 was reset; sorry for the trouble. Sign in to set up your pipeline again, and try the new Discover page for matching roles."
