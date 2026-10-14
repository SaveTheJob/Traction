"""One collector run: gather, filter, dedupe, screen, score, store, push, notify."""

from __future__ import annotations

import json
import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

from . import sources as S
from .models import Posting, Screen
from .notify import send_digest
from .score import Scorer
from .screen import screen_posting
from .store import Store
from .util import days_ago, is_us_location, now_ts

log = logging.getLogger("collector")

ATS_PREFIXES = ("workday:", "greenhouse:", "lever:", "ashby:", "smartrecruiters:")


def source_label(entry: dict) -> str:
    return f"{entry['ats']}:{entry.get('tenant') or entry.get('token')}"


def gather(cfg: dict) -> tuple[list[Posting], set[str], dict[str, str]]:
    postings: list[Posting] = []
    ok: set[str] = set()
    errors: dict[str, str] = {}

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
            log.info("%-22s %5d postings", label, len(got))
        except Exception as e:
            errors[label] = str(e)[:300]
            log.warning("%-22s FAILED: %s", label, e)

    queries = cfg["settings"]["workday_queries"]
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(S.fetch_watchlist_entry, e, queries): e for e in cfg["watchlist"]}
        for fut in as_completed(futs):
            e = futs[fut]
            label = source_label(e)
            try:
                got = fut.result()
                postings += got
                ok.add(label)
                log.info("%-22s %5d early-career postings", label, len(got))
            except Exception as ex_:
                errors[label] = str(ex_)[:300]
                log.warning("%-22s FAILED: %s", label, ex_)
    return postings, ok, errors


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


def run(cfg: dict, dry_run: bool = False, no_screen: bool = False) -> dict:
    st = cfg["settings"]
    store = Store(st["db_path"])
    run_id = store.start_run()
    seen_at = now_ts()
    scorer = Scorer(cfg["profile"])

    raw, ok_sources, errors = gather(cfg)
    roles = filter_and_merge(raw)
    log.info("%d raw postings -> %d unique US roles", len(raw), len(roles))

    # 1) pre-score with whatever screening we already have cached
    sc = st["screen"]
    cached: dict[str, Screen | None] = {r.url: store.get_screen(r.url, sc["recheck_days"]) for r in roles}
    pre = {r.key: scorer.score(r, cached[r.url] or Screen()) for r in roles}

    # 2) screen the promising ones we haven't read recently
    screened = 0
    if sc["enabled"] and not no_screen:
        todo = [r for r in roles
                if cached[r.url] is None and not pre[r.key].excluded
                and pre[r.key].score >= sc["min_prescore"]]
        inline = [r for r in todo if r.description]
        fetch = sorted([r for r in todo if not r.description],
                       key=lambda r: -pre[r.key].score)[: sc["max_per_run"]]
        for r in inline:
            cached[r.url] = screen_posting(r.url, r.description)
            store.put_screen(r.url, cached[r.url])
        with ThreadPoolExecutor(max_workers=sc["workers"]) as ex:
            futs = {ex.submit(screen_posting, r.url): r for r in fetch}
            for fut in as_completed(futs):
                r = futs[fut]
                s = fut.result()
                cached[r.url] = s
                # Cache failures too, so JS-only career pages aren't refetched every run
                store.put_screen(r.url, s)
        screened = len(inline) + len(fetch)
        log.info("screened %d descriptions (%d inline, %d fetched)", screened, len(inline), len(fetch))

    # 3) final score + store
    new_keys = []
    for r in roles:
        res = scorer.score(r, cached[r.url] or Screen())
        if store.upsert(r, res.score, res.reasons, res.excluded, seen_at):
            new_keys.append(r.key)
    closed = store.close_missing(seen_at, ok_sources)
    store.commit()

    # 4) push to Traction
    min_score = st["min_score"]
    created = updated = 0
    followups: list[dict] = []
    fs = None
    uid = cfg["traction"]["user_id"]
    sa = cfg["traction"]["service_account"]
    if not dry_run:
        if not uid or not os.path.exists(sa):
            log.warning("No user_id or service account; skipping Firestore push")
        else:
            from .firestore_sync import FirestoreSync
            fs = FirestoreSync(sa, uid)
            rows = store.needs_push(min_score)
            screens = {}
            for r in rows:
                s = store.get_screen(r["url"], 10_000)
                if s:
                    screens[r["url"]] = s.to_dict()
            created, updated, pushed = fs.push(rows, screens, min_score, st["max_new_per_run"])
            for row, live in pushed:
                store.mark_pushed(row["key"], row["score"], live)
            store.commit()
            try:
                followups = fs.due_followups(st["followup_days"])
            except Exception as e:
                log.warning("follow-up check failed: %s", e)

    # 5) digest of genuinely new, high-fit roles
    hot = [store.get(k) for k in new_keys]
    hot = sorted([h for h in hot if h and not h["excluded"] and h["score"] >= st["notify_min_score"]],
                 key=lambda h: -h["score"])
    if not dry_run:
        send_digest(cfg["notify"].get("webhook", ""), hot, followups, cfg["traction"].get("app_url", ""))

    summary = {
        "rawPostings": len(raw),
        "uniqueRoles": len(roles),
        "newRoles": len(new_keys),
        "newHighFit": len(hot),
        "screened": screened,
        "closed": len(closed),
        "pushedCreated": created,
        "pushedUpdated": updated,
        "followupsDue": len(followups),
        "sourcesOk": sorted(ok_sources),
        "sourceErrors": errors,
    }
    write_report(store, st, summary, followups)
    if fs:
        try:
            fs.write_run(summary)
        except Exception as e:
            log.warning("could not write run summary: %s", e)
    store.finish_run(run_id, summary)
    log.info("done: %s", json.dumps({k: v for k, v in summary.items() if k != "sourcesOk"}))
    return summary


def write_report(store: Store, st: dict, summary: dict, followups: list[dict]):
    out = Path(st["report_dir"]) / "latest.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    lines = [f"# Traction collector report, {datetime.now():%Y-%m-%d %H:%M}", ""]
    lines.append(", ".join(f"{k}: {v}" for k, v in summary.items() if not isinstance(v, (list, dict))))
    if summary["sourceErrors"]:
        lines += ["", "## Source errors"] + [f"- {k}: {v}" for k, v in summary["sourceErrors"].items()]
    if followups:
        lines += ["", "## Follow-ups due"] + [f"- {f['company']}: {f['title']} ({f['days']} days)" for f in followups]
    for track, name in (("intern", "Internships"), ("newgrad", "New grad")):
        lines += ["", f"## Top {name}", "", "| Score | Company | Role | Location | Posted | Why |", "|---|---|---|---|---|---|"]
        for r in store.top(st["min_score"], 40, track):
            d = days_ago(r["posted_ts"])
            why = "; ".join(json.loads(r["reasons"] or "[]"))
            lines.append(f"| {r['score']} | {r['company']} | [{r['title']}]({r['url']}) | "
                         f"{(r['location'] or '')[:40]} | {'' if d is None else f'{d}d'} | {why} |")
    out.write_text("\n".join(lines) + "\n")
    log.info("report written to %s", out)
