"""Everything the collector reads from and writes to Offerward's Firestore.

Writes use the Admin SDK (rules don't apply). Per user the collector reads
`users/{uid}/discover/settings` and `…/triage` and writes only `…/feed` (deleting it
once a user is no longer served), plus single-field deletes of expired dismissals in
`…/triage`. Shared docs live in
`feeds/{feedId}` and `system/discover|health`.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone

from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud.firestore_v1.field_path import FieldPath

from .profile import Profile

log = logging.getLogger("collector.firestore")

USERS = "users"
DISCOVER = "discover"
FEEDS = "feeds"
FEED_REQUESTS = "feedRequests"
SYSTEM = "system"
FEED_KEYS = ("company", "ats", "host", "tenant", "site", "token", "region")


class Writer:
    """Batched writes that run store callbacks only after their batch commits."""

    def __init__(self, db):
        self.db = db
        self.batch = db.batch()
        self.ops = 0
        self.total = 0
        self._after: list = []

    def set(self, ref, data: dict, merge: bool = False, after=None):
        self.batch.set(ref, data, merge=merge)
        self._tick(after)

    def update(self, ref, data: dict, after=None):
        self.batch.update(ref, data)
        self._tick(after)

    def delete(self, ref, after=None):
        self.batch.delete(ref)
        self._tick(after)

    def _tick(self, after):
        self.ops += 1
        self.total += 1
        if after:
            self._after.append(after)
        if self.ops >= 400:
            self.flush()

    def flush(self):
        """Commit pending writes. A failed batch is dropped (its callbacks don't run), so the
        next flush doesn't retry it; local state wasn't updated, so the next run redoes it."""
        if not self.ops:
            return
        batch, after = self.batch, self._after
        self.batch, self.ops, self._after = self.db.batch(), 0, []
        batch.commit()
        for fn in after:
            fn()


class FirestoreSync:
    def __init__(self, service_account: str):
        import firebase_admin
        from firebase_admin import credentials, firestore

        if not firebase_admin._apps:
            # No key path: use the runtime's own identity (e.g. a Cloud Run Job's service account)
            cred = credentials.Certificate(service_account) if service_account else None
            firebase_admin.initialize_app(cred)
        self.fs = firestore
        self.db = firestore.client()
        self.w = Writer(self.db)
        self.reads = 0

    @property
    def writes(self) -> int:
        return self.w.total

    def flush(self):
        self.w.flush()

    def _discover(self, uid: str, doc: str):
        return self.db.collection(USERS).document(uid).collection(DISCOVER).document(doc)

    # -- settings ----------------------------------------------------------

    def load_settings(self, families: dict, allowlist: list[str]) -> list[Profile]:
        """Every enabled `users/{uid}/discover/settings`, limited to the allowlist when it's set."""
        allowed = set(allowlist)
        out: list[Profile] = []
        q = self.db.collection_group(DISCOVER).where(filter=FieldFilter("enabled", "==", True))
        for snap in q.stream():
            self.reads += 1
            parent = snap.reference.parent.parent
            if snap.id != "settings" or parent is None or parent.parent.id != USERS:
                continue
            uid = parent.id
            if allowed and uid not in allowed:
                continue
            p = Profile.from_doc(uid, snap.to_dict() or {}, set(families))
            if p.enabled:
                out.append(p)
        return out

    def write_settings(self, uid: str, doc: dict):
        self._discover(uid, "settings").set(doc)

    # -- feed and triage ---------------------------------------------------

    def read_triage(self, uid: str) -> dict:
        snap = self._discover(uid, "triage").get()
        self.reads += 1
        return (snap.to_dict() or {}) if snap.exists else {}

    def write_feed(self, uid: str, doc: dict):
        self.w.set(self._discover(uid, "feed"), doc)

    def delete_feed(self, uid: str, after=None):
        """For users Discover no longer serves; `after` runs once the delete commits."""
        self.w.delete(self._discover(uid, "feed"), after=after)

    def delete_triage_keys(self, uid: str, keys: list[str]):
        # FieldPath quotes keys, so a user-written key can't address another field
        self.w.update(self._discover(uid, "triage"),
                      {FieldPath("cards", k).to_api_repr(): self.fs.DELETE_FIELD for k in keys})

    # -- system docs -------------------------------------------------------

    def write_system_discover(self, families: dict, invite_only: bool, store):
        """Role-family labels for the app's settings page, plus whether Discover is invite-only (no uids)."""
        doc = {"roleFamilies": [{"id": fid, "label": f["label"]} for fid, f in families.items()],
               "inviteOnly": invite_only}
        sig = json.dumps(doc, sort_keys=True)
        if store.meta_get("systemDiscover") == sig:
            return
        self.w.set(self.db.collection(SYSTEM).document("discover"),
                   {**doc, "updatedAt": self.fs.SERVER_TIMESTAMP},
                   after=lambda: store.meta_set("systemDiscover", sig))

    def write_system_health(self, summary: dict):
        self.w.set(self.db.collection(SYSTEM).document("health"),
                   {"lastRun": {"at": self.fs.SERVER_TIMESTAMP, **summary}})

    # -- company feeds -----------------------------------------------------

    def feeds(self) -> dict[str, dict]:
        out = {}
        for snap in self.db.collection(FEEDS).stream():
            self.reads += 1
            out[snap.id] = snap.to_dict() or {}
        return out

    def _new_feed(self, entry: dict, origin: str) -> dict:
        return {
            **{k: entry[k] for k in FEED_KEYS if entry.get(k)},
            "origin": origin,
            "status": "checking",
            "earlyCareerCount": 0,
            "lastError": "",
            "createdAt": self.fs.SERVER_TIMESTAMP,
            "updatedAt": self.fs.SERVER_TIMESTAMP,
        }

    def add_feed(self, fid: str, entry: dict):
        self.w.set(self.db.collection(FEEDS).document(fid), self._new_feed(entry, "user"))

    def mirror_config_feed(self, fid: str, entry: dict):
        """Config watchlist entries get a doc too, so the admin table and autocomplete see them."""
        self.w.set(self.db.collection(FEEDS).document(fid), self._new_feed(entry, "config"))

    def feed_status(self, fid: str, ok: bool, error: str, count: int, current: dict | None):
        """Write only when status, count or error changed from `current` (the doc as read this run)."""
        data = {"status": "ok" if ok else "failing", "earlyCareerCount": count,
                "lastError": "" if ok else error[:300]}
        cur = current or {}
        if current is not None and all(cur.get(k) == v for k, v in data.items()):
            return
        self.w.set(self.db.collection(FEEDS).document(fid),
                   {**data, "updatedAt": self.fs.SERVER_TIMESTAMP}, merge=True)

    # -- feed requests -----------------------------------------------------

    def pending_feed_requests(self) -> list[tuple]:
        """(ref, data, uid) for every pending `users/{uid}/feedRequests/{id}`."""
        out = []
        q = self.db.collection_group(FEED_REQUESTS).where(filter=FieldFilter("status", "==", "pending"))
        for snap in q.stream():
            self.reads += 1
            parent = snap.reference.parent.parent
            if parent is None or parent.parent.id != USERS:
                continue
            out.append((snap.reference, snap.to_dict() or {}, parent.id))
        return out

    def count_added_feeds(self, uid: str) -> int:
        n = 0
        q = (self.db.collection(USERS).document(uid).collection(FEED_REQUESTS)
             .where(filter=FieldFilter("status", "==", "added")))
        for snap in q.stream():
            self.reads += 1
            if not (snap.to_dict() or {}).get("duplicate"):
                n += 1
        return n

    def resolve_feed_request(self, ref, status: str, reason: str, feed_id: str = "", duplicate: bool = False):
        self.w.set(ref, {"status": status, "reason": reason, "feedId": feed_id, "duplicate": duplicate,
                         "processedAt": self.fs.SERVER_TIMESTAMP}, merge=True)

    # -- jobs --------------------------------------------------------------

    def due_followups(self, uid: str, days: int) -> list[dict]:
        """Applied jobs older than `days` with no follow-up logged yet.

        One equality filter only (no composite index); the date checks happen here.
        """
        out = []
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=days)
        q = (self.db.collection(USERS).document(uid).collection("jobs")
             .where(filter=FieldFilter("status", "==", "applied")))
        for snap in q.stream():
            self.reads += 1
            j = snap.to_dict() or {}
            applied = j.get("appliedAt")
            if not isinstance(applied, datetime) or j.get("followedUpAt") is not None or applied > cutoff:
                continue
            out.append({"company": j.get("company") or "", "title": j.get("title") or "",
                        "days": (now - applied).days, "url": j.get("url") or ""})
        return sorted(out, key=lambda x: -x["days"])
