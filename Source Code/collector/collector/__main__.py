"""CLI.

    python -m collector run [--dry-run] [--no-screen]   one full run
    python -m collector selftest                          check every source + watchlist entry
    python -m collector top [--track intern|newgrad]      print best roles from local state
"""

from __future__ import annotations

import argparse
import json
import logging
import sys

from . import config as C
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
            print(f"  OK   {label:<34} {len(got):>4} early-career{sample}")
        except Exception as ex:
            bad += 1
            print(f"  FAIL {label:<34} {str(ex)[:120]}")
    print("\nAll sources reachable." if not bad else f"\n{bad} source(s) failed; fix or remove them in config.")
    return 1 if bad else 0


def cmd_top(cfg: dict, track: str | None, n: int) -> int:
    store = Store(cfg["settings"]["db_path"])
    for r in store.top(cfg["settings"]["min_score"], n, track):
        d = days_ago(r["posted_ts"])
        print(f"{r['score']:>3}  {r['company'][:24]:<24} {r['title'][:58]:<58} "
              f"{(r['location'] or '')[:22]:<22} {'' if d is None else str(d) + 'd'}")
        for why in json.loads(r["reasons"] or "[]"):
            print(f"       - {why}")
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="collector")
    ap.add_argument("--config", help="path to config.yaml")
    ap.add_argument("-v", "--verbose", action="store_true")
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run")
    r.add_argument("--dry-run", action="store_true", help="don't write to Firestore or send digest")
    r.add_argument("--no-screen", action="store_true", help="skip reading job descriptions")
    sub.add_parser("selftest")
    t = sub.add_parser("top")
    t.add_argument("--track", choices=["intern", "newgrad"])
    t.add_argument("-n", type=int, default=25)
    args = ap.parse_args(argv)

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    cfg = C.load(args.config)

    if args.cmd == "run":
        summary = run(cfg, dry_run=args.dry_run, no_screen=args.no_screen)
        return 1 if summary["sourceErrors"] and not summary["sourcesOk"] else 0
    if args.cmd == "selftest":
        return cmd_selftest(cfg)
    if args.cmd == "top":
        return cmd_top(cfg, args.track, args.n)
    return 2


if __name__ == "__main__":
    sys.exit(main())
