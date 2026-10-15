"""Builds each user's Discover feed doc (users/{uid}/discover/feed). Pure logic: no Firestore."""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from typing import Callable, Mapping

CAP = 300
MAX_CARDS = 400
MAX_BYTES = 900_000
SHOW_DISMISSED_DAYS = 30
KEEP_SAVED_AFTER_CLOSE_DAYS = 30
DISMISS_MEMORY_DAYS = 180
SCORE_DELTA = 3
DAY = 86400


def _ts(x):
    return datetime.fromtimestamp(x, tz=timezone.utc) if x else None


def _loads(v):
    try:
        return json.loads(v or "[]")
    except (TypeError, ValueError):
        return []


def card_from_row(row: Mapping, screen: dict | None) -> dict:
    screen = screen or {}
    hints = set(_loads(row["hints"]))
    return {
        "roleKey": row["key"],
        "company": row["company"],
        "title": row["title"],
        "location": row["location"] or "",
        "url": row["url"] or "",
        "track": row["track"],
        "terms": _loads(row["terms"]),
        "postedAt": _ts(row["posted_ts"]),
        "firstSeenAt": _ts(row["first_seen"]),
        "score": int(row["score"] or 0),
        "tier": row["tier"] or "",
        "reasons": _loads(row["reasons"]),
        "flags": {
            "citizen": bool(screen.get("citizen")) or "citizen" in hints,
            "exportControl": bool(screen.get("export")),
            "noSponsor": bool(screen.get("no_sponsor")) or "no_sponsor" in hints,
            "sponsorFriendly": bool(screen.get("sponsor")) or "sponsor" in hints,
            "screened": screen.get("status") == "screened",
        },
        "snippets": list(screen.get("snippets") or [])[:3],
        "gradWindow": screen.get("grad_window") or "",
        "closed": not row["active"],
    }


def parse_triage(raw: dict | None) -> dict[str, dict]:
    """Validate the user-written triage doc; bad entries are ignored (rules can't check values)."""
    out: dict[str, dict] = {}
    cards = (raw or {}).get("cards")
    if not isinstance(cards, dict):
        return out
    for key, v in cards.items():
        if not isinstance(key, str) or len(key) > 64 or not isinstance(v, dict):
            continue
        if v.get("status") not in ("saved", "dismissed"):
            continue
        at = v.get("at")
        if hasattr(at, "timestamp"):
            at = at.timestamp()
        elif isinstance(at, (int, float)) and not isinstance(at, bool) and math.isfinite(at):
            at = float(at)
        else:
            at = None
        entry = {"status": v["status"], "at": at}
        if isinstance(v.get("jobId"), str):
            entry["jobId"] = v["jobId"][:128]
        out[key] = entry
    return out


def _card_size(card: dict) -> int:
    return len(json.dumps(card, default=str).encode())


def build_cards(live_rows, triaged_rows: Mapping[str, Mapping], triage: dict[str, dict],
                screen_of: Callable[[str], dict | None], now: float, cap: int = CAP) -> list[dict]:
    """live_rows: open roles at/above the user's bar, best first. triaged_rows: role rows for triage keys."""
    cards: list[dict] = []
    live_keys: list[str] = []
    for r in sorted(live_rows, key=lambda r: -(r["score"] or 0)):  # stable: keeps the SQL tie order
        if r["key"] in triage:
            continue
        if len(live_keys) >= cap:
            break
        cards.append(card_from_row(r, screen_of(r["url"])))
        live_keys.append(r["key"])
    for key, t in triage.items():
        r = triaged_rows.get(key)
        if r is None:
            continue
        if t["status"] == "dismissed":
            if t["at"] is None or now - t["at"] > SHOW_DISMISSED_DAYS * DAY:
                continue
        else:  # saved
            closed_at = r["closed_at"] if "closed_at" in r.keys() else None
            if not r["active"] and closed_at and now - closed_at > KEEP_SAVED_AFTER_CLOSE_DAYS * DAY:
                continue
        cards.append(card_from_row(r, screen_of(r["url"])))
    cards.sort(key=lambda c: -c["score"])

    # Trim: drop the lowest-scoring live cards until the list fits; if that isn't enough,
    # dismissed cards, then saved ones (lowest score first each time). Sizes are measured once;
    # a JSON list costs 2 brackets + ", " between items (json.dumps defaults).
    live = set(live_keys)
    sizes = [_card_size(c) for c in cards]
    total = 2 + sum(sizes) + 2 * max(len(cards) - 1, 0)
    for droppable in (lambda k: k in live,
                      lambda k: triage.get(k, {}).get("status") == "dismissed",
                      lambda k: True):
        i = len(cards) - 1
        while (len(cards) > MAX_CARDS or total > MAX_BYTES) and i >= 0:
            if droppable(cards[i]["roleKey"]):
                total -= sizes[i] + (2 if len(cards) > 1 else 0)
                del cards[i], sizes[i]
            i -= 1
    return cards


def compact(cards: list[dict]) -> dict[str, dict]:
    return {c["roleKey"]: {"score": c["score"], "closed": c["closed"], "flags": c["flags"]} for c in cards}


def needs_write(prev: dict[str, dict] | None, cards: list[dict]) -> bool:
    if prev is None:
        return True
    cur = compact(cards)
    if set(cur) != set(prev):
        return True
    for k, c in cur.items():
        p = prev[k]
        if abs(c["score"] - p["score"]) >= SCORE_DELTA or c["closed"] != p["closed"] or c["flags"] != p["flags"]:
            return True
    return False


def expired_dismissals(triage: dict[str, dict], now: float) -> list[str]:
    return sorted(k for k, t in triage.items()
                  if t["status"] == "dismissed" and t["at"] is not None and now - t["at"] > DISMISS_MEMORY_DAYS * DAY)
