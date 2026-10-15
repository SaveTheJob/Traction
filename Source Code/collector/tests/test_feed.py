import json

from collector import feed as F

NOW = 1_800_000_000.0
DAY = 86400


def row(key, score, active=1, closed_at=None, **kw):
    base = {"key": key, "company": f"Co {key}", "title": f"Engineer {key}", "location": "Phoenix, AZ",
            "url": f"https://x.com/{key}", "track": "intern", "terms": '["Summer 2027"]', "category": "Hardware",
            "sources": '["simplify-intern"]', "hints": "[]", "posted_ts": NOW - DAY, "first_seen": NOW - DAY,
            "last_seen": NOW, "active": active, "closed_at": closed_at, "score": score,
            "reasons": '["Core role match: firmware"]', "tier": "core", "excluded": ""}
    base.update(kw)
    return base


no_screen = lambda url: None  # noqa: E731


def test_live_cards_capped_and_sorted():
    live = [row(f"k{i}", 50 + i) for i in range(10)]
    cards = F.build_cards(live, {}, {}, no_screen, NOW, cap=3)
    assert [c["roleKey"] for c in cards] == ["k9", "k8", "k7"]


def test_triaged_roles_dont_use_cap_and_dismissed_memory_excludes():
    live = [row("a", 90), row("b", 80), row("c", 70)]
    triage = {"a": {"status": "dismissed", "at": NOW - 40 * DAY}, "b": {"status": "saved", "at": NOW}}
    triaged = {"a": live[0], "b": live[1]}
    cards = F.build_cards(live, triaged, triage, no_screen, NOW, cap=1)
    keys = [c["roleKey"] for c in cards]
    assert "a" not in keys          # dismissed 40 days ago: out of the feed, still remembered
    assert keys == ["b", "c"]       # saved kept, plus 1 live untriaged


def test_saved_kept_until_30_days_after_close():
    old = row("s", 80, active=0, closed_at=NOW - 31 * DAY)
    recent = row("t", 80, active=0, closed_at=NOW - 5 * DAY)
    triage = {"s": {"status": "saved", "at": NOW - 60 * DAY}, "t": {"status": "saved", "at": NOW - 60 * DAY}}
    cards = F.build_cards([], {"s": old, "t": recent}, triage, no_screen, NOW)
    assert [c["roleKey"] for c in cards] == ["t"]
    assert cards[0]["closed"] is True


def test_card_shape():
    c = F.card_from_row(row("k", 77), {"status": "screened", "citizen": True, "snippets": ["Must be a U.S. citizen."], "grad_window": ""})
    assert set(c) == {"roleKey", "company", "title", "location", "url", "track", "terms", "postedAt", "firstSeenAt",
                      "score", "tier", "reasons", "flags", "snippets", "gradWindow", "closed"}
    assert c["flags"]["citizen"] is True and c["terms"] == ["Summer 2027"]


def test_feed_size_limit():
    big = "x" * 4000
    live = [row(f"k{i:03}", 100 - (i % 50), reasons=json.dumps([big] * 3)) for i in range(400)]
    cards = F.build_cards(live, {}, {}, lambda u: {"snippets": [big[:260]] * 3, "status": "screened"}, NOW, cap=400)
    assert len(cards) <= F.MAX_CARDS
    assert len(json.dumps(cards, default=str).encode()) <= F.MAX_BYTES
    assert cards == sorted(cards, key=lambda c: -c["score"])


def test_needs_write_rules():
    cards = F.build_cards([row("a", 80), row("b", 70)], {}, {}, no_screen, NOW)
    prev = F.compact(cards)
    assert F.needs_write(None, cards)
    assert not F.needs_write(prev, cards)
    assert not F.needs_write(prev, F.build_cards([row("a", 82), row("b", 70)], {}, {}, no_screen, NOW))
    assert F.needs_write(prev, F.build_cards([row("a", 83), row("b", 70)], {}, {}, no_screen, NOW))
    assert F.needs_write(prev, F.build_cards([row("a", 80)], {}, {}, no_screen, NOW))


def test_parse_triage_drops_garbage_and_expired_dismissals():
    raw = {"cards": {"ok": {"status": "saved", "at": NOW}, "bad": {"status": "loved"}, "nomap": "x",
                     "old": {"status": "dismissed", "at": NOW - 200 * DAY}}}
    t = F.parse_triage(raw)
    assert set(t) == {"ok", "old"}
    assert F.expired_dismissals(t, NOW) == ["old"]


def test_parse_triage_rejects_bool_and_non_finite_at():
    raw = {"cards": {"b": {"status": "saved", "at": True}, "n": {"status": "dismissed", "at": float("nan")},
                     "i": {"status": "dismissed", "at": float("inf")}, "ok": {"status": "saved", "at": NOW}}}
    t = F.parse_triage(raw)
    assert t["b"]["at"] is None and t["n"]["at"] is None and t["i"]["at"] is None
    assert t["ok"]["at"] == NOW
    assert F.expired_dismissals(t, NOW) == []


def test_triaged_overflow_trimmed():
    big = "x" * 4000
    rows = {f"s{i:03}": row(f"s{i:03}", 50 + i % 40, reasons=json.dumps([big] * 3)) for i in range(250)}
    rows.update({f"d{i:03}": row(f"d{i:03}", 50 + i % 40, reasons=json.dumps([big] * 3)) for i in range(250)})
    triage = {k: {"status": "saved" if k[0] == "s" else "dismissed", "at": NOW - DAY} for k in rows}
    live = [row(f"k{i}", 99) for i in range(5)]
    cards = F.build_cards(live, rows, triage, no_screen, NOW)
    keys = {c["roleKey"] for c in cards}
    assert len(cards) <= F.MAX_CARDS
    assert len(json.dumps(cards, default=str).encode()) <= F.MAX_BYTES
    assert not keys & {f"k{i}" for i in range(5)}          # live cards go first
    assert not any(k[0] == "d" for k in keys)               # then every dismissed card, before any saved one
    saved = [c["score"] for c in cards]
    dropped = [rows[k]["score"] for k in rows if k[0] == "s" and k not in keys]
    assert dropped and max(dropped) <= min(saved)           # lowest-scoring saved cards dropped
    assert cards == sorted(cards, key=lambda c: -c["score"])
