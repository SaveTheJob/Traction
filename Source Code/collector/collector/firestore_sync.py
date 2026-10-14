"""Push scored roles into Traction's Firestore as `discoveries` documents.

Document id: "{userId}_{roleKey}". The collector owns every field except
`status` and `jobId`, which belong to the user (set from the Discover page),
so existing documents are updated without touching those two.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

log = logging.getLogger("collector.firestore")

COLLECTION = "discoveries"
RUNS_COLLECTION = "collectorRuns"


def _ts(x: float | None):
    return datetime.fromtimestamp(x, tz=timezone.utc) if x else None


class FirestoreSync:
    def __init__(self, service_account: str, user_id: str):
        import firebase_admin
        from firebase_admin import credentials, firestore

        if not firebase_admin._apps:
            firebase_admin.initialize_app(credentials.Certificate(service_account))
        self.fs = firestore
        self.db = firestore.client()
        self.uid = user_id

    def _doc_fields(self, row, screen: dict | None) -> dict:
        screen = screen or {}
        hints = set(json.loads(row["hints"] or "[]"))
        flags = {
            "citizen": bool(screen.get("citizen")) or "citizen" in hints,
            "exportControl": bool(screen.get("export")),
            "noSponsor": bool(screen.get("no_sponsor")) or "no_sponsor" in hints,
            "sponsorFriendly": bool(screen.get("sponsor")) or "sponsor" in hints,
            "screened": screen.get("status") == "screened",
        }
        return {
            "userId": self.uid,
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
            "flags": flags,
            "flagSnippets": screen.get("snippets") or [],
            "gradWindow": screen.get("grad_window") or "",
            "postedAt": _ts(row["posted_ts"]),
            "firstSeenAt": _ts(row["first_seen"]),
            "lastSeenAt": _ts(row["last_seen"]),
            "active": bool(row["active"]) and not row["excluded"],
            "updatedAt": self.fs.SERVER_TIMESTAMP,
        }

    def push(self, rows, screens_by_url: dict[str, dict], min_score: int,
             max_new: int) -> tuple[int, int, list]:
        """Returns (created, updated, pushed_rows)."""
        col = self.db.collection(COLLECTION)
        refs = {r["key"]: col.document(f"{self.uid}_{r['key']}") for r in rows}
        existing: set[str] = set()
        ref_list = list(refs.values())
        for i in range(0, len(ref_list), 100):
            for snap in self.db.get_all(ref_list[i:i + 100]):
                if snap.exists:
                    existing.add(snap.id)

        created = updated = 0
        pushed = []
        batch = self.db.batch()
        ops = 0
        # Highest scores first so the per-run cap keeps the best new roles.
        for r in sorted(rows, key=lambda r: -(r["score"] or 0)):
            ref = refs[r["key"]]
            fields = self._doc_fields(r, screens_by_url.get(r["url"]))
            is_live = fields["active"] and fields["fitScore"] >= min_score
            if ref.id in existing:
                if not is_live:
                    fields["active"] = False
                batch.update(ref, fields)
                updated += 1
            else:
                if not is_live:
                    continue  # never create docs for roles we wouldn't show
                if created >= max_new:
                    continue
                fields["status"] = "new"
                fields["createdAt"] = self.fs.SERVER_TIMESTAMP
                batch.set(ref, fields)
                created += 1
            pushed.append((r, is_live))
            ops += 1
            if ops >= 400:
                batch.commit()
                batch = self.db.batch()
                ops = 0
        if ops:
            batch.commit()
        return created, updated, pushed

    def write_run(self, summary: dict):
        self.db.collection(RUNS_COLLECTION).document(self.uid).set({
            "userId": self.uid,
            "lastRunAt": self.fs.SERVER_TIMESTAMP,
            **summary,
        })

    def due_followups(self, days: int) -> list[dict]:
        """Applied jobs older than `days` with no follow-up logged yet."""
        out = []
        q = self.db.collection("jobs").where("userId", "==", self.uid)
        now = datetime.now(timezone.utc)
        for snap in q.stream():
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
