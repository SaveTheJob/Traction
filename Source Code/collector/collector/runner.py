"""One collector run: gather, filter, dedupe, screen once, then score, store,
write each user's Discover feed and notify."""

from __future__ import annotations

import json
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

from . import sources as S
from .feed import CAP, build_cards, compact, expired_dismissals, needs_write, parse_triage
from .feeds import feed_id, process_requests
from .models import Posting, Screen
from .notify import send_digest
from .profile import Profile
from .score import Scorer
from .screen import screen_posting
from .store import Store
from .util import SESSION, days_ago, is_us_location, now_ts

log = logging.getLogger("collector")

ATS_PREFIXES = ("workday:", "greenhouse:", "lever:", "ashby:", "smartrecruiters:")
# The run summary fields written to system/health's lastRun (plus `at`)
HEALTH_KEYS = ("durationSec", "rawPostings", "uniqueRoles", "usersServed", "reads", "writes", "failedSources")


def source_label(entry: dict) -> str:
    """Must match the `source` the ATS functions in sources.py stamp on postings."""
    if entry["ats"] == "workday":
        return f"workday:{entry['tenant']}/{entry['site']}"
    return f"{entry['ats']}:{entry.get('token')}"


def gather(cfg: dict, watchlist: list[dict]) -> tuple[list[Posting], set[str], dict[str, str], dict[str, int]]:
    postings: list[Posting] = []
    ok: set[str] = set()
    errors: dict[str, str] = {}
    counts: dict[str, int] = {}

    for src in cfg["sources"]:
        label = src["label"]
        try:
            if src["type"] == "simplify":
                got = S.simplify(src["url"], label, src["track"])
            elif src["type"] == "markdown":
                got = S.markdown_table(src["url"], label, src["track"])
            else:
                raise ValueError(f"unknown source type {src['type']}")
            postings += got
            ok.add(label)
            log.info("%-26s %5d postings", label, len(got))
        except Exception as e:
            errors[label] = str(e)[:300]
            log.warning("%-26s FAILED: %s", label, e)

    queries = cfg["settings"]["workday_queries"]
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(S.fetch_watchlist_entry, e, queries): e for e in watchlist}
        for fut in as_completed(futs):
            label = source_label(futs[fut])
            try:
                got = fut.result()
                postings += got
                ok.add(label)
                counts[label] = len(got)
                log.info("%-26s %5d early-career postings", label, len(got))
            except Exception as ex_:
                errors[label] = str(ex_)[:300]
                log.warning("%-26s FAILED: %s", label, ex_)
    return postings, ok, errors, counts


def filter_and_merge(postings: list[Posting]) -> list[Posting]:
    merged: dict[str, Posting] = {}
    for p in postings:
        us = is_us_location(p.location)
        if us is False:
            continue
        if us is None and not p.source.startswith(ATS_PREFIXES):
            continue
        if not p.url.startswith("http"):
            continue
        k = p.key
        if k not in merged:
            merged[k] = p
            continue
        m = merged[k]
        for s in p.sources:
            if s not in m.sources:
                m.sources.append(s)
        m.hints |= p.hints
        m.terms = sorted(set(m.terms) | set(p.terms))
        if p.posted_ts and (not m.posted_ts or p.posted_ts < m.posted_ts):
            m.posted_ts = p.posted_ts
        if p.description and not m.description:
            m.description = p.description
        if p.category and not m.category:
            m.category = p.category
        if p.degrees and not m.degrees:
            m.degrees = p.degrees
        # Prefer a direct company ATS link over an aggregator redirect
        if p.source.startswith(ATS_PREFIXES) and not m.source.startswith(ATS_PREFIXES):
            m.url, m.source = p.url, p.source
        if us and m.location != p.location and p.location not in m.location:
            m.location = "; ".join(x for x in (m.location, p.location) if x)[:300]
    return list(merged.values())


def build_watchlist(cfg: dict, fs_feeds: dict[str, dict]) -> tuple[list[dict], dict[str, str]]:
    """Config watchlist plus user-added feeds, deduped. Returns (entries, label -> feed id)."""
    entries: dict[str, dict] = {}
    for e in cfg["watchlist"]:
        entries.setdefault(feed_id(e), e)
    for fid, d in fs_feeds.items():
        if d.get("origin") == "config" or fid in entries:
            continue
        if d.get("ats") == "workday" and all(d.get(k) for k in ("host", "tenant", "site")):
            entries[fid] = {k: d[k] for k in ("company", "ats", "host", "tenant", "site")}
        elif d.get("ats") in ("greenhouse", "lever", "ashby", "smartrecruiters") and d.get("token"):
            entries[fid] = {k: d[k] for k in ("company", "ats", "token", "region") if d.get(k)}
    return list(entries.values()), {source_label(e): fid for fid, e in entries.items()}


def run(cfg: dict, dry_run: bool = False, no_screen: bool = False,
        local_profiles: list[Profile] | None = None) -> dict:
    started = time.time()
    st = cfg["settings"]
    SESSION.headers["User-Agent"] = f"OfferwardCollector/1.0 (+{cfg['traction']['app_url']})"
    store = Store(st["db_path"])
    run_id = store.start_run()
    seen_at = now_ts()

    fs = None
    if local_profiles is not None:
        profiles = local_profiles
    else:
        sa = cfg["traction"]["service_account"]
        if sa and not os.path.exists(sa):
            raise SystemExit(f"Service account key not found at {sa}. "
                             "For a local test without Firestore use: run --dry-run --profile <yaml>")
        from .firestore_sync import FirestoreSync
        fs = FirestoreSync(sa)
        profiles = fs.load_settings(cfg["role_families"], cfg["traction"]["beta_allowlist"])
    log.info("serving %d profile(s)", len(profiles))

    feed_counts: dict = {}
    fs_feeds: dict[str, dict] = {}
    if fs:
        fs_feeds = fs.feeds()
        if not dry_run:
            fs.write_system_discover(cfg["role_families"], bool(cfg["traction"]["beta_allowlist"]), store)
            known = set(fs_feeds) | {feed_id(e) for e in cfg["watchlist"]}
            feed_counts = process_requests(fs, cfg, known)
            fs.flush()
            if feed_counts.get("added"):
                fs_feeds = fs.feeds()
    watchlist, label_to_fid = build_watchlist(cfg, fs_feeds)

    raw, ok_sources, errors, per_feed = gather(cfg, watchlist)
    roles = filter_and_merge(raw)
    log.info("%d raw postings -> %d unique US roles", len(raw), len(roles))

    scorers = [(p, Scorer(p, cfg)) for p in profiles]

    def best(r: Posting, s: Screen) -> int:
        scores = [res.score for res in (sc.score(r, s) for _, sc in scorers) if not res.excluded]
        return max(scores, default=0)

    # 1) pre-score with whatever screening we already have cached
    sc_cfg = st["screen"]
    cached: dict[str, Screen | None] = {r.url: store.get_screen(r.url, sc_cfg["recheck_days"]) for r in roles}
    pre = {r.key: best(r, cached[r.url] or Screen()) for r in roles}

    # 2) screen the roles that could make someone's cut and that we haven't read recently
    screened = 0
    if sc_cfg["enabled"] and not no_screen and scorers:
        todo = [r for r in roles if cached[r.url] is None and pre[r.key] >= sc_cfg["min_prescore"]]
        inline = [r for r in todo if r.description]
        fetch = sorted([r for r in todo if not r.description],
                       key=lambda r: -pre[r.key])[: sc_cfg["max_per_run"]]
        for r in inline:
            cached[r.url] = screen_posting(r.url, r.description)
            store.put_screen(r.url, cached[r.url])
        with ThreadPoolExecutor(max_workers=sc_cfg["workers"]) as ex:
            futs = {ex.submit(screen_posting, r.url): r for r in fetch}
            for fut in as_completed(futs):
                r = futs[fut]
                cached[r.url] = fut.result()
                # Cache failures too, so JS-only career pages aren't refetched every run
                store.put_screen(r.url, cached[r.url])
        screened = len(inline) + len(fetch)
        log.info("screened %d descriptions (%d inline, %d fetched)", screened, len(inline), len(fetch))

    # 3) store roles, then score them for every user
    new_keys = {r.key for r in roles if store.upsert(r, seen_at)}
    closed = store.close_missing(seen_at, ok_sources)
    for prof, scorer in scorers:
        results = []
        for r in roles:
            res = scorer.score(r, cached[r.url] or Screen())
            results.append((r.key, res.score, res.reasons, res.excluded, res.tier))
        store.put_matches(prof.uid, results)
    store.commit()

    # 4) write each user's Discover feed
    users: dict[str, dict] = {}
    for prof in profiles:
        users[prof.uid] = {"matches": len(store.candidates(prof.uid, prof.min_score))}
    if fs and not dry_run:
        # Users no longer served (Discover turned off or deleted, account deleted, off the allowlist):
        # delete their feed so the app stops showing it, and forget their local state only once
        # that delete has committed (a failed batch leaves them known, so the next run retries).
        served = {p.uid for p in profiles}
        for uid in sorted(store.known_uids() - served):
            fs.delete_feed(uid, after=lambda uid=uid: store.forget_user(uid))
        try:
            fs.flush()
        except Exception as e:
            log.warning("deleting feeds of users no longer served failed: %s", e)
        store.commit()
        lookup = _ScreenLookup(store)
        for prof in profiles:
            try:
                now = now_ts()
                triage = parse_triage(fs.read_triage(prof.uid))
                live = store.candidates(prof.uid, prof.min_score)
                triaged_rows = store.roles_by_keys(prof.uid, sorted(triage))
                cards = build_cards(live, triaged_rows, triage, lookup.get, now)
                expired = expired_dismissals(triage, now)
                if expired:
                    fs.delete_triage_keys(prof.uid, expired)
                wrote = needs_write(store.last_feed(prof.uid), cards)
                if wrote:
                    fs.write_feed(prof.uid, {
                        "refreshedAt": fs.fs.SERVER_TIMESTAMP, "totalMatches": len(live), "cap": CAP,
                        "failedSources": len(errors), "cards": cards,
                    })
                fs.flush()  # per user, so one user's failed write can't take another's with it
                if wrote:
                    store.save_feed(prof.uid, compact(cards))
                    store.commit()
            except Exception as e:
                log.warning("feed write failed for %s: %s", prof.uid, e)
                users[prof.uid]["error"] = str(e)[:300]
                continue
            users[prof.uid].update({"cards": len(cards), "wrote": wrote, "expired": len(expired)})
            hot = [c for c in cards if c["roleKey"] in new_keys and c["score"] >= prof.notify_min_score]
            followups: list[dict] = []
            if prof.webhook:
                try:
                    followups = fs.due_followups(prof.uid, st["followup_days"])
                except Exception as e:
                    log.warning("follow-up check failed for %s: %s", prof.uid, e)
                send_digest(prof.webhook, hot, followups, cfg["traction"]["app_url"])
        config_feeds = {feed_id(e): e for e in cfg["watchlist"]}
        current = fs.feeds()  # an admin may have removed a feed mid-run; don't recreate it
        for label, fid in label_to_fid.items():
            if fid not in config_feeds and fid not in current:
                continue
            if fid in config_feeds and fid not in current:
                fs.mirror_config_feed(fid, config_feeds[fid])
            fs.feed_status(fid, label in ok_sources, errors.get(label, ""), per_feed.get(label, 0),
                           current=current.get(fid))
        fs.flush()
        store.commit()

    summary = {
        "rawPostings": len(raw),
        "uniqueRoles": len(roles),
        "newRoles": len(new_keys),
        "screened": screened,
        "closed": len(closed),
        "usersServed": len(profiles),
        "sourcesOk": len(ok_sources),
        "failedSources": errors,
        "feedRequests": feed_counts,
        "durationSec": round(time.time() - started, 1),
    }
    if fs:
        summary["reads"] = fs.reads
        summary["writes"] = fs.writes
        if summary["writes"] > st["write_warn"]:
            log.warning("this run wrote %d Firestore docs (warn above %d; free tier is 20k/day)",
                        summary["writes"], st["write_warn"])
        if not dry_run:
            fs.write_system_health({k: summary[k] for k in HEALTH_KEYS})
            fs.flush()
            store.commit()  # meta written by after-commit callbacks
    write_report(store, st, summary, profiles, users)
    store.finish_run(run_id, {**summary, "users": users})
    log.info("done: %s", json.dumps(summary))
    return summary


class _ScreenLookup(dict):
    """url -> screen dict, read from the store on first use."""

    def __init__(self, store: Store):
        super().__init__()
        self.store = store

    def get(self, url, default=None):
        if url not in self:
            s = self.store.get_screen(url, 10_000)
            self[url] = s.to_dict() if s else None
        return self[url]


def write_report(store: Store, st: dict, summary: dict, profiles: list[Profile], users: dict):
    out = Path(st["report_dir"]) / "latest.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    lines = [f"# Offerward collector report, {datetime.now():%Y-%m-%d %H:%M}", ""]
    lines.append(", ".join(f"{k}: {v}" for k, v in summary.items() if not isinstance(v, (list, dict))))
    if summary["failedSources"]:
        lines += ["", "## Source errors"] + [f"- {k}: {v}" for k, v in summary["failedSources"].items()]
    for prof in profiles:
        u = users.get(prof.uid, {})
        lines += ["", f"## {prof.uid}",
                  "", f"{u.get('matches', 0)} matches at or above {prof.min_score}"
                      + (f"; {u['cards']} cards, feed {'written' if u['wrote'] else 'unchanged'}"
                         if "cards" in u else "")
                      + (f"; error: {u['error']}" if "error" in u else "")]
        for track, name in (("intern", "Internships"), ("newgrad", "New grad")):
            if track not in prof.tracks:
                continue
            lines += ["", f"### Top {name}", "",
                      "| Score | Company | Role | Location | Posted | Why |", "|---|---|---|---|---|---|"]
            for r in store.top(prof.uid, prof.min_score, 20, track):
                d = days_ago(r["posted_ts"])
                why = "; ".join(json.loads(r["reasons"] or "[]"))
                lines.append(f"| {r['score']} | {r['company']} | [{r['title']}]({r['url']}) | "
                             f"{(r['location'] or '')[:40]} | {'' if d is None else f'{d}d'} | {why} |")
    out.write_text("\n".join(lines) + "\n")
    log.info("report written to %s", out)
