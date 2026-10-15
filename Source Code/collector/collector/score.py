"""Fit scoring for one applicant profile.

Score is 0 to 100 and every point comes with a human-readable reason, so the
Discover page can show *why* a role ranked where it did.

    role fit      up to 40   (title + category vs. the role families the user picked)
    timing        up to 20   (internship term or new-grad start vs. their plan)
    location      up to 12   (preferred locations, remote, other US)
    company       up to 16   (warm leads, target list, cap-exempt sponsors)
    recency       up to 12
    adjustments   sponsorship signals and defense contractors (only for users who
                  need sponsorship), degree level, co-op terms

Config lists (role families, avoid, cap-exempt, defense) are trusted regex
fragments. Everything the user typed is escaped and matched as literal text.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

from .models import Posting, Screen
from .profile import Profile
from .util import US_STATE_NAMES, US_STATES, days_ago

TIER_POINTS = {"core": 40, "strong": 30, "ok": 16}
CATEGORY_POINTS = {"core": 34, "strong": 26, "ok": 14}

_STATE_BY_CODE = dict(zip(US_STATES, US_STATE_NAMES.split("|") + ["District of Columbia"]))
_CODE_BY_STATE = {v.lower(): k for k, v in _STATE_BY_CODE.items()}
_MONTHS = {m: i for i, m in enumerate(
    "jan feb mar apr may jun jul aug sep oct nov dec".split(), start=1)}
_SEASON_MONTH = {"spring": 5, "summer": 8, "fall": 12, "autumn": 12, "winter": 12}
_GRAD_DATE_RE = re.compile(
    r"\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|"
    r"sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?,?\s+(20\d\d)\b"
    r"|\b(spring|summer|fall|autumn|winter)\s+(?:of\s+)?(20\d\d)\b",
    re.I,
)


def _rx(fragments: list[str]) -> re.Pattern | None:
    fragments = [f for f in (fragments or []) if f]
    if not fragments:
        return None
    return re.compile(r"(?<!\w)(" + "|".join(fragments) + r")(?!\w)", re.I)


def _lit(words: list[str]) -> re.Pattern | None:
    """Regex for user-supplied literal text (escaped: no regex injection or ReDoS)."""
    return _rx([re.escape(w) for w in words or [] if w.strip()])


def _location_rx(prefs: list[str]) -> tuple[re.Pattern | None, re.Pattern | None]:
    """'Phoenix, AZ' -> places [Phoenix, Arizona] + state codes [AZ]. State names and codes
    expand to each other. Codes match case-sensitively so "IN" doesn't match "in"."""
    places: list[str] = []
    codes: list[str] = []
    for pref in prefs:
        for part in (p.strip() for p in pref.split(",")):
            if not part:
                continue
            if part.upper() in _STATE_BY_CODE:
                codes.append(part.upper())
                places.append(_STATE_BY_CODE[part.upper()])
            else:
                places.append(part)
                if part.lower() in _CODE_BY_STATE:
                    codes.append(_CODE_BY_STATE[part.lower()])
    codes_rx = re.compile(r"(?<![A-Za-z])(" + "|".join(dict.fromkeys(codes)) + r")(?![A-Za-z])") if codes else None
    return _lit(list(dict.fromkeys(places))), codes_rx


def _month_name(ym: tuple[int, int]) -> str:
    return date(ym[0], ym[1], 1).strftime("%b %Y")


def grad_mentions(text: str) -> list[tuple[int, int, bool]]:
    """(year, month, is_bare_year) for each date mentioned in a graduation-window sentence."""
    out = []
    taken: list[tuple[int, int]] = []
    for m in _GRAD_DATE_RE.finditer(text):
        if m.group(1):
            out.append((int(m.group(2)), _MONTHS[m.group(1)[:3].lower()], False))
        else:
            out.append((int(m.group(4)), _SEASON_MONTH[m.group(3).lower()], False))
        taken.append(m.span())
    for m in re.finditer(r"\b20\d\d\b", text):
        if not any(a <= m.start() < b for a, b in taken):
            out.append((int(m.group(0)), 12, True))
    return out


@dataclass
class Result:
    score: int
    reasons: list[str]
    excluded: str = ""  # non-empty means "don't show at all", with why
    tier: str = ""  # "core" | "strong" | "ok" | "" (which tier the role matched)


class Scorer:
    def __init__(self, profile: Profile, cfg: dict, today: date | None = None):
        self.p = profile
        self.today = today or date.today()
        fams = cfg["role_families"]
        picked = [fams[f] for f in profile.role_families if f in fams]
        self.title_rx = {t: _rx([x for f in picked for x in f[t]]) for t in TIER_POINTS}
        self.cat_terms = {t: [c for f in picked for c in f["categories"][t]] for t in TIER_POINTS}
        family_terms = {x.lower() for f in picked for t in TIER_POINTS for x in f[t]}
        self.avoid = _rx([a for a in cfg.get("avoid") or [] if a.lower() not in family_terms])
        self.include = _lit(profile.include_keywords)
        self.exclude = _lit(profile.exclude_keywords)
        self.warm = _lit(profile.warm)
        self.target = _lit(profile.target)
        self.hidden = _lit(profile.hidden)
        cos = cfg.get("companies") or {}
        self.cap_exempt = _rx(cos.get("cap_exempt"))
        self.defense = _rx(cos.get("defense"))
        self.home, self.home_codes = _location_rx(profile.locations)
        self.tracks = set(profile.tracks)
        self.intern_terms = {t.lower() for t in profile.terms_available}
        self.part_time_terms = {t.lower() for t in profile.terms_part_time}
        self.grad = profile.grad_ym
        self.newgrad_open = None
        if self.grad:
            y, m = self.grad[0], self.grad[1] - 7
            if m < 1:
                y, m = y - 1, m + 12
            self.newgrad_open = date(y, m, 1)

    # -- pieces ------------------------------------------------------------

    def _role(self, post: Posting, why: list[str]) -> tuple[int, str]:
        t = post.title
        cat = (post.category or "").lower()
        if self.exclude and (m := self.exclude.search(t)):
            return -1, f"Matches a keyword you excluded: {m.group(0)}"
        if self.include and (m := self.include.search(t)):
            why.append(f"Matches your keyword: {m.group(0)}")
            return 40, "core"
        core = self.title_rx["core"]
        if self.avoid and self.avoid.search(t) and not (core and core.search(t)):
            why.append("Outside your target roles")
            return 0, ""
        for tier, label in (("core", "Core role match"), ("strong", "Strong role match"),
                            ("ok", "Adjacent role")):
            rx = self.title_rx[tier]
            if rx and (m := rx.search(t)):
                why.append(f"{label}: {m.group(0)}")
                return TIER_POINTS[tier], tier
            if cat and any(c in cat for c in self.cat_terms[tier]):
                why.append(f"{post.category} category")
                return CATEGORY_POINTS[tier], tier
        return 0, ""

    def _timing(self, post: Posting, screen: Screen, why: list[str]) -> tuple[int, str]:
        terms = {t.lower() for t in post.terms}
        title = post.title.lower()
        if post.track == "intern":
            if terms & self.intern_terms:
                why.append(f"{', '.join(sorted(t.title() for t in terms & self.intern_terms))} fits your plan")
                return 20, ""
            if terms & self.part_time_terms:
                why.append(f"{', '.join(sorted(t.title() for t in terms & self.part_time_terms))}: "
                           "you're available part-time only")
                return 8, ""
            if terms:
                return 0, f"Term not in your plan ({', '.join(sorted(t.title() for t in terms))})"
            if re.search(r"\bco-?op\b", title):
                why.append("Co-op without a stated term: check dates")
                return 4, ""
            why.append("Term not stated: check dates")
            return 10, ""
        # new grad
        gw = screen.grad_window or ""
        if gw and self.grad:
            mentions = grad_mentions(gw)
            ok = any((y, m) >= self.grad if not bare else y > self.grad[0] for y, m, bare in mentions)
            bad = any((y, m) < self.grad if not bare else y < self.grad[0] for y, m, bare in mentions)
            if ok:
                why.append(f"Graduation window matches {_month_name(self.grad)}")
                return 20, ""
            if bad:
                why.append("Graduation window looks earlier than yours")
                return 2, ""
        if self.newgrad_open and self.today < self.newgrad_open:
            why.append("New-grad role: most current postings start before you graduate")
            return 5, ""
        why.append("New-grad role")
        return 15, ""

    def _location(self, post: Posting, why: list[str]) -> int:
        loc = post.location or ""
        if (self.home and self.home.search(loc)) or (self.home_codes and self.home_codes.search(loc)):
            why.append("In your preferred location")
            return 12
        if self.p.remote_ok and re.search(r"\bremote\b", loc, re.I):
            why.append("Remote")
            return 9
        return 5

    def _company(self, post: Posting, why: list[str]) -> int:
        c = post.company
        if self.warm and self.warm.search(c):
            why.append("Warm lead (you have a contact)")
            return 16
        if self.p.needs_sponsorship and self.cap_exempt and self.cap_exempt.search(c):
            why.append("Cap-exempt employer (H-1B outside the lottery)")
            return 14
        if self.target and self.target.search(c):
            why.append("On your target list")
            return 11
        return 0

    @staticmethod
    def _recency(post: Posting, why: list[str]) -> int:
        d = days_ago(post.posted_ts)
        if d is None:
            return 3
        if d <= 1:
            why.append("Posted in the last day")
            return 12
        if d <= 3:
            why.append(f"Posted {d} days ago")
            return 10
        if d <= 7:
            return 7
        if d <= 14:
            return 4
        if d <= 30:
            return 2
        return 0

    # -- main --------------------------------------------------------------

    def score(self, post: Posting, screen: Screen) -> Result:
        why: list[str] = []

        if post.track not in self.tracks:
            return Result(0, [], "Not a track you picked")
        if self.hidden and self.hidden.search(post.company):
            return Result(0, [], "Company you hid")
        if post.degrees and not any("bachelor" in d.lower() for d in post.degrees):
            return Result(0, [], "Graduate degree required")
        if re.search(r"\b(phd|ph\.d|master'?s|mba|doctoral)\b", post.title, re.I) and not re.search(
                r"\b(bachelor|bs|undergrad)", post.title, re.I):
            return Result(0, [], "Graduate degree required")

        role, tier = self._role(post, why)
        if role < 0:
            return Result(0, [], tier)
        if role == 0:
            return Result(0, why, "Not a target role")
        timing, excl = self._timing(post, screen, why)
        if excl:
            return Result(0, why, excl)
        total = role + timing + self._location(post, why) + self._company(post, why) + self._recency(post, why)

        citizen = screen.citizen or "citizen" in post.hints
        no_sponsor = screen.no_sponsor or "no_sponsor" in post.hints
        sponsor = screen.sponsor or "sponsor" in post.hints

        if not self.p.needs_sponsorship:
            # Work-authorization flags are informational only: no points either way.
            if citizen:
                why.append("Mentions U.S. citizenship, clearance or U.S.-person requirements")
            return Result(max(0, min(100, total)), why, tier=tier)

        if citizen:
            total -= 60
            why.append("Requires U.S. citizenship, clearance or U.S.-person status")
        elif screen.export:
            total -= 12
            why.append("Export-control language: may require U.S.-person status")
        if no_sponsor and not citizen:
            if post.track == "intern":
                total -= 8
                why.append("States no sponsorship (the internship may still work; a return offer may not)")
            else:
                total -= 30
                why.append("No sponsorship for this full-time role")
        if sponsor and not citizen:
            total += 6
            why.append("Sponsor-friendly language")
        if self.defense and self.defense.search(post.company) and not screen.sponsor:
            total -= 25
            why.append("Defense contractor: most roles need U.S. citizenship")
        if screen.status == "failed" and not post.hints:
            why.append("Couldn't read the posting: check it for citizenship requirements")
        elif screen.status != "screened" and not post.hints:
            why.append("Not screened yet: check the posting for citizenship requirements")

        return Result(max(0, min(100, total)), why, tier=tier)
