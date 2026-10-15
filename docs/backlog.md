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
