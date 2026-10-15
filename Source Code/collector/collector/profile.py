"""Applicant profiles: what one user wants Discover to find.

Profiles come from Firestore `users/{uid}/discover/settings` (written by the app's
Tune matches page) or, for local testing and the one-off import, from YAML.
Everything is validated and size-capped here, whatever the source: rules
validate client writes too, but the collector never trusts a document it reads.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field

MAX_KEYWORDS = 50
MAX_COMPANIES = 100
MAX_TERMS = 12
MAX_TEXT = 80

TERM_RE = re.compile(r"^(Spring|Summer|Fall|Winter) (20\d\d)$", re.I)
GRAD_RE = re.compile(r"^(20\d\d)-(0[1-9]|1[0-2])$")
WEBHOOK_RES = (
    re.compile(r"^https://(?:(?:ptb|canary)\.)?discord(?:app)?\.com/api/webhooks/\d+/[\w-]+$"),
    re.compile(r"^https://ntfy\.sh/[\w-]{1,64}$"),
)


def valid_webhook(url: str) -> bool:
    """Only Discord webhooks and ntfy.sh topics: the server never posts to arbitrary URLs."""
    return any(rx.match(url or "") for rx in WEBHOOK_RES)


def _texts(v, cap: int) -> list[str]:
    out: list[str] = []
    for x in v if isinstance(v, list) else []:
        if isinstance(x, (str, int, float)) and not isinstance(x, bool):
            s = re.sub(r"\s+", " ", str(x)).strip()[:MAX_TEXT]
            if s and s.lower() not in (o.lower() for o in out):
                out.append(s)
        if len(out) >= cap:
            break
    return out


def _bool(v, default: bool) -> bool:
    return v if isinstance(v, bool) else default


def _int(v, lo: int, hi: int, default: int) -> int:
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return default
    return max(lo, min(hi, int(v)))


def _term(t: str) -> str | None:
    m = TERM_RE.match(t.strip())
    return f"{m.group(1).title()} {m.group(2)}" if m else None


@dataclass
class Profile:
    uid: str
    enabled: bool = True
    tracks: list[str] = field(default_factory=lambda: ["intern", "newgrad"])
    graduation: str = ""  # "YYYY-MM" or ""
    terms_available: list[str] = field(default_factory=list)
    terms_part_time: list[str] = field(default_factory=list)
    needs_sponsorship: bool = False
    locations: list[str] = field(default_factory=list)
    remote_ok: bool = True
    role_families: list[str] = field(default_factory=list)
    include_keywords: list[str] = field(default_factory=list)
    exclude_keywords: list[str] = field(default_factory=list)
    warm: list[str] = field(default_factory=list)
    target: list[str] = field(default_factory=list)
    hidden: list[str] = field(default_factory=list)
    min_score: int = 60
    webhook: str = ""
    notify_min_score: int = 70

    @property
    def grad_ym(self) -> tuple[int, int] | None:
        m = GRAD_RE.match(self.graduation or "")
        return (int(m.group(1)), int(m.group(2))) if m else None

    # -- Firestore ---------------------------------------------------------

    @classmethod
    def from_doc(cls, uid: str, d: dict, families: set[str]) -> "Profile":
        d = d if isinstance(d, dict) else {}
        terms = d.get("terms") if isinstance(d.get("terms"), dict) else {}
        locs = d.get("locations") if isinstance(d.get("locations"), dict) else {}
        cos = d.get("companies") if isinstance(d.get("companies"), dict) else {}
        alerts = d.get("alerts") if isinstance(d.get("alerts"), dict) else {}
        tracks = [t for t in _texts(d.get("tracks"), 2) if t in ("intern", "newgrad")]
        grad = d.get("graduation") if isinstance(d.get("graduation"), str) else ""
        webhook = alerts.get("webhook") if isinstance(alerts.get("webhook"), str) else ""
        return cls(
            uid=uid,
            enabled=_bool(d.get("enabled"), False),
            tracks=tracks or ["intern", "newgrad"],
            graduation=grad if GRAD_RE.match(grad) else "",
            terms_available=[x for x in map(_term, _texts(terms.get("available"), MAX_TERMS)) if x],
            terms_part_time=[x for x in map(_term, _texts(terms.get("partTime"), MAX_TERMS)) if x],
            needs_sponsorship=_bool(d.get("needsSponsorship"), False),
            locations=_texts(locs.get("preferred"), MAX_KEYWORDS),
            remote_ok=_bool(locs.get("remoteOk"), True),
            role_families=[f for f in _texts(d.get("roleFamilies"), len(families)) if f in families],
            include_keywords=_texts(d.get("includeKeywords"), MAX_KEYWORDS),
            exclude_keywords=_texts(d.get("excludeKeywords"), MAX_KEYWORDS),
            warm=_texts(cos.get("warm"), MAX_COMPANIES),
            target=_texts(cos.get("target"), MAX_COMPANIES),
            hidden=_texts(cos.get("hidden"), MAX_COMPANIES),
            min_score=_int(d.get("minScore"), 40, 90, 60),
            webhook=webhook if valid_webhook(webhook) else "",
            notify_min_score=_int(alerts.get("minScore"), 40, 100, 70),
        )

    def to_doc(self) -> dict:
        """The discover/settings document shape (without updatedAt)."""
        return {
            "enabled": self.enabled,
            "tracks": self.tracks,
            "graduation": self.graduation,
            "terms": {"available": self.terms_available, "partTime": self.terms_part_time},
            "needsSponsorship": self.needs_sponsorship,
            "locations": {"preferred": self.locations, "remoteOk": self.remote_ok},
            "roleFamilies": self.role_families,
            "includeKeywords": self.include_keywords,
            "excludeKeywords": self.exclude_keywords,
            "companies": {"warm": self.warm, "target": self.target, "hidden": self.hidden},
            "minScore": self.min_score,
            "alerts": {"webhook": self.webhook, "minScore": self.notify_min_score},
        }

    # -- YAML --------------------------------------------------------------

    @classmethod
    def from_yaml(cls, uid: str, data: dict, families: dict[str, dict]) -> "Profile":
        """Accepts either the original single-user `profile:` block or a document in
        the Firestore shape (camelCase keys). Unknown keys are ignored."""
        p = data.get("profile", data) if isinstance(data, dict) else {}
        if "roleFamilies" in p or "needsSponsorship" in p:
            return cls.from_doc(uid, {"enabled": True, **p}, set(families))
        cos = p.get("companies") or {}
        fam = [f for f in (p.get("role_families") or []) if f in families]
        if not fam:
            fam = infer_families((p.get("roles") or {}).get("core") or [], families)
        grad = str(p.get("graduation") or "")
        doc = {
            "enabled": True,
            "tracks": p.get("tracks") or ["intern", "newgrad"],
            "graduation": grad,
            "terms": {"available": p.get("internship_terms") or [],
                      "partTime": p.get("part_time_terms") or []},
            "needsSponsorship": bool(p.get("needs_sponsorship", False)),
            "locations": {"preferred": p.get("home_region") or [],
                          "remoteOk": p.get("remote_ok", True)},
            "roleFamilies": fam,
            "includeKeywords": p.get("include_keywords") or [],
            "excludeKeywords": p.get("exclude_keywords") or [],
            "companies": {"warm": cos.get("warm") or [], "target": cos.get("target") or [],
                          "hidden": cos.get("hidden") or cos.get("blocked") or []},  # `blocked`: old name
            "minScore": p.get("min_score", 60),
            "alerts": {"webhook": p.get("webhook", ""), "minScore": p.get("notify_min_score", 70)},
        }
        return cls.from_doc(uid, doc, set(families))

    def summary(self) -> dict:
        d = asdict(self)
        d["webhook"] = bool(self.webhook)
        return d


def infer_families(core_terms: list[str], families: dict[str, dict]) -> list[str]:
    """Pick the families whose core lists overlap most with an old-style `roles.core` list."""
    terms = {t.lower() for t in core_terms}
    out = []
    for fid, f in families.items():
        core = {t.lower() for t in f["core"]}
        if core and len(core & terms) >= max(1, len(core) // 3):
            out.append(fid)
    return out
