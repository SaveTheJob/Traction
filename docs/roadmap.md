# Offerward roadmap

Each round gets its own spec (`docs/superpowers/specs/`), implementation plan
(`docs/superpowers/plans/`) and review before work starts. Round 1 already designs and
validates every stored field the later rounds use, so Rounds 2–4 add screens and logic,
not data migrations. Field names below refer to the Round 1 spec
(`specs/2026-10-14-firestore-restructure-design.md`).

## Round 1: foundation (built and merged 2026-10-15)

- **Data restructure:** Firestore moves to a `users/{uid}` tree, Discover to a single feed doc per user, plus consistent names and formats.
- **Removals:** Pro, AI Resume and the document vault, parked in `docs/backlog.md`.
- **Account:** export my data, delete my account, email verification.
- **Fixes:** the bug list, and an honest System Vitals.
- **Rename:** Offerward across the site, extension and collector.
- **Operations:** backups, tests in the repo, ESLint, static hosting, repo cleanup, Dependabot.
- **Extension 1.1:** new paths, the rename, Workday, Ashby and SmartRecruiters coverage, JSON-LD parsing.

## Round 2: pipeline and Today

**Goal:** the home page tells you what to do today, and every job has one place that holds everything about it.

- **Today page** (replaces the Dashboard):
  - follow-ups due: `appliedAt` 7+ days ago and no `followedUpAt`;
  - upcoming interviews (`interviews[].at`) and deadlines (`deadlineAt`) for the next 14 days;
  - new Discover matches since your last visit;
  - recent activity (the latest `history` entries across jobs);
  - quick actions.
- **Pipeline Board / List toggle.** The Dashboard's table becomes the List view, with sorting, filters, bulk status change and bulk delete.
- **Job detail panel** (opens from a card or row):
  - edit every field, including `salary`, `deadlineAt` and `description`;
  - a status timeline from `history`;
  - an interviews section (add, edit and remove rounds);
  - linked contacts (from contacts' `jobIds`);
  - the posting link, and the Discover score if the job came from Discover.
- **Calendar export:** "Add to Google Calendar" link and `.ics` download for each interview and deadline.
- **Duplicate warning** when adding a job with the same company and title (case-insensitive) as an existing one, with "open existing" or "add anyway".
- **Source.** `source` and `sourceSite` show on cards and filter the List view.

**Carried over from Round 1** (found in review, deferred):
- **Sign-in:** a one-time bounce through `/login` right after an in-app sign-in. Fix: a `resolving` flag that ProtectedRoute and PublicRoute treat as loading.
- **Verification while offline:** if the token refresh fails at the verification landing, the data listeners start with the old token until a reload. Fix: leave `emailVerified` false when the refresh fails.
- **Delete account:** accounts with both password and Google sign-in must confirm with the password. Offer the Google pop-up too.
- **Discover wording:** "Last refreshed" and "N sources failed" reflect the last feed *change*, not the last run. Publish `lastRunAt` in `system/discover`, or reword it to "Matches last changed".
- **Collector:**
  - purge `discover/triage` for users it no longer serves (the privacy policy promises deletion after 180 days);
  - wrap the unserved-feed delete loop's auto-flush in the try;
  - `resolve_feed_request` and `feed_status` use `set(merge=True)`, which can recreate a doc deleted mid-run.
- **Small fixes:**
  - history is capped at 50 by the rules: show a clear message on the 51st move;
  - Dashboard bulk delete should await its deletes;
  - ConversionFunnel double-counts saved jobs;
  - SystemVitals should use `Promise.allSettled`.
- **Tests:** update-path rules tests (unknown key, empty company, over-length text); a test for the extension's JSON-LD parser; `deleteAccountData` chunking.

## Round 3: network and insights

**Goal:** keep relationships warm and see what's actually working.

- **Contacts ↔ jobs:** link contacts to jobs from either side (`jobIds`); "referred by" shows on the job.
- **Interaction log** per contact (`interactions`: email, call, coffee, message, meeting); adding one updates `lastContactedAt`.
- **Check-ins.** `checkInEveryDays` per contact; overdue contacts appear on Today.
- **LinkedIn link** per contact (`linkedinUrl`).
- **Real analytics,** computed from `history`:
  - response rate (applied → any later stage);
  - interview rate and offer rate;
  - median days to first response;
  - breakdowns by `source`, `sourceSite` and month;
  - a funnel that counts every stage a job reached, not just its current status.
- **Weekly goal and streak.** `goals.weeklyApplications` on the account; Today shows this week's progress and the streak of weeks the goal was met.

## Round 4: extension 1.2

**Goal:** make the extension the fastest, safest way to act on a posting.

- **Visa check on any posting.** Port the collector's screening rules (citizenship / clearance / U.S. person, export control, no sponsorship, sponsor-friendly, graduation window) to the extension. Show a badge with the matching sentence. It's on by default for users whose Discover settings say they need sponsorship; others can turn it on.
- **Capture details:** save the description text (`description`), pay (`salary`) and deadline (`deadlineAt`) when they're on the page, preferring JSON-LD `JobPosting` fields.
- **Already saved:** recognize a posting you already saved (same URL, or company + title) and offer one-click status changes ("Mark applied") instead of a duplicate.
- **Discover score:** if the posting is in your Discover feed, show its score and reasons.

## Round 5: public face

**Goal:** people can find, understand and install Offerward.

- **Landing page** at `/`: what Offerward does, screenshots, a Chrome Web Store button, sign in / sign up. The app moves to `/app` or stays at `/` for signed-in users.
- **SEO and link previews:** titles, description, Open Graph and Twitter tags, `robots.txt`, sitemap.
- **Installable app (PWA):** manifest, icons, offline shell, a mobile bottom navigation.
- **Custom domain** (if bought), so Google sign-in shows the Offerward domain.
- **App Check:** reCAPTCHA Enterprise for the website, plus a small token endpoint (custom provider) so the extension keeps working, then enforcement on Firestore.

## Later / parked

See `docs/backlog.md`: Pro plan and payments, AI Resume, document vault. Also the move to a new Firebase project (`docs/owner-checklist.md`).
