# Offerward

Offerward is a job-search workspace for early-career candidates. A Chrome extension saves postings from careers pages into your account, a React dashboard tracks them through a pipeline alongside your network and analytics, and a collector service finds and scores matching roles for your Discover page. Everything is stored in Firebase (Auth, Firestore, Hosting) and protected by Firestore security rules.

## Features

- **Pipeline:** a drag-and-drop board of your applications. Each status change is recorded, and applications waiting on a reply get follow-up reminders. Interview tracking is coming.
- **Network:** your contacts, with how warm each one is and when you last spoke. Logging individual interactions is coming.
- **Analytics:** charts of your search progress.
- **Discover:** roles found by the collector, scored against your own settings (Tune matches), with a cap of 300 cards. You can save or dismiss each one.
- **Extension:** saves the job you are viewing to your pipeline in one click, signed in with your Google account. It runs on these sites (from `manifest.json`): LinkedIn, Indeed, Glassdoor, Monster, ZipRecruiter, Handshake (handshake.com, joinhandshake.com), Workday (workday.com, myworkdayjobs.com, myworkdaysite.com), Greenhouse, Lever (including jobs.eu.lever.co), BambooHR, Ashby, SmartRecruiters and iCIMS.

## Repository layout

| Path | What is in it |
| --- | --- |
| `Source Code/website` | React 19 + TypeScript + Vite + Tailwind dashboard |
| `Source Code/extension` | Manifest V3 Chrome extension |
| `Source Code/collector` | Python job collector for Discover (see its README) |
| `firestore.rules`, `firestore.indexes.json`, `firebase.json` | Firestore rules, indexes and Firebase config |
| `tests/` | Rules tests (`tests/rules`) and the extension commit test (`tests/extension`) |
| `docs/` | Roadmap, backlog, owner checklist, specs and plans |

## Getting started

Needs Node.js. For the tests you also need the Firebase CLI and Java (for the Firestore emulator), and Python 3 for the collector.

```bash
cd "Source Code/website"
npm ci
```

Create `Source Code/website/.env.local` with your Firebase web config and site settings:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_ADMIN_UIDS=      # comma-separated Firebase Auth UIDs allowed into the admin portal
VITE_APP_URL=         # the site's public URL
VITE_CONTACT_EMAIL=   # shown in the privacy policy
```

Then start the dev server:

```bash
npm run dev
```

To try the extension, open `chrome://extensions/`, turn on Developer mode, choose **Load unpacked** and select `Source Code/extension`.

## Tests

Website (from `Source Code/website`):

```bash
npm run lint
npm test
npx tsc -b
```

Firestore rules (from `tests/rules`; runs against the emulator with project `demo-offerward`, never a live project):

```bash
npm ci   # first time only
npm test
```

Extension commit test, which checks that what the extension writes is accepted by the rules. From `tests/rules`, with the emulator running (`firebase emulators:start --only firestore --project demo-offerward`):

```bash
node --test ../extension/commit.test.mjs
```

Collector (from `Source Code/collector`, with the virtualenv set up by `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt -r requirements-dev.txt`):

```bash
.venv/bin/python -m pytest -q                  # unit tests
.venv/bin/python -m pytest -m emulator -q      # needs the emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8086
```

## Deploy

Deploys go to the live Firebase project, so only run them on purpose.

- **Rules and indexes**, from the repo root: `firebase deploy --only firestore`
- **Website**, from `Source Code/website`: `npm run build && firebase deploy --only hosting`
- **Extension:** zip the contents of `Source Code/extension` into `dist/offerward-extension-<version>.zip` (the zip root holds `manifest.json`) and upload it in the Chrome Web Store developer dashboard.
- **Collector:** follow `Source Code/collector/deploy/PROXMOX-SETUP.md`.

## Data model

The Firestore structure, field names and limits are defined in [`docs/superpowers/specs/2026-10-14-firestore-restructure-design.md`](docs/superpowers/specs/2026-10-14-firestore-restructure-design.md).

## Roadmap

See [`docs/roadmap.md`](docs/roadmap.md). Parked features are in [`docs/backlog.md`](docs/backlog.md), and things only the owner can do are in [`docs/owner-checklist.md`](docs/owner-checklist.md).

## Admins

Admins are listed by Firebase Auth UID in `isAdmin` in `firestore.rules` and in `VITE_ADMIN_UIDS` in `Source Code/website/.env.local`. Keep the two in sync: the rules decide what an admin can do, and the env var only decides who sees the admin screens.

## Security

The Firebase web config is public by design, so `firestore.rules` is the security boundary: every user can only reach their own `users/{uid}` data. Never commit service-account keys or other secrets (the collector's key lives outside the repo, for example in `~/.config/traction/`).
