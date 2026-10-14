"""Everything the collector reads from and writes to Traction's Firestore.

Writes use the Admin SDK (rules don't apply). Users own two fields on their
`discoveries` docs, `status` and `jobId` (plus `statusChangedAt`), which are
never written here except when creating a doc.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone

from .profile import Profile

log = logging.getLogger("collector.firestore")

DISCOVERIES = "discoveries"
PROFILES = "discoveryProfiles"
RUNS = "collectorRuns"
FEEDS = "companyFeeds"
FEED_REQUESTS = "feedRequests"
META = "collectorMeta"


def _ts(x: float | None):
    return datetime.fromtimestamp(x, tz=timezone.utc) if x else None


def flags_for(row, screen: dict | None) -> dict:
    screen = screen or {}
    hints = set(json.loads(row["hints"] or "[]"))
    return {
        "citizen": bool(screen.get("citizen")) or "citizen" in hints,
        "exportControl": bool(screen.get("export")),
        "noSponsor": bool(screen.get("no_sponsor")) or "no_sponsor" in hints,
        "sponsorFriendly": bool(screen.get("sponsor")) or "sponsor" in hints,
        "screened": screen.get("status") == "screened",
    }


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
        if self.ops:
            self.batch.commit()
            for fn in self._after:
                fn()
            self.batch = self.db.batch()
            self.ops = 0
            self._after = []


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

    # -- profiles ----------------------------------------------------------

    def load_profiles(self, families: dict, allowlist: list[str]) -> list[Profile]:
        allowed = set(allowlist)
        out: list[Profile] = []
        for snap in self.db.collection(PROFILES).where("enabled", "==", True).stream():
            self.reads += 1
            if allowed and snap.id not in allowed:
                continue
            p = Profile.from_doc(snap.id, snap.to_dict() or {}, set(families))
            if p.enabled:
                out.append(p)
        users = self.db.collection("users")
        refs = [users.document(p.uid) for p in out]
        plans = {}
        for i in range(0, len(refs), 100):
            for snap in self.db.get_all(refs[i:i + 100]):
                self.reads += 1
                plans[snap.id] = ((snap.to_dict() or {}).get("plan") if snap.exists else None)
        for p in out:
            p.plan = "pro" if plans.get(p.uid) == "Pro" else "free"
        return out

    def existing_profiles(self, uids: set[str]) -> set[str]:
        refs = [self.db.collection(PROFILES).document(u) for u in sorted(uids)]
        out = set()
        for i in range(0, len(refs), 100):
            for snap in self.db.get_all(refs[i:i + 100]):
                self.reads += 1
                if snap.exists:
                    out.add(snap.id)
        return out

    def purge_user(self, uid: str, store) -> int:
        """The user deleted their Discover settings: remove everything Discover kept for them."""
        n = 0
        for col in (DISCOVERIES, FEED_REQUESTS):
            for snap in self.db.collection(col).where("userId", "==", uid).stream():
                self.reads += 1
                self.w.delete(snap.reference)
                n += 1
        self.w.delete(self.db.collection(RUNS).document(uid), after=lambda: store.forget_user(uid))
        self.w.flush()
        return n + 1

    def write_profile(self, p: Profile):
        self.db.collection(PROFILES).document(p.uid).set(
            {**p.to_doc(), "updatedAt": self.fs.SERVER_TIMESTAMP})

    # -- meta --------------------------------------------------------------

    def write_role_families(self, families: dict, invite_only: bool, store):
        """Labels for the app's settings page, plus whether Discover is invite-only (no uids)."""
        doc = {"families": [{"id": fid, "label": f["label"]} for fid, f in families.items()],
               "inviteOnly": invite_only}
        sig = json.dumps(doc, sort_keys=True)
        if store.meta_get("roleFamilies") == sig:
            return
        self.w.set(self.db.collection(META).document("roleFamilies"),
                   {**doc, "updatedAt": self.fs.SERVER_TIMESTAMP},
                   after=lambda: store.meta_set("roleFamilies", sig))

    # -- company feeds -----------------------------------------------------

    def feeds(self) -> dict[str, dict]:
        out = {}
        for snap in self.db.collection(FEEDS).stream():
            self.reads += 1
            out[snap.id] = snap.to_dict() or {}
        return out

    def add_feed(self, fid: str, entry: dict):
        keep = {k: entry[k] for k in ("company", "ats", "host", "tenant", "site", "token", "region") if entry.get(k)}
        self.w.set(self.db.collection(FEEDS).document(fid), {
            **keep,
            "origin": "user",
            "status": "pending",
            "earlyCareerCount": int(entry.get("earlyCareerCount") or 0),
            "createdAt": self.fs.SERVER_TIMESTAMP,
            "lastCheckedAt": self.fs.SERVER_TIMESTAMP,
        })

    def mirror_config_feed(self, fid: str, entry: dict):
        keep = {k: entry[k] for k in ("company", "ats", "host", "tenant", "site", "token", "region") if entry.get(k)}
        self.w.set(self.db.collection(FEEDS).document(fid), {**keep, "origin": "config"}, merge=True)

    def feed_status(self, fid: str, ok: bool, error: str, count: int):
        data = {"status": "ok" if ok else "failed", "lastCheckedAt": self.fs.SERVER_TIMESTAMP,
                "earlyCareerCount": count, "lastError": "" if ok else error[:300]}
        self.w.set(self.db.collection(FEEDS).document(fid), data, merge=True)

    def pending_feed_requests(self) -> list[tuple[str, dict]]:
        out = []
        for snap in self.db.collection(FEED_REQUESTS).where("status", "==", "pending").stream():
            self.reads += 1
            out.append((snap.id, snap.to_dict() or {}))
        return out

    def count_added_feeds(self, uid: str) -> int:
        n = 0
        q = (self.db.collection(FEED_REQUESTS).where("userId", "==", uid)
             .where("status", "==", "added"))
        for snap in q.stream():
            self.reads += 1
            if not (snap.to_dict() or {}).get("duplicate"):
                n += 1
        return n

    def resolve_feed_request(self, req_id: str, status: str, reason: str, fid: str = "",
                             duplicate: bool = False):
        data = {"status": status, "reason": reason, "processedAt": self.fs.SERVER_TIMESTAMP}
        if fid:
            data["feedId"] = fid
        if duplicate:
            data["duplicate"] = True
        self.w.set(self.db.collection(FEED_REQUESTS).document(req_id), data, merge=True)

    # -- discoveries -------------------------------------------------------

    def triaged(self, uid: str) -> dict[str, dict]:
        """roleKey -> {status, changedAt} for this user's saved and dismissed docs."""
        out = {}
        col = self.db.collection(DISCOVERIES)
        for status in ("saved", "dismissed"):
            for snap in col.where("userId", "==", uid).where("status", "==", status).stream():
                self.reads += 1
                d = snap.to_dict() or {}
                out[d.get("roleKey") or snap.id.split("_", 1)[-1]] = {
                    "status": status,
                    "changedAt": d.get("statusChangedAt") or d.get("updatedAt"),
                }
        return out

    def _fields(self, uid: str, row, flags: dict, active: bool, screen: dict | None) -> dict:
        screen = screen or {}
        return {
            "userId": uid,
            "roleKey": row["key"],
            "company": row["company"],
            "title": row["title"],
            "location": row["location"] or "",
            "url": row["url"] or "",
            "track": row["track"],
            "terms": json.loads(row["terms"] or "[]"),
            "category": row["category"] or "",
            "sources": json.loads(row["sources"] or "[]"),
            "fitScore": int(row["score"] or 0),
            "fitReasons": json.loads(row["reasons"] or "[]"),
            "roleTier": row["tier"] or "",
            "flags": flags,
            "flagSnippets": screen.get("snippets") or [],
            "gradWindow": screen.get("grad_window") or "",
            "postedAt": _ts(row["posted_ts"]),
            "firstSeenAt": _ts(row["first_seen"]),
            "lastSeenAt": _ts(row["last_seen"]),
            "active": active,
            "closed": not row["active"],
            "updatedAt": self.fs.SERVER_TIMESTAMP,
        }

    def sync_user(self, store, prof: Profile, st: dict, screens: dict[str, dict | None],
                  new_role_keys: set[str]) -> dict:
        """Bring one user's discoveries in line with their current matches."""
        uid = prof.uid
        col = self.db.collection(DISCOVERIES)
        cap = st["live_cap"]["pro" if prof.plan == "pro" else "free"]
        delta = st["min_score_delta"]
        pushes = store.pushes(uid)
        triaged = self.triaged(uid)

        # Live = the best untriaged open roles above the user's bar, up to the plan cap.
        # Saved/dismissed roles keep their docs current but don't use up the cap.
        live: set[str] = set()
        for r in store.candidates(uid, prof.min_score):
            k = r["key"]
            if k in triaged or (k in pushes and pushes[k]["deleted_at"]):
                continue
            live.add(k)
            if len(live) >= cap:
                break

        keys = live | {k for k, p in pushes.items() if not p["deleted_at"]}
        rows = store.match_rows(uid, sorted(keys))
        creates, updates = [], []
        for k in keys:
            row = rows.get(k)
            if row is None or row["score"] is None:
                continue
            screen = screens.get(row["url"])
            flags = flags_for(row, screen)
            flags_sig = json.dumps(flags, sort_keys=True)
            passes = bool(row["active"]) and not row["excluded"] and row["score"] >= prof.min_score
            active = k in live or (k in triaged and passes)
            p = pushes.get(k)
            if p is None:
                if active:
                    creates.append((row, flags, flags_sig, screen))
                continue
            if (abs(row["score"] - p["score"]) >= delta or bool(p["active"]) != active
                    or p["flags"] != flags_sig or bool(p["closed"]) != (not row["active"])):
                updates.append((row, flags, flags_sig, screen, active))

        # A create may hit an existing doc when local state was lost (fresh container):
        # treat those as updates so the user's status and jobId survive.
        existing: set[str] = set()
        refs = [col.document(f"{uid}_{r['key']}") for r, *_ in creates]
        for i in range(0, len(refs), 100):
            for snap in self.db.get_all(refs[i:i + 100]):
                self.reads += 1
                if snap.exists:
                    existing.add(snap.id)

        created, notify_rows = 0, []

        def after_push(key, score, active, closed, sig):
            return lambda: store.mark_pushed(uid, key, score, active, closed, sig)

        for row, flags, sig, screen in creates:
            ref = col.document(f"{uid}_{row['key']}")
            fields = self._fields(uid, row, flags, True, screen)
            cb = after_push(row["key"], row["score"], True, not row["active"], sig)
            if ref.id in existing:
                self.w.set(ref, fields, merge=True, after=cb)
                continue
            self.w.set(ref, {**fields, "status": "new", "createdAt": self.fs.SERVER_TIMESTAMP}, after=cb)
            created += 1
            if row["key"] in new_role_keys and row["score"] >= prof.notify_min_score:
                notify_rows.append(row)
        for row, flags, sig, screen, active in updates:
            ref = col.document(f"{uid}_{row['key']}")
            self.w.set(ref, self._fields(uid, row, flags, active, screen), merge=True,
                       after=after_push(row["key"], row["score"], active, not row["active"], sig))

        pruned = self._prune(store, uid, pushes, triaged, st)
        self.w.flush()
        return {
            "live": len(live),
            "created": created,
            "updated": len(updates),
            "pruned": pruned,
            "cap": cap,
            "notify": sorted(notify_rows, key=lambda r: -r["score"]),
        }

    def _prune(self, store, uid: str, pushes: dict, triaged: dict, st: dict) -> int:
        col = self.db.collection(DISCOVERIES)
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=st["prune_after_days"])
        cutoff_ts = cutoff.timestamp()
        pruned = 0
        for k, t in triaged.items():
            changed = t["changedAt"]
            if t["status"] != "dismissed" or not changed or changed > cutoff:
                continue
            ref = col.document(f"{uid}_{k}")
            p = pushes.get(k)

            def tomb(k=k, p=p):
                if p is None:
                    store.mark_pushed(uid, k, 0, False, True, "{}")
                store.tombstone_push(uid, k)

            self.w.delete(ref, after=tomb)
            pruned += 1
        for k, p in pushes.items():
            if p["deleted_at"] or p["active"] or p["pushed_at"] > cutoff_ts:
                continue
            status = (triaged.get(k) or {}).get("status")
            if status == "saved":
                store.touch_push(uid, k)  # saved docs stay; look again in prune_after_days
            elif status == "dismissed":
                continue  # handled above once the dismissal itself is old enough
            else:
                self.w.delete(col.document(f"{uid}_{k}"), after=lambda k=k: store.forget_push(uid, k))
                pruned += 1
        return pruned

    # -- runs --------------------------------------------------------------

    def write_user_run(self, uid: str, summary: dict):
        self.w.set(self.db.collection(RUNS).document(uid),
                   {"userId": uid, "lastRunAt": self.fs.SERVER_TIMESTAMP, **summary})

    def write_global_run(self, summary: dict):
        self.w.set(self.db.collection(RUNS).document("_global"),
                   {"lastRunAt": self.fs.SERVER_TIMESTAMP, **summary})

    def due_followups(self, uid: str, days: int) -> list[dict]:
        """Applied jobs older than `days` with no follow-up logged yet."""
        out = []
        now = datetime.now(timezone.utc)
        for snap in self.db.collection("jobs").where("userId", "==", uid).stream():
            self.reads += 1
            j = snap.to_dict() or {}
            if j.get("status") != "Applied" or j.get("followedUpAt"):
                continue
            applied = None
            for fmt in ("%b %d, %Y", "%B %d, %Y", "%Y-%m-%d"):
                try:
                    applied = datetime.strptime(j.get("dateApplied") or "", fmt).replace(tzinfo=timezone.utc)
                    break
                except ValueError:
                    continue
            if applied and (now - applied).days >= days:
                out.append({"company": j.get("company"), "title": j.get("title"),
                            "days": (now - applied).days, "link": j.get("link")})
        return sorted(out, key=lambda x: -x["days"])
