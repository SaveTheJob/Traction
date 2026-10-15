# Offerward: owner checklist

Things only you can do: they happen in consoles, accounts and machines outside this repo.
Tick them off as you go. Items marked **send to Claude** need a value passed back so the
repo can be updated.

## Now

- [ ] Commit Round 1 on the `round-1` branch, using the commands Claude gives you
- [ ] Then the Ship steps, each with your go-ahead: deploy rules and indexes, deploy the website, the first Discover run, backups, the extension upload, GitHub cleanup, and the reset notice (the list is in the Round 1 plan's "Ship" section: `docs/superpowers/plans/2026-10-14-offerward-round-1.md`)

## During Round 1

- [ ] Approve the wording of the reset notice broadcast to existing users (earlier data was wiped on 2026-10-14)
- [ ] Give the go-ahead for each deploy (rules, website, collector run)
- [ ] Submit extension 1.1 in the **Chrome Web Store developer dashboard**, with the listing changes under "Chrome Web Store" below

## Rename to Offerward (outside the repo)

The repo itself is renamed in Round 1. These live elsewhere.

### GitHub
- [ ] Rename the repository `SaveTheJob/Traction` → `Offerward` (Settings → General → Repository name). GitHub redirects old URLs, but **send to Claude** the new name so the install script, README and Proxmox guide use it.
- [ ] Optionally rename the `SaveTheJob` organization (**send to Claude** if you do)
- [ ] Update the repository description, website link, topics and social preview image
- [ ] Update your local clone's remote afterwards: `git remote set-url origin git@github.com:<org>/<repo>.git`

### Chrome Web Store (developer dashboard)
- [ ] Item name: Offerward
- [ ] Short and detailed descriptions (mention: save jobs from any careers page, sync to your Offerward pipeline)
- [ ] Icon, screenshots (1280×800) and promo tiles with the new name
- [ ] **Privacy practices** tab: the single purpose, the permissions justification (activeTab, scripting, storage, identity, host access to job sites), the data-use disclosures (account email, the job details you choose to save), and the privacy policy URL (`https://<site>/privacy-policy`)
- [ ] Support URL / email
- [ ] Publisher (developer) display name, if it still says SaveTheJob

### Google sign-in branding (Google Cloud console → Google Auth Platform → Branding)
- [ ] App name: Offerward
- [ ] App logo, user support email, developer contact email
- [ ] Home page, privacy policy and terms links (`https://<site>/`, `https://<site>/privacy-policy`)
- [ ] Authorized domains include the site's domain

This is what people see on every "Sign in with Google" screen, on the website and in the extension.

### Firebase console (current project, until the move)
- [ ] Project settings → Public-facing name: Offerward; support email
- [ ] Authentication → Templates: check the sender name and subject of the verification, password-reset and email-change emails
- [ ] Google Analytics (if linked): rename the property and data stream

### Optional
- [ ] A domain such as `offerward.com` and a `contact@` mailbox (the privacy policy currently lists `contact@yugthapar.com`). A custom domain also makes Google sign-in show your domain instead of `*.firebaseapp.com`.
- [ ] A new logo. The current logo and icons have no text in them, so they work as they are.
- [ ] Rename the local project folder `SaveTheJob` (this starts a fresh Claude Code project memory for it)

## Later: move to a new Firebase project

Do this whenever you're ready. Round 1 keeps all project settings in config files, so the
switch is a config change plus a data copy that Claude scripts. Doing it before Round 1
launches means there's nothing to copy.

The extension's project values (`projectId`, `apiKey`, `appUrl`) are in `Source Code/extension/config.js`.

### Create it (Firebase console)
- [ ] Create project. **Project ID: try `offerward`** (permanent; gives `offerward.web.app`)
- [ ] Firestore → create database, **location `nam5 (United States)`** (permanent)
- [ ] Authentication → enable **Google** and **Email/Password**
- [ ] Project settings → Public-facing name "Offerward", support email
- [ ] Google Auth Platform → Branding (same items as above, for the new project)
- [ ] Upgrade to **Blaze** (pay-as-you-go) for scheduled backups; set a budget alert (for example $5)
- [ ] Project settings → add a **Web app**; **send to Claude** the config block (it's public)
- [ ] Google Cloud → APIs & Services → Credentials → OAuth client ID, type **Chrome extension**, item ID `dehhopmefkjjkilnijdhdbcnendbnmfk`; **send to Claude** the client ID
- [ ] IAM & Admin → Service accounts → create `collector` with role **Cloud Datastore User** → Keys → JSON. Save it as `~/.config/offerward/service-account.json`, **never in the repo**

### Then, with Claude
- [ ] Claude switches the configs, deploys rules and site to the new project, and copies sign-in accounts (UIDs kept) and data across
- [ ] Sign in on the new site and confirm your data is there; **send to Claude** your UID if it changed
- [ ] Update the server's key and `config.yaml` (see `Source Code/collector/deploy/PROXMOX-SETUP.md`, step 3)
- [ ] Update the Web Store listing's privacy policy URL and the Google Auth branding links to the new site

### Retire the old project (`traction-37`)
- [ ] Choose one: keep it serving a redirect page to the new site (Claude can deploy it), **or** delete the project
- [ ] Delete the old collector key in the old project's console, and on your computer: `rm ~/.config/traction/service-account.json`

## Server

- [ ] Install the collector on Proxmox: `Source Code/collector/deploy/PROXMOX-SETUP.md`. Do this **after Round 1 ships**, because Round 1 changes what the collector writes.
- [ ] After two weeks of clean runs, consider opening Discover to everyone (`beta_allowlist: []` in the server's `config.yaml`)

## Before opening Discover to everyone

- [ ] Ask SimplifyJobs and speedyapply for permission to use their lists (their repositories have no license; vanshb03's is MIT)

## Parked features

Pro plan, AI Resume and the document vault are recorded in `docs/backlog.md` (created in Round 1), along with what each needs to come back.
