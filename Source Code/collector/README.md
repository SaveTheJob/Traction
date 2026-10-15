# Offerward collector

Finds early-career roles, reads each posting for work-authorization requirements,
scores them against every Offerward user's Discover settings, and writes the good ones
to their **Discover** page. One run serves everyone. Runs twice a day on a small
Linux box (a Proxmox LXC works well) or as a Cloud Run Job.

## What it does each run

1. **Loads settings**: every `users/{uid}/discover/settings` doc with `enabled: true` (set from
   Discover > Tune matches), limited to `traction.beta_allowlist` when that's non-empty
2. **Adds company feeds** users requested by pasting a careers-page URL
   (`users/{uid}/feedRequests`), after checking the host is a known job board and the feed
   returns postings
3. **Gathers** postings once for everyone from
   - community lists: SimplifyJobs (Summer 2027 internships, new grad), vanshb03, speedyapply
   - direct company feeds: the `watchlist` in config plus user-added `feeds`
     (Workday, Greenhouse, Lever, Ashby, SmartRecruiters)
4. **Filters** to US locations and dedupes the same role across sources
   (prefers the company's own link over an aggregator's)
5. **Screens** roles that could make anyone's cut by reading the job description for:
   - U.S. citizenship, security clearance, or "U.S. person" requirements
   - export-control / ITAR language
   - "no sponsorship" and sponsor-friendly language
   - the required graduation window
6. **Scores** 0 to 100 per user, with reasons: role fit (the role families they picked),
   timing vs. their terms and graduation, preferred locations, companies (warm, target,
   cap-exempt), recency. Sponsorship penalties, the defense-contractor penalty and the
   cap-exempt bonus apply only to users who said they need sponsorship; for everyone else
   those flags are informational
7. **Writes** one `users/{uid}/discover/feed` doc per user: their top 300 open, untriaged
   roles at or above their minimum score, plus the roles they saved (until 30 days after the
   posting closes) and dismissed (for 30 days). Saved/dismissed marks come from
   `users/{uid}/discover/triage`, which only the user writes; dismissals older than 180 days
   are removed from it. The feed is rewritten only when something meaningful changed (card
   set, a score moving 3+ points, opened/closed, flags); the last version is kept in `state.db`.
   A feed never exceeds 400 cards or 900 KB
8. **Notifies** (optional, per user) via Discord webhook or ntfy.sh topic with new roles at
   or above their alert score, plus applied jobs due a follow-up
9. **Reports** to `system/health` for the admin portal and `<report_dir>/latest.md` on the
   server. When `notify.admin_webhook` is set, a failed run or source also pings the admin

Screening is a heuristic. A role without red flags is not a guarantee: always read
the posting before applying.

## Commands

```bash
C=/etc/traction-collector/config.yaml
python -m collector --config $C selftest                 # every source and config feed reachable?
python -m collector --config $C run --dry-run            # full run for Firestore settings, no writes
python -m collector --config $C run                      # real run
python -m collector --config $C run --dry-run --profile profiles/example-embedded-intern.yaml
                                                         # score for a local profile, no Firestore at all
python -m collector --config $C top --uid <uid> --track intern -n 20   # best roles from local state
python -m collector --config $C import-profile --uid <uid> --from profiles/example-embedded-intern.yaml
                                                         # write a YAML profile to users/<uid>/discover/settings
```

`import-profile --print` shows the document without writing it. It accepts the original
single-user `profile:` block or a document in the Firestore shape.

## Deploy on Proxmox

On the Proxmox host (template names change; check `pveam available | grep debian-12`):

```bash
pveam update
pveam download local debian-12-standard_12.7-1_amd64.tar.zst
pct create 210 local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
  --hostname traction-collector --memory 512 --cores 1 --rootfs local-lvm:4 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp --unprivileged 1 --features nesting=1 --onboot 1
pct start 210
pct exec 210 -- bash -c "apt-get update -qq && apt-get install -y -qq curl"
pct exec 210 -- bash -c "curl -fsSL https://raw.githubusercontent.com/SaveTheJob/Traction/master/Source%20Code/collector/deploy/install-lxc.sh | bash"
```

Then, from the host:

```bash
pct push 210 ./service-account.json /etc/traction-collector/service-account.json
pct exec 210 -- chown root:traction /etc/traction-collector/service-account.json
pct exec 210 -- chmod 640 /etc/traction-collector/service-account.json
pct exec 210 -- nano /etc/traction-collector/config.yaml     # set traction.beta_allowlist
```

Use a dedicated service account that can only reach Firestore. The key the Firebase
console generates (Project settings > Service accounts) belongs to the Admin SDK account,
which can also manage Auth users, Storage and the rest of the project; if this box were
ever compromised, that key would expose all of it. Instead, in Google Cloud console for
the same project:

1. IAM & Admin > Service accounts > Create service account, e.g. `traction-collector`
2. Grant it one role: **Cloud Datastore User**
3. Open it > Keys > Add key > Create new key > JSON

Treat the key like a password: never commit it.

The timer runs at 6:40 and 14:40 Phoenix time regardless of the server's own time zone.

### Updating

The service never pulls code on its own: it runs whatever is checked out in `/opt/traction`,
which is owned by root and read-only to the service user. To deploy new code, run as root
inside the container:

```bash
bash /opt/traction-collector/deploy/install-lxc.sh
```

It lists the incoming commits and asks before fast-forwarding, then reinstalls requirements
and units. Config and state are never touched.

## Run as a Cloud Run Job

The `Dockerfile` runs the same code. On Cloud Run, skip the key file entirely: run the job
as the `traction-collector` service account above and set `traction.service_account: ""`
so it uses the job's own identity. State (`state.db`) must persist between runs, or every
run re-screens everything and rewrites every feed, so mount a Cloud Storage bucket there and keep
one task at a time (SQLite on a bucket mount has no locking).

```bash
REGION=us-west1 PROJECT=traction-37 SA=traction-collector@traction-37.iam.gserviceaccount.com
gcloud storage buckets create gs://traction-collector-state --location=$REGION
gcloud secrets create collector-config --data-file=config.yaml
gcloud builds submit "Source Code/collector" --tag $REGION-docker.pkg.dev/$PROJECT/collector/traction-collector
gcloud run jobs create traction-collector --region=$REGION --service-account=$SA \
  --image=$REGION-docker.pkg.dev/$PROJECT/collector/traction-collector \
  --set-secrets=/etc/traction-collector/config.yaml=collector-config:latest \
  --add-volume=name=state,type=cloud-storage,bucket=traction-collector-state \
  --add-volume-mount=volume=state,mount-path=/var/lib/traction-collector \
  --parallelism=1 --max-retries=0 --task-timeout=30m
gcloud scheduler jobs create http traction-collector --location=$REGION \
  --schedule="40 6,14 * * *" --time-zone=America/Phoenix --http-method=POST \
  --uri="https://run.googleapis.com/v2/projects/$PROJECT/locations/$REGION/jobs/traction-collector:run" \
  --oauth-service-account-email=$SA
```

The job's service account also needs `roles/storage.objectUser` on the bucket and
`roles/secretmanager.secretAccessor` on the secret; the scheduler's needs `roles/run.invoker`.

## Firestore

| Path | Collector |
|---|---|
| `users/{uid}/discover/settings` | reads (collection-group query on `discover`, `enabled == true`) |
| `users/{uid}/discover/triage` | reads; deletes dismissals older than 180 days, one field at a time |
| `users/{uid}/discover/feed` | writes (the whole doc: `refreshedAt`, `totalMatches`, `cap`, `failedSources`, `cards`) |
| `users/{uid}/feedRequests/{id}` | reads pending ones (collection-group query); writes `status`, `reason`, `feedId`, `duplicate`, `processedAt` |
| `users/{uid}/jobs` | reads applied jobs for follow-up nudges (users with a webhook only) |
| `feeds/{feedId}` | writes config mirrors, user-added feeds, and `status`/`earlyCareerCount`/`lastError` when they change |
| `system/discover` | writes role-family labels and `inviteOnly` when they change |
| `system/health` | writes `lastRun` every run |

Rules for these live in the repo's `firestore.rules`. The Admin SDK ignores rules, so client
access is all they govern. No composite indexes are needed: the collection-group queries
use single-field overrides in `firestore.indexes.json`, and the follow-up query filters on
`status` only. Each run logs its Firestore reads and writes and warns above
`settings.write_warn` (the free tier allows 20k writes a day).

## Tests

```bash
.venv/bin/pip install -r requirements.txt -r requirements-dev.txt
.venv/bin/python -m pytest -q                 # offline: scoring, profiles, feed parsing, feed building
```

The emulator test runs two full collector runs against the Firestore emulator (project
`demo-offerward`, never the live one). From the repo's `tests/rules/` directory:

```bash
firebase emulators:start --only firestore --project demo-offerward     # leave running
FIRESTORE_EMULATOR_HOST=127.0.0.1:8086 .venv/bin/python -m pytest -m emulator -q   # from here
```
## Tuning

Infrastructure and shared lists live in `config.yaml`; what each user wants lives in their
profile, edited from the app.

- `role_families`: id, label and `core`/`strong`/`ok` title lists for each family users can
  pick. A title scores from the best match across the families a user picked; `@id` pulls in
  another family's core list. Labels show up in the app via `system/discover`.
- `avoid`: titles excluded unless they match a core term (terms in a picked family don't count)
- `companies.cap_exempt` / `companies.defense`: shared lists, used only for users who need sponsorship
- `notify.admin_webhook`: optional Discord webhook or `https://ntfy.sh/<topic>` told when a run
  or a source fails

User keywords and company names are matched as literal text (escaped), never as regex.

### Adding a company feed

Users can paste a careers-page URL from Discover > Tune matches. To add one for everyone,
find a real posting URL and add a `watchlist` entry:

| Posting URL looks like | Watchlist entry |
|---|---|
| `https://nxp.wd3.myworkdayjobs.com/en-US/careers/job/...` | `{company: NXP, ats: workday, host: nxp.wd3.myworkdayjobs.com, tenant: nxp, site: careers}` |
| `https://wd5.myworkdaysite.com/recruiting/microchiphr/External/job/...` | `{company: Microchip, ats: workday, host: wd5.myworkdaysite.com, tenant: microchiphr, site: External}` |
| `https://job-boards.greenhouse.io/axon/jobs/123` | `{company: Axon, ats: greenhouse, token: axon}` |
| `https://jobs.lever.co/zoox/<uuid>` | `{company: Zoox, ats: lever, token: zoox}` |
| `https://jobs.eu.lever.co/cirrus/<uuid>` | `{company: Cirrus Logic, ats: lever, token: cirrus, region: eu}` |
| `https://jobs.ashbyhq.com/<org>/<uuid>` | `{company: ..., ats: ashby, token: <org>}` |
| `https://jobs.smartrecruiters.com/BoschGroup/<id>` | `{company: Bosch, ats: smartrecruiters, token: BoschGroup}` |

Run `selftest` after editing.

## Crawling politely

Requests identify as `OfferwardCollector/1.0 (+<app_url>)`, retry with backoff on 429/5xx
(honoring `Retry-After`), and job descriptions are cached for `screen.recheck_days`.
Posting pages from third-party lists are fetched only when they resolve to public
addresses, re-checked on every redirect. User-supplied URLs are never fetched directly.

## Credits

Community lists by [SimplifyJobs](https://github.com/SimplifyJobs),
[vanshb03](https://github.com/vanshb03/Summer2027-Internships) and
[speedyapply](https://github.com/speedyapply/2027-SWE-College-Jobs). Each card links to
the original posting.
