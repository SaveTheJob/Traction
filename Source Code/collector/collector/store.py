"""Local SQLite state: what we've seen, when, and what we've already pushed."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from .models import Screen
from .util import now_ts

SCHEMA = """
CREATE TABLE IF NOT EXISTS roles (
    key          TEXT PRIMARY KEY,
    company      TEXT NOT NULL,
    title        TEXT NOT NULL,
    location     TEXT,
    url          TEXT,
    track        TEXT,
    terms        TEXT,
    category     TEXT,
    sources      TEXT,
    hints        TEXT,
    posted_ts    REAL,
    first_seen   REAL NOT NULL,
    last_seen    REAL NOT NULL,
    active       INTEGER NOT NULL DEFAULT 1,
    score        INTEGER,
    reasons      TEXT,
    excluded     TEXT,
    pushed_score INTEGER,
    pushed_active INTEGER
);
CREATE INDEX IF NOT EXISTS roles_active ON roles(active);
CREATE TABLE IF NOT EXISTS screens (
    url        TEXT PRIMARY KEY,
    checked_at REAL NOT NULL,
    data       TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS runs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    started   REAL NOT NULL,
    finished  REAL,
    summary   TEXT
);
"""


class Store:
    def __init__(self, path: str | Path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(str(path))
        self.db.row_factory = sqlite3.Row
        self.db.executescript(SCHEMA)

    # -- screens -----------------------------------------------------------

    def get_screen(self, url: str, max_age_days: float) -> Screen | None:
        row = self.db.execute("SELECT checked_at, data FROM screens WHERE url=?", (url,)).fetchone()
        if not row or now_ts() - row["checked_at"] > max_age_days * 86400:
            return None
        return Screen.from_dict(json.loads(row["data"]))

    def put_screen(self, url: str, s: Screen):
        self.db.execute(
            "INSERT INTO screens(url, checked_at, data) VALUES(?,?,?) "
            "ON CONFLICT(url) DO UPDATE SET checked_at=excluded.checked_at, data=excluded.data",
            (url, now_ts(), json.dumps(s.to_dict())),
        )

    # -- roles -------------------------------------------------------------

    def get(self, key: str) -> sqlite3.Row | None:
        return self.db.execute("SELECT * FROM roles WHERE key=?", (key,)).fetchone()

    def upsert(self, post, score: int, reasons: list[str], excluded: str, seen_at: float) -> bool:
        """Insert or refresh a role. Returns True when the role is new."""
        row = self.get(post.key)
        if row is None:
            self.db.execute(
                "INSERT INTO roles(key, company, title, location, url, track, terms, category, sources,"
                " hints, posted_ts, first_seen, last_seen, active, score, reasons, excluded)"
                " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?)",
                (post.key, post.company, post.title, post.location, post.url, post.track,
                 json.dumps(post.terms), post.category, json.dumps(post.sources),
                 json.dumps(sorted(post.hints)), post.posted_ts,
                 seen_at, seen_at, score, json.dumps(reasons), excluded),
            )
            return True
        self.db.execute(
            "UPDATE roles SET location=?, url=?, terms=?, category=?, sources=?, hints=?,"
            " posted_ts=COALESCE(?, posted_ts), last_seen=?, active=1, score=?, reasons=?, excluded=?"
            " WHERE key=?",
            (post.location, post.url, json.dumps(post.terms), post.category, json.dumps(post.sources),
             json.dumps(sorted(post.hints)), post.posted_ts, seen_at, score, json.dumps(reasons), excluded, post.key),
        )
        return False

    def close_missing(self, seen_at: float, ok_sources: set[str]) -> list[str]:
        """Mark roles inactive when every source that listed them was read OK and none had them."""
        closed = []
        rows = self.db.execute(
            "SELECT key, sources FROM roles WHERE active=1 AND last_seen < ?", (seen_at,)).fetchall()
        for r in rows:
            srcs = set(json.loads(r["sources"] or "[]"))
            if srcs and srcs <= ok_sources:
                closed.append(r["key"])
        if closed:
            self.db.executemany("UPDATE roles SET active=0 WHERE key=?", [(k,) for k in closed])
        return closed

    def mark_pushed(self, key: str, score: int, active: bool):
        self.db.execute("UPDATE roles SET pushed_score=?, pushed_active=? WHERE key=?",
                        (score, int(active), key))

    def needs_push(self, min_score: int) -> list[sqlite3.Row]:
        """Roles whose Firestore copy is missing or stale."""
        return self.db.execute(
            "SELECT * FROM roles WHERE"
            " (active=1 AND excluded='' AND score>=? AND (pushed_score IS NULL OR pushed_score!=score"
            "   OR pushed_active=0))"
            " OR (pushed_score IS NOT NULL AND pushed_active=1 AND (active=0 OR excluded!='' OR score<?))",
            (min_score, min_score),
        ).fetchall()

    def top(self, min_score: int, limit: int = 50, track: str | None = None) -> list[sqlite3.Row]:
        q = "SELECT * FROM roles WHERE active=1 AND excluded='' AND score>=?"
        args: list = [min_score]
        if track:
            q += " AND track=?"
            args.append(track)
        q += " ORDER BY score DESC, posted_ts DESC LIMIT ?"
        args.append(limit)
        return self.db.execute(q, args).fetchall()

    # -- runs --------------------------------------------------------------

    def start_run(self) -> int:
        cur = self.db.execute("INSERT INTO runs(started) VALUES(?)", (now_ts(),))
        self.db.commit()
        return cur.lastrowid

    def finish_run(self, run_id: int, summary: dict):
        self.db.execute("UPDATE runs SET finished=?, summary=? WHERE id=?",
                        (now_ts(), json.dumps(summary), run_id))
        self.db.commit()

    def commit(self):
        self.db.commit()
