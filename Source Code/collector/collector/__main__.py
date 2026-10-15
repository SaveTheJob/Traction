"""CLI.

    python -m collector run [--dry-run] [--no-screen] [--profile p.yaml ...]   one full run
    python -m collector selftest                         check every source + watchlist entry
    python -m collector top [--uid UID] [--track intern|newgrad]   best roles from local state
    python -m collector import-profile --uid UID --from p.yaml [--print]   load a YAML profile
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path

import yaml

from . import config as C
from .notify import send_admin_alert
from .profile import Profile
from .runner import run, source_label
from .screen import screen_posting
from .sources import fetch_watchlist_entry, markdown_table, simplify
from .store import Store
from .util import days_ago


def cmd_selftest(cfg: dict) -> int:
    bad = 0
    print("Community lists")
    for src in cfg["sources"]:
        try:
            fn = simplify if src["type"] == "simplify" else markdown_table
            got = fn(src["url"], src["label"], src["track"])
            print(f"  OK   {src['label']:<24} {len(got):>5} postings")
        except Exception as e:
            bad += 1
            print(f"  FAIL {src['label']:<24} {e}")
    print("Company feeds")
    for e in cfg["watchlist"]:
        label = source_label(e)
        try:
            got = fetch_watchlist_entry(e, cfg["settings"]["workday_queries"][:1])
            sample = ""
            if got:
                s = screen_posting(got[0].url, got[0].description)
                sample = f"  sample: '{got[0].title[:50]}' screen={s.status}"
            print(f"  OK   {label:<40} {len(got):>4} early-career{sample}")
        except Exception as ex:
            bad += 1
            print(f"  FAIL {label:<40} {str(ex)[:120]}")
    print("\nAll sources reachable." if not bad else f"\n{bad} source(s) failed; fix or remove them in config.")
    return 1 if bad else 0


def cmd_top(cfg: dict, uid: str | None, track: str | None, n: int, min_score: int) -> int:
    store = Store(cfg["settings"]["db_path"])
    uids = store.match_uids()
    if not uid:
        if len(uids) != 1:
            print("Pass --uid; local state has scores for: " + (", ".join(uids) or "nobody yet"))
            return 2
        uid = uids[0]
    for r in store.top(uid, min_score, n, track):
        d = days_ago(r["posted_ts"])
        print(f"{r['score']:>3}  {r['company'][:24]:<24} {r['title'][:58]:<58} "
              f"{(r['location'] or '')[:22]:<22} {'' if d is None else str(d) + 'd'}")
        for why in json.loads(r["reasons"] or "[]"):
            print(f"       - {why}")
    return 0


def load_profile_file(path: str, uid: str, cfg: dict) -> Profile:
    with open(path) as f:
        data = yaml.safe_load(f) or {}
    return Profile.from_yaml(uid, data, cfg["role_families"])


def cmd_import_profile(cfg: dict, uid: str, path: str, print_only: bool) -> int:
    prof = load_profile_file(path, uid, cfg)
    doc = prof.to_doc()
    if not prof.role_families:
        print("Warning: no role families matched; the profile will score every role 0.", file=sys.stderr)
    if print_only:
        print(json.dumps(doc, indent=2))
        return 0
    sa = cfg["traction"]["service_account"]
    if sa and not os.path.exists(sa):
        raise SystemExit(f"Service account key not found at {sa}")
    from .firestore_sync import FirestoreSync
    fs = FirestoreSync(sa)
    fs.write_settings(uid, {**doc, "updatedAt": fs.fs.SERVER_TIMESTAMP})
    print(f"Wrote users/{uid}/discover/settings:")
    print(json.dumps(doc, indent=2))
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="collector")
    ap.add_argument("--config", help="path to config.yaml")
    ap.add_argument("-v", "--verbose", action="store_true")
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run")
    r.add_argument("--dry-run", action="store_true", help="don't write to Firestore or send digests or alerts")
    r.add_argument("--no-screen", action="store_true", help="skip reading job descriptions")
    r.add_argument("--profile", action="append", default=[], metavar="YAML",
                   help="score for this local profile instead of Firestore profiles (dry runs only; repeatable)")
    sub.add_parser("selftest")
    t = sub.add_parser("top")
    t.add_argument("--uid", help="whose matches to show (defaults to the only one in local state)")
    t.add_argument("--track", choices=["intern", "newgrad"])
    t.add_argument("--min-score", type=int, default=60)
    t.add_argument("-n", type=int, default=25)
    ip = sub.add_parser("import-profile", help="write a YAML profile to users/{uid}/discover/settings")
    ip.add_argument("--uid", required=True, help="Firebase Auth UID of the user")
    ip.add_argument("--from", dest="path", required=True, metavar="YAML")
    ip.add_argument("--print", dest="print_only", action="store_true", help="show the doc, don't write it")
    args = ap.parse_args(argv)

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    cfg = C.load(args.config)

    if args.cmd == "run":
        local = None
        if args.profile:
            if not args.dry_run:
                raise SystemExit("--profile only works with --dry-run (local profiles are never pushed).")
            local = [load_profile_file(p, f"local:{Path(p).stem}", cfg) for p in args.profile]
        admin = "" if args.dry_run else cfg["notify"]["admin_webhook"]
        try:
            summary = run(cfg, dry_run=args.dry_run, no_screen=args.no_screen, local_profiles=local)
        except Exception as e:
            send_admin_alert(admin, "Offerward collector run failed", [repr(e)[:500]])
            raise
        if summary["failedSources"]:
            send_admin_alert(admin, "Offerward collector: sources failed",
                             [f"{k}: {v[:150]}" for k, v in summary["failedSources"].items()])
        return 1 if summary["failedSources"] and not summary["sourcesOk"] else 0
    if args.cmd == "selftest":
        return cmd_selftest(cfg)
    if args.cmd == "top":
        return cmd_top(cfg, args.uid, args.track, args.n, args.min_score)
    if args.cmd == "import-profile":
        return cmd_import_profile(cfg, args.uid, args.path, args.print_only)
    return 2


if __name__ == "__main__":
    sys.exit(main())
