"""Local SQLite state: what we've seen, how it scored for each user, and what
each user's Firestore copy currently holds."""

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
    active       INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS roles_active ON roles(active);
CREATE TABLE IF NOT EXISTS screens (
    url        TEXT PRIMARY KEY,
    checked_at REAL NOT NULL,
    data       TEXT NOT NULL
);
-- Latest score of each role for each user (rewritten every run, dry runs included)
CREATE TABLE IF NOT EXISTS matches (
    uid       TEXT NOT NULL,
    key       TEXT NOT NULL,
    score     INTEGER NOT NULL,
    reasons   TEXT NOT NULL,
    excluded  TEXT NOT NULL,
    tier      TEXT NOT NULL,
    PRIMARY KEY (uid, key)
);
-- What each user's discoveries/{uid}_{key} doc holds. deleted_at marks a pruned
-- dismissed doc, kept so the role isn't shown again as new.
CREATE TABLE IF NOT EXISTS pushes (
    uid        TEXT NOT NULL,
    key        TEXT NOT NULL,
    score      INTEGER NOT NULL,
    active     INTEGER NOT NULL,
    closed     INTEGER NOT NULL,
    flags      TEXT NOT NULL,
    pushed_at  REAL NOT NULL,
    deleted_at REAL,
    PRIMARY KEY (uid, key)
);
CREATE TABLE IF NOT EXISTS runs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    started   REAL NOT NULL,
    finished  REAL,
    summary   TEXT
);
CREATE TABLE IF NOT EXISTS meta (
    k TEXT PRIMARY KEY,
    v TEXT NOT NULL
);
"""


class Store:
    def __init__(self, path: str | Path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(str(path))
        self.db.row_factory = sqlite3.Row
        self.db.executescript(SCHEMA)
        # Single-user state.db files kept per-role scores on `roles`; scores are per user now.
        cols = {r["name"] for r in self.db.execute("PRAGMA table_info(roles)")}
        for col in ("score", "reasons", "excluded", "pushed_score", "pushed_active"):
            if col in cols:
                self.db.execute(f"ALTER TABLE roles DROP COLUMN {col}")
        self.db.commit()

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

    def upsert(self, post, seen_at: float) -> bool:
        """Insert or refresh a role. Returns True when the role is new."""
        row = self.get(post.key)
        if row is None:
            self.db.execute(
                "INSERT INTO roles(key, company, title, location, url, track, terms, category, sources,"
                " hints, posted_ts, first_seen, last_seen, active)"
                " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1)",
                (post.key, post.company, post.title, post.location, post.url, post.track,
                 json.dumps(post.terms), post.category, json.dumps(post.sources),
                 json.dumps(sorted(post.hints)), post.posted_ts, seen_at, seen_at),
            )
            return True
        self.db.execute(
            "UPDATE roles SET location=?, url=?, terms=?, category=?, sources=?, hints=?,"
            " posted_ts=COALESCE(?, posted_ts), last_seen=?, active=1 WHERE key=?",
            (post.location, post.url, json.dumps(post.terms), post.category, json.dumps(post.sources),
             json.dumps(sorted(post.hints)), post.posted_ts, seen_at, post.key),
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

    # -- per-user matches --------------------------------------------------

    def put_matches(self, uid: str, results: list[tuple[str, int, list[str], str, str]]):
        """results: (key, score, reasons, excluded, tier) for every role scored this run."""
        self.db.executemany(
            "INSERT INTO matches(uid, key, score, reasons, excluded, tier) VALUES(?,?,?,?,?,?) "
            "ON CONFLICT(uid, key) DO UPDATE SET score=excluded.score, reasons=excluded.reasons,"
            " excluded=excluded.excluded, tier=excluded.tier",
            [(uid, k, s, json.dumps(r), e, t) for k, s, r, e, t in results],
        )

    def drop_users_except(self, uids: set[str]):
        """Forget scores for users who are no longer served (pushes are kept)."""
        known = {r[0] for r in self.db.execute("SELECT DISTINCT uid FROM matches")}
        for uid in known - uids:
            self.db.execute("DELETE FROM matches WHERE uid=?", (uid,))

    def candidates(self, uid: str, min_score: int) -> list[sqlite3.Row]:
        """Open roles that pass this user's bar, best first."""
        return self.db.execute(
            "SELECT r.*, m.score, m.reasons, m.tier FROM roles r JOIN matches m ON m.key=r.key"
            " WHERE m.uid=? AND r.active=1 AND m.excluded='' AND m.score>=?"
            " ORDER BY m.score DESC, r.posted_ts DESC",
            (uid, min_score),
        ).fetchall()

    def match_rows(self, uid: str, keys: list[str]) -> dict[str, sqlite3.Row]:
        out = {}
        for i in range(0, len(keys), 500):
            chunk = keys[i:i + 500]
            q = ("SELECT r.*, m.score, m.reasons, m.tier, m.excluded FROM roles r"
                 " LEFT JOIN matches m ON m.key=r.key AND m.uid=?"
                 f" WHERE r.key IN ({','.join('?' * len(chunk))})")
            for row in self.db.execute(q, (uid, *chunk)):
                out[row["key"]] = row
        return out

    def top(self, uid: str, min_score: int, limit: int = 50, track: str | None = None) -> list[sqlite3.Row]:
        q = ("SELECT r.*, m.score, m.reasons FROM roles r JOIN matches m ON m.key=r.key"
             " WHERE m.uid=? AND r.active=1 AND m.excluded='' AND m.score>=?")
        args: list = [uid, min_score]
        if track:
            q += " AND r.track=?"
            args.append(track)
        q += " ORDER BY m.score DESC, r.posted_ts DESC LIMIT ?"
        args.append(limit)
        return self.db.execute(q, args).fetchall()

    def match_uids(self) -> list[str]:
        return [r[0] for r in self.db.execute("SELECT DISTINCT uid FROM matches ORDER BY uid")]

    def known_uids(self) -> set[str]:
        """Every user with local state (scores or pushed cards)."""
        return {r[0] for r in self.db.execute("SELECT uid FROM matches UNION SELECT uid FROM pushes")}

    def forget_user(self, uid: str):
        self.db.execute("DELETE FROM matches WHERE uid=?", (uid,))
        self.db.execute("DELETE FROM pushes WHERE uid=?", (uid,))

    # -- per-user pushes ---------------------------------------------------

    def pushes(self, uid: str) -> dict[str, sqlite3.Row]:
        return {r["key"]: r for r in self.db.execute("SELECT * FROM pushes WHERE uid=?", (uid,))}

    def mark_pushed(self, uid: str, key: str, score: int, active: bool, closed: bool, flags: str):
        self.db.execute(
            "INSERT INTO pushes(uid, key, score, active, closed, flags, pushed_at, deleted_at)"
            " VALUES(?,?,?,?,?,?,?,NULL) ON CONFLICT(uid, key) DO UPDATE SET score=excluded.score,"
            " active=excluded.active, closed=excluded.closed, flags=excluded.flags,"
            " pushed_at=excluded.pushed_at, deleted_at=NULL",
            (uid, key, score, int(active), int(closed), flags, now_ts()),
        )

    def touch_push(self, uid: str, key: str):
        self.db.execute("UPDATE pushes SET pushed_at=? WHERE uid=? AND key=?", (now_ts(), uid, key))

    def forget_push(self, uid: str, key: str):
        self.db.execute("DELETE FROM pushes WHERE uid=? AND key=?", (uid, key))

    def tombstone_push(self, uid: str, key: str):
        self.db.execute("UPDATE pushes SET active=0, deleted_at=? WHERE uid=? AND key=?",
                        (now_ts(), uid, key))

    def expire_tombstones(self, older_than_days: float):
        self.db.execute("DELETE FROM pushes WHERE deleted_at IS NOT NULL AND deleted_at < ?",
                        (now_ts() - older_than_days * 86400,))

    # -- meta / runs -------------------------------------------------------

    def meta_get(self, k: str) -> str | None:
        row = self.db.execute("SELECT v FROM meta WHERE k=?", (k,)).fetchone()
        return row["v"] if row else None

    def meta_set(self, k: str, v: str):
        self.db.execute("INSERT INTO meta(k, v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", (k, v))

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
