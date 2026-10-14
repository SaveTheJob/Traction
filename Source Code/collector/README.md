# Traction collector

Finds early-career roles, reads each posting for work-authorization requirements,
scores them against an applicant profile, and pushes the good ones into Traction's
**Discover** page. Runs twice a day on a small Linux box (a Proxmox LXC works well).

## What it does each run

1. **Gathers** postings from
   - community lists: SimplifyJobs (Summer 2027 internships, new grad), vanshb03, speedyapply
   - direct company feeds in `watchlist` (Workday, Greenhouse, Lever, Ashby, SmartRecruiters),
     which catch roles hours before the lists and roles the lists miss
2. **Filters** to US locations and dedupes the same role across sources
   (prefers the company's own link over an aggregator's)
3. **Screens** promising roles by reading the job description for:
   - U.S. citizenship, security clearance, or "U.S. person" requirements (hidden by default)
   - export-control / ITAR language (flagged)
   - "no sponsorship" language (flagged; small penalty for internships, large for full-time)
   - sponsor-friendly language (OPT/CPT/F-1 welcome)
   - the required graduation window
4. **Scores** 0 to 100 with reasons: role fit, timing vs. your plan, location, company
   (warm leads, targets, cap-exempt employers), recency, minus sponsorship/defense penalties
5. **Stores** everything in SQLite, marks roles closed when their source stops listing them
6. **Pushes** roles at or above `min_score` to Firestore `discoveries`, never touching the
   user-owned `status`/`jobId` fields, and writes a run summary to `collectorRuns/{uid}`
7. **Notifies** (optional) via Discord webhook or ntfy with new roles at or above
   `notify_min_score`, plus "Applied" jobs due a follow-up

Screening is a heuristic. A role without red flags is not a guarantee: always read
the posting before applying.

## Commands

```bash
python -m collector --config /etc/traction-collector/config.yaml selftest   # every source reachable?
python -m collector --config ... run --dry-run      # full run, no Firestore writes or digest
python -m collector --config ... run                # real run
python -m collector --config ... top --track intern -n 20   # best roles from local state
```

Every run writes a readable report to `<report_dir>/latest.md`.

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
pct exec 210 -- nano /etc/traction-collector/config.yaml     # set traction.user_id
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

### Updating

The service never pulls code on its own: it runs whatever is checked out in `/opt/traction`,
which is owned by root and read-only to the service user. To deploy new code, run as root
inside the container:

```bash
bash /opt/traction-collector/deploy/install-lxc.sh
```

It lists the incoming commits and asks before fast-forwarding, then reinstalls requirements
and units. Config and state are never touched.

The timer runs at 6:40 and 14:40 Phoenix time regardless of the server's own time zone.

## Firestore

- Merge `firestore.rules.snippet` into the project rules.
- No composite indexes needed: the web app queries `discoveries` by `userId` only.
- Writes per day are small (new roles plus score changes), well inside the free tier.

## Tuning

Everything lives in `config.yaml`:

- `profile.roles.core/strong/ok/avoid`: what counts as a good title
- `profile.companies.warm/target/cap_exempt/defense`
- `profile.internship_terms`, `unavailable_terms`, `grad_window_ok/bad`, `newgrad_open_from`
- `settings.min_score` (what reaches Traction) and `notify_min_score` (what pings you)

### Adding a company feed

Find a real posting URL for the company and read the ATS from it:

| Posting URL looks like | Watchlist entry |
|---|---|
| `https://nxp.wd3.myworkdayjobs.com/en-US/careers/job/...` | `{company: NXP, ats: workday, host: nxp.wd3.myworkdayjobs.com, tenant: nxp, site: careers}` |
| `https://wd5.myworkdaysite.com/recruiting/microchiphr/External/job/...` | `{company: Microchip, ats: workday, host: wd5.myworkdaysite.com, tenant: microchiphr, site: External}` |
| `https://job-boards.greenhouse.io/axon/jobs/123` | `{company: Axon, ats: greenhouse, token: axon}` |
| `https://jobs.lever.co/zoox/<uuid>` | `{company: Zoox, ats: lever, token: zoox}` |
| `https://jobs.ashbyhq.com/<org>/<uuid>` | `{company: ..., ats: ashby, token: <org>}` |
| `https://jobs.smartrecruiters.com/BoschGroup/<id>` | `{company: Bosch, ats: smartrecruiters, token: BoschGroup}` |

Run `selftest` after editing.
