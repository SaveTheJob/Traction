# Offerward, Round 1: data restructure and foundation

Date: 2026-10-14. Status: approved in conversation section by section; this file is for final review.

## Where this fits

The product is renamed **Offerward** (it was SaveTheJob / Traction). The roadmap has five rounds, and each gets its own spec, plan and review:

| Round | Scope |
|---|---|
| **1. Foundation (this spec)** | Firestore restructure with every new field designed in. Removal of Pro, AI Resume and the document vault. Bug fixes. Export data / delete account. Email verification. The Offerward rename. Backups, tests, tooling and repo cleanup. Extension 1.1 (new paths, the rename and site coverage) |
| 2. Pipeline & Today | Today home page, Board / List views, job detail panel with timeline, interviews and deadlines (with calendar export), salary / source / duplicate warning |
| 3. Network & insights | Contacts linked to jobs, with check-ins; real analytics; weekly goal and streak |
| 4. Extension 1.2 | Visa check on any posting, capture of description / pay / deadline, already-saved with quick status update |
| 5. Public face | Landing page and SEO, installable PWA with mobile nav, App Check (needs a small token server so the extension keeps working) |

Round 1 designs and enforces the data for Rounds 2–4 now. Fields like `history`, `interviews`, `salary`, `jobIds` and `goals` are created, validated and written where it's natural in Round 1. Later rounds add screens, not migrations.

## Why restructure

1. **Scattered ownership.** `jobs`, `contacts`, `discoveries` and `feedRequests` are top-level collections that find their owner through a `userId` field.
2. **Duplicated postings.** Discover copies every matching posting into its own doc per user: 300 docs per user, about 300 reads to open the page, and up to 300 writes per refresh.
3. **Inconsistent naming and formats.** `admin_logs` sits next to `collectorRuns`, dates are stored as display text ("Oct 14, 2026", "Today"), and status values have been renamed over time.
4. **Too many collections.** There are ten top-level collections.

The database was emptied on 2026-10-14 at the owner's request, so nothing needs migrating. No one uses the extension yet, so there is no compatibility bridge: old installs simply stop saving until they update.

**Goals, all weighted equally:** easy to understand, low cost as it grows, simple app code, and one-operation privacy.

**Unchanged:**
- Firestore is still the database.
- Pipeline, network, Discover, admin portal, broadcasts and the extension remain.
- Users see only their own data, admins are listed by UID, and the collector writes with its own service account.

## Removed and parked

Removed from the app and recorded in `docs/backlog.md`. Each entry covers what it did, why it was parked, what bringing it back properly needs, and the commit that last contained it (`56a1fe8`).

| Feature | Removed | Coming back needs |
|---|---|---|
| **Pro plan** | `plan` field and admin plan editing, Account plan cards, the Stripe test link, the 50-job Free limit, the Free/Pro Discover caps (everyone gets 300 cards) | live Stripe and a server webhook that sets the plan |
| **AI Resume** | `ResumeBuilder` page, its route and sidebar link | a server-side proxy with a current model (it used a retired model ID and each user's own API key in the browser) |
| **Document vault** | `DocumentVaultModal`, the vault buttons, the `documents` field | Firebase Storage, storage rules and real uploads |

## Conventions

- Collection and field names are camelCase. Collections are plural nouns, and one-off documents get fixed IDs (`discover/settings`).
- Moments in time are Firestore Timestamps whose names end in `At`. Calendar values with no time of day are ISO strings (`birthDate: "2004-05-17"`, `graduation: "2027-12"`). Formatting happens only in the UI.
- Status-style fields store lowercase codes, and the UI maps them to labels.
- Nothing under `users/{uid}` stores the owner's uid.
- Client-written `createdAt` and `updatedAt` use `serverTimestamp()`, and the rules require `== request.time`.
- Embedded list items that the UI edits individually (`interviews`, `interactions`) carry a client-generated `id` (`crypto.randomUUID()`).

## Layout

```
users/{uid}                        account
  jobs/{jobId}                     pipeline (with history, interviews)
  contacts/{contactId}             network (with interactions, linked jobs)
  notifications/{id}               messages to this user
  feedRequests/{id}                "add a careers page" requests
  discover/settings                Tune matches          (user writes)
  discover/feed                    cards                 (collector writes)
  discover/triage                  saved/dismissed       (user writes)
feeds/{feedId}                     shared company job feeds
broadcasts/{id}                    messages to everyone
adminLogs/{id}                     admin audit trail
system/discover                    role families, invite-only flag (signed-in read)
system/health                      collector run health  (admin read)
```

There are five top-level collections.

## Documents

### `users/{uid}`
| Field | Type | Notes |
|---|---|---|
| email | string | must equal the sign-in token's email |
| firstName, lastName | string | ≤ 100 |
| birthDate | string | `YYYY-MM-DD` or `""` |
| status | `active` \| `suspended` | admin-only; `active` on create |
| onboarded | bool | |
| goals | `{ weeklyApplications: int 1–100 \| null }` | Round 3 UI; `null` on create |
| createdAt, updatedAt | Timestamp | |

Users may change `firstName`, `lastName`, `birthDate`, `onboarded`, `goals` and `updatedAt`, and may delete their own doc as part of deleting their account.

### `users/{uid}/jobs/{jobId}`
| Field | Type | Notes |
|---|---|---|
| company, title | string | required, ≤ 200 |
| location | string | ≤ 200, optional (was required) |
| url | string | ≤ 2000, was `link` |
| status | `saved` \| `applied` \| `interviewing` \| `offer` \| `rejected` | |
| priority | `high` \| `medium` \| `low` | |
| notes | string | ≤ 5000 |
| salary | string | ≤ 100, free text ("$28/hr", "$120–140k") |
| source | `manual` \| `extension` \| `discover` | set on create, never changes |
| sourceSite | string | ≤ 200, hostname of `url` (`linkedin.com`), `""` if none |
| description | string | ≤ 30000, posting text (Round 4 extension capture; editable in Round 2 panel) |
| deadlineAt | Timestamp \| null | application deadline |
| appliedAt | Timestamp \| null | set when created as, or first moved to, `applied` |
| followedUpAt | Timestamp \| null | reset to null when `appliedAt` is set |
| history | list ≤ 50 of `{status, at}` | starts with one entry; every status change appends `{newStatus, now}` |
| interviews | list ≤ 20 of `{id, at, type, round, location, notes}` | `type`: `phone` \| `video` \| `onsite` \| `technical` \| `other`; `round` int ≥ 1; `location` ≤ 300 (a place or a meeting link); `notes` ≤ 2000 |
| fromDiscover | `{roleKey, fitScore}` \| null | |
| createdAt, updatedAt | Timestamp | |

Rules on `history`:
- On create it has exactly one entry, `{status, at}`.
- On an update that changes `status`, it must grow by exactly one entry, `{status: <new>, at}`, and the earlier entries must be unchanged.
- On updates that don't change status, it must not change.
- Firestore can't put server timestamps inside list items, so `at` comes from the client clock. The rules accept it within 5 minutes before or 1 minute after `request.time`.

### `users/{uid}/contacts/{contactId}`
| Field | Type | Notes |
|---|---|---|
| name | string | required, ≤ 200 |
| role, company, email | string | ≤ 200 |
| linkedinUrl | string | ≤ 300, `https://` only |
| strength | `hot` \| `warm` \| `cold` | was `status` |
| lastContactedAt | Timestamp \| null | date picker; empty = never |
| checkInEveryDays | int 7–365 \| null | Round 3 reminders |
| jobIds | list ≤ 50 of job IDs | the only place a contact↔job link is stored; the job side is derived |
| interactions | list ≤ 100 of `{id, at, type, note}` | `type`: `email` \| `call` \| `coffee` \| `message` \| `meeting` \| `other`; `note` ≤ 1000; adding one also sets `lastContactedAt` |
| notes | string | ≤ 5000 |
| createdAt, updatedAt | Timestamp | |

### `users/{uid}/notifications/{id}`
`message` (≤ 1000), `type` (`info` | `success` | `warning`), `read` (bool), `createdAt`. Admins create and delete them; the owner may change only `read` and may delete them.

### `users/{uid}/feedRequests/{id}`
`company` (≤ 80), `url` (≤ 500), `status` (`pending` | `added` | `rejected`), `reason`, `feedId`, `duplicate` (bool), `createdAt`, `processedAt`. The owner creates them with `status: pending`, can read and delete them, and cannot update them. The collector answers them.

### `users/{uid}/discover/settings`
`enabled`, `tracks` (`intern` | `newgrad`, ≤ 2), `graduation` (`YYYY-MM` or `""`), `terms {available, partTime}` (≤ 12 each), `needsSponsorship` (bool; the only work-authorization field), `locations {preferred (≤ 50), remoteOk}`, `roleFamilies` (≤ 20), `includeKeywords`, `excludeKeywords` (≤ 50 each), `companies {warm, target, hidden}` (≤ 100 each), `minScore` (40–90), `alerts {webhook, minScore (40–100)}` (Discord webhook or `https://ntfy.sh/<topic>` only), `updatedAt`.

### `users/{uid}/discover/feed` (collector only)
| Field | Notes |
|---|---|
| refreshedAt | Timestamp of the run that wrote it |
| totalMatches | open roles at or above `minScore` |
| cap | 300 (one cap for everyone now that plans are gone) |
| failedSources | count of sources that failed that run |
| cards | list, best score first |

Each card has: `roleKey, company, title, location, url, track, terms, postedAt, firstSeenAt, score, tier (core|strong|ok), reasons, flags {citizen, exportControl, noSponsor, sponsorFriendly, screened}, snippets, gradWindow, closed`.

The cards are:
- the top `cap` open, untriaged roles at or above `minScore` that aren't remembered as dismissed;
- `saved` roles, until 30 days after their posting closes;
- `dismissed` roles, until 30 days after they were dismissed.

Hard limits: 400 cards and 900 KB serialized. When over a limit, the lowest-scoring live cards are dropped first.

The collector writes the feed only when something meaningful changed (card set, a score moving 3 or more points, opened/closed, flags). The last version written is kept in local SQLite.

### `users/{uid}/discover/triage`
`cards: { <roleKey>: { status: saved|dismissed, jobId?: string, at: Timestamp } }`.
- Each client write adds, changes or removes exactly one key, with `at == request.time`.
- Save writes `{status: saved, jobId}`, Dismiss writes `{status: dismissed}`, and Restore deletes the key.
- The collector reads it every run and removes `dismissed` entries older than 180 days with single-field deletes.

### `feeds/{feedId}`
`company, ats, host?, tenant?, site?, token?, region?, origin (config|user), status (ok|failing|checking), earlyCareerCount, lastError, createdAt, updatedAt`. Signed-in users can read them, and admins can delete `origin: user` feeds. The collector writes a feed only when its status, count or error changes.

### `broadcasts/{id}`
`message` (≤ 1000), `type`, `createdBy`, `createdAt`. Signed-in users read them, and admins create and delete them. The app shows the latest 10; read state stays per browser.

### `adminLogs/{id}`
`action, actorUid, actorEmail, target, outcome (success|blocked|error), createdAt`. Admin-only; there are no updates or deletes. The `PLAN_UPGRADE` action is removed.

### `system/discover` and `system/health`
- `discover`: `roleFamilies [{id, label}], inviteOnly, updatedAt`. Signed-in users can read it.
- `health`: `lastRun {at, durationSec, rawPostings, uniqueRoles, usersServed, reads, writes, failedSources}`. Admin read only. The System Vitals latency check reads this doc.

## Account features

- **Email verification.** Email/password sign-ups get a verification email and see a "Check your inbox" screen (resend, "I've verified" reload) until `emailVerified` is true. Google sign-ins are already verified. The rules let a signed-in user create and read their own account doc before verifying (sign-up creates it), but every subcollection under `users/{uid}`, and any update to the account doc, requires `request.auth.token.email_verified == true`.
- **Export my data** (Account page). Downloads one JSON file with the account doc, jobs, contacts, notifications, feed requests and the three Discover docs. Timestamps are written as ISO strings.
- **Delete my account** (Account page, typed confirmation):
  1. Re-authenticate if Firebase requires a recent sign-in.
  2. Delete every doc under `users/{uid}` (subcollections first), then the account doc, then the Firebase Auth user.
  3. Sign out, and show the login page with a confirmation message.

## Security rules

Each section of the rules follows the layout above. Helpers: `signedIn()`, `verified()`, `isAdmin()` (UID list, kept in sync with `VITE_ADMIN_UIDS`) and `isOwner(uid)` (signed in, verified, matching uid). The only exception to `isOwner` is creating and reading one's own account doc, which needs only `signedIn()`.

- **Owners:**
  - read and write only what's described for their own `users/{uid}` subtree;
  - can delete every doc in it (this is what account deletion uses).
- **Admins:**
  - can read every doc under `users/{uid}`;
  - can create, update and delete `jobs` and `contacts` there (impersonation);
  - can create and delete `notifications`;
  - can update `status`.
- **Discover documents:**
  - `discover/settings` and `discover/triage` are owner-write;
  - the owner can delete `discover/feed` but never write it.
- **Admin reads across users:** `match /{path=**}/jobs/{jobId}` allows reads by admins, for the collection-group count and "today by hour".
- **Shape checks:** every client write is validated with `keys().hasOnly`, types, enums, the size limits above, the `history` append rule and the `triage` one-key rule.
- **Everything else is denied.**

## Indexes

There are no composite indexes; the old `notifications` index is removed. Field overrides add collection-group single-field indexes for `feedRequests.status` (ascending) and `jobs.createdAt` (ascending and descending).

## Components

### Website
- **Data module.** A new `src/lib/db.ts` owns every path and Firestore converter. It holds typed refs, enum ↔ label maps, Timestamp ↔ Date conversion, and the `history`/`interviews` helpers. Nothing else builds paths.
- **Callers move to it:**
  - contexts: auth, jobs, network, notifications;
  - pages: Discover, Tune matches, Onboarding, Account, Dashboard, Analytics, Pipeline, Network;
  - components: PipelineCard, StatusBadge, NewApplicationModal, NewContactModal;
  - admin components: UserCommand, SystemVitals, CollectorHealth, BroadcastControl, SecurityPulse;
  - utilities: `utils/export.ts`, `lib/adminLogger.ts`.
- **Round 1 UI changes:**
  - removals (Pro, AI Resume, vault);
  - the "Last contacted" date picker;
  - Location becomes optional;
  - Account gains Export / Delete;
  - the verification screen;
  - an honest System Vitals: real counts and the latency check, with no made-up health % or threat level;
  - a proper 404 page with a link home;
  - the welcome line uses the profile's `firstName`;
  - Analytics reads `appliedAt` / `createdAt`.
- **Bug fixes:**
  - the Dashboard table keys rows by job id, not index;
  - the edit form loads a job once when opened, and doesn't reset when the job list updates.
- **Offerward rename** in the UI, the page title, the privacy policy and the onboarding text. The Firebase project ID and the `traction-37.web.app` URL stay as they are (a custom domain is Round 5).
- **Bundle size:**
  - `exceljs` and `jspdf` load only when exporting;
  - `recharts` loads only on Analytics;
  - each route stays lazy.

### Chrome extension (1.1)
- **Saving:** through Firestore REST `documents:commit` to `users/{uid}/jobs`, with the new fields:
  - `source: extension`, plus `sourceSite` taken from the tab URL;
  - the initial `history` entry;
  - lowercase status codes;
  - `REQUEST_TIME` transforms for `createdAt`, `updatedAt` and, for `applied`, `appliedAt`;
  - `history[0].at` from the device clock, since transforms can't target list items.
- **Popup:** status options become `saved`, `applied` and `interviewing`.
- **Coverage:**
  - host and content-script matches for `*.myworkdayjobs.com`, `*.myworkdaysite.com`, `jobs.ashbyhq.com` and `jobs.smartrecruiters.com`;
  - site parsers prefer the page's JSON-LD `JobPosting` data before falling back to selectors.
- **Rename** to Offerward (manifest name and title, popup, content-script UI), version `1.1`.

### Collector
- **Reads, per user:** `discover/settings` and `discover/triage`.
- **Writes, per user:** `discover/feed`, only when changed, with `cap` 300 for everyone (the plan lookup is removed).
- **Shared data:**
  - pending `feedRequests` are found through a collection-group query;
  - writes go to `feeds`, `system/discover` and `system/health`.
- **Removed:** the `pushes` table and the purge step.
- **New, failure alerts:** an optional `notify.admin_webhook` (Discord or ntfy) in `config.yaml` gets a message when a run fails or any source fails.
- **Renamed** in user-facing text: the User-Agent becomes `OfferwardCollector/1.0 (+<app_url>)`, plus the README and digest titles. Server paths and the unit names (`/opt/traction`, `traction-collector.*`) keep their names so the install guide stays valid.
- **Unchanged:** scoring, screening and sources. `import-profile` writes `discover/settings`.

## Repo and operations

- **Backups:** daily Firestore backups with 14-day retention (`firebase firestore:backups:schedules:create`). Point-in-time recovery stays off (it costs extra).
- **Tests in the repo:**
  - `tests/rules/` holds the emulator rules suite, run with `npm test` there;
  - `Source Code/collector/tests/` holds pytest offline tests, plus an emulator integration test marked `emulator`;
  - the README says how to run both.
- **ESLint:** add the packages `eslint.config.js` imports to `devDependencies` and make `npm run lint` pass.
- **Hosting:** switch `Source Code/website/firebase.json` to plain static hosting (`public: dist`, SPA rewrite to `/index.html`) and drop the frameworks integration.
- **Repo cleanup:**
  - stop tracking `.firebase/` caches and `extension.zip`, and add them to `.gitignore`;
  - rewrite the README for Offerward (features, layout, collector, rules, deploy, tests).
- **Dependabot:** review the 10 open updates. Apply the security ones (Vite, jsPDF, DOMPurify, protobufjs and the rest) on the Round 1 branch; close the obsolete ones.
- **GitHub:** delete the stale `main` branch (18 commits behind `master`).
- **Reset notice:** after relaunch, post a broadcast explaining that Offerward was rebuilt and earlier data was reset. The owner approves the wording before it's sent.

## Later: move to a new Firebase project

Round 1 ships on the current `traction-37` project. Later, when the owner is ready, everything moves to a new project, ideally with ID `offerward` (`offerward.web.app`, `offerward.firebaseapp.com`), so the site, the sign-in screen and auth emails carry the Offerward name. The owner's steps are tracked in `docs/owner-checklist.md`.

Round 1 keeps every project-specific value in configuration so the move is a config swap:
- website `.env.local`;
- extension `config.js` and the manifest `oauth2.client_id`;
- the two `.firebaserc` files;
- `isAdmin` / `VITE_ADMIN_UIDS`;
- the collector's `config.yaml` (`app_url`, `beta_allowlist`, `service_account`).

No code hardcodes a project ID or URL, except the privacy policy's links, which are generated from one constant.

Data created in the meantime moves too:
- **Sign-in accounts:** `firebase auth:export` / `auth:import`, which keeps UIDs (and password hashes, using the old project's hash settings). So every `users/{uid}` path stays valid.
- **Documents:** a one-off Admin SDK script copies every document under the five top-level collections, recursively.

**The owner, in the console:**
- create the project and Firestore (`nam5`);
- enable Google and Email/Password sign-in;
- set the public-facing name and support email;
- set Google Auth Platform branding: name, logo, support email, home page and privacy policy links;
- register a web app;
- create the `collector` service account (Cloud Datastore User) and save its key outside the repo;
- create a "Chrome extension" OAuth client for extension ID `dehhopmefkjjkilnijdhdbcnendbnmfk`;
- enable billing (Blaze), which scheduled backups need.

**Then the repo switches over:**
- `.firebaserc` (root and website);
- the website `.env.local` config;
- the extension `config.js` and `manifest.json` (`oauth2.client_id`);
- `isAdmin` and `VITE_ADMIN_UIDS`, using the owner's new UID once they sign in to the new project;
- the collector's `app_url` and `beta_allowlist`;
- URLs in the privacy policy, README and guides.

**The old project.** After the new site is live, the owner chooses to either:
- **keep it** serving a one-page redirect from `traction-37.web.app` to the new URL, or
- **delete it** (which also removes its 14 old Auth accounts and the old collector key).

Either way, the old local key file is deleted.

## Rollout

The owner commits manually; nothing is deployed without their go-ahead.

1. **Rules and indexes.**
2. **The website** (static hosting).
3. **Extension:** submit `1.1` to the Web Store. No one depends on it yet, so its review time doesn't block anything.
4. **Discover:** `import-profile` for the owner, then one collector run from this machine. The server install follows `Source Code/collector/deploy/PROXMOX-SETUP.md` later.
5. **Operations:** backup schedule, Dependabot, delete `main`, then the reset broadcast.

## Testing

- **Rules (emulator suite):**
  - owner, other user, signed-out, unverified and admin, for every path;
  - every shape check;
  - the `history` append rule (accepted append, rejected rewrite, rejected status change without an append);
  - `triage` one-key writes;
  - account deletion (the owner can delete the whole subtree);
  - an admin collection-group read versus a non-admin one.
- **Collector (pytest offline and emulator):**
  - feed contents, the 300 cap, the 400-card and 900 KB limits;
  - dismissed memory across runs, saved cards kept after a posting closes;
  - feed requests through the collection group;
  - no write when nothing changed;
  - `system/*` docs;
  - the admin failure webhook.
  - Plus a live dry run.
- **Website and extension:**
  - `npm run lint`, `tsc -b`, `vite build`;
  - an extension REST `commit` against the emulator, accepted by the rules;
  - a manual walkthrough on the live site: sign-up with email verification, onboarding, pipeline add/edit/move (with history recorded), network with the date picker, Discover save/dismiss/restore/hide, Tune matches, export, delete account, admin counts/search/impersonation/broadcast, notifications, 404.

## Out of scope for Round 1

- **Rounds 2–5 screens.** Round 1 only stores and validates their fields.
- **The parked features** (see `docs/backlog.md`).
- **Changing the Firebase project ID or GitHub repo name.**
- **App Check** (Round 5, with its token server).
