"""Fit scoring for one applicant profile.

Score is 0 to 100 and every point comes with a human-readable reason, so the
Discover page can show *why* a role ranked where it did.

    role fit      up to 40   (title + category vs. your core/strong/ok role lists)
    timing        up to 20   (internship term or new-grad start vs. your plan)
    location      up to 12   (home region, remote, other US)
    company       up to 16   (warm leads, target list, cap-exempt sponsors)
    recency       up to 12
    adjustments   sponsorship signals, defense contractors, degree level, co-op terms
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

from .models import Posting, Screen
from .util import days_ago


def _rx(words: list[str]) -> re.Pattern | None:
    words = [w for w in (words or []) if w]
    if not words:
        return None
    return re.compile(r"\b(" + "|".join(words) + r")\b", re.I)


@dataclass
class Result:
    score: int
    reasons: list[str]
    excluded: str = ""  # non-empty means "don't show at all", with why


class Scorer:
    def __init__(self, profile: dict, today: date | None = None):
        self.p = profile
        self.today = today or date.today()
        roles = profile.get("roles", {})
        self.core = _rx(roles.get("core"))
        self.strong = _rx(roles.get("strong"))
        self.ok = _rx(roles.get("ok"))
        self.avoid = _rx(roles.get("avoid"))
        cos = profile.get("companies", {})
        self.warm = _rx(cos.get("warm"))
        self.target = _rx(cos.get("target"))
        self.cap_exempt = _rx(cos.get("cap_exempt"))
        self.defense = _rx(cos.get("defense"))
        self.home = _rx(profile.get("home_region"))
        self.intern_terms = {t.lower() for t in profile.get("internship_terms", [])}
        self.part_time_terms = {t.lower() for t in profile.get("part_time_terms", [])}
        self.unavailable_terms = {t.lower() for t in profile.get("unavailable_terms", [])}
        self.grad_ok = _rx([re.escape(x) for x in profile.get("grad_window_ok", [])])
        self.grad_bad = _rx([re.escape(x) for x in profile.get("grad_window_bad", [])])
        nd = profile.get("newgrad_open_from")
        self.newgrad_open = date.fromisoformat(str(nd)) if nd else None

    # -- pieces ------------------------------------------------------------

    def _role(self, post: Posting, why: list[str]) -> int:
        t = post.title
        cat = (post.category or "").lower()
        if self.avoid and self.avoid.search(t) and not (self.core and self.core.search(t)):
            why.append("Outside your target roles")
            return 0
        if self.core and self.core.search(t):
            why.append(f"Core role match: {self.core.search(t).group(0)}")
            return 40
        if "hardware" in cat:
            why.append("Hardware category")
            return 34
        if self.strong and self.strong.search(t):
            why.append(f"Strong role match: {self.strong.search(t).group(0)}")
            return 30
        if "software" in cat:
            why.append("Software category")
            return 26
        if self.ok and self.ok.search(t):
            why.append(f"Adjacent role: {self.ok.search(t).group(0)}")
            return 16
        if "ai/ml" in cat or "data" in cat:
            why.append("AI/ML/Data category")
            return 14
        return 0

    def _timing(self, post: Posting, screen: Screen, why: list[str]) -> tuple[int, str]:
        terms = {t.lower() for t in post.terms}
        title = post.title.lower()
        if post.track == "intern":
            if terms & self.intern_terms:
                why.append(f"{', '.join(sorted(t.title() for t in terms & self.intern_terms))} fits your plan")
                return 20, ""
            if terms & self.part_time_terms:
                why.append("Fall term: only workable part-time (20 hrs) on pre-OPT")
                return 8, ""
            if terms and terms <= self.unavailable_terms:
                return 0, f"Term not in your plan ({', '.join(sorted(t.title() for t in terms))})"
            if re.search(r"\bco-?op\b", title) and not terms & self.intern_terms:
                why.append("Co-op without a summer term: check dates")
                return 4, ""
            why.append("Term not stated: check dates")
            return 10, ""
        # new grad
        gw = screen.grad_window or ""
        if gw and self.grad_ok and self.grad_ok.search(gw):
            why.append("Graduation window matches Dec 2027")
            return 20, ""
        if gw and self.grad_bad and self.grad_bad.search(gw) and not (self.grad_ok and self.grad_ok.search(gw)):
            why.append("Graduation window looks earlier than yours")
            return 2, ""
        if self.newgrad_open and self.today < self.newgrad_open:
            why.append("New-grad role: most current postings start before you graduate")
            return 5, ""
        why.append("New-grad role")
        return 15, ""

    def _location(self, post: Posting, why: list[str]) -> int:
        loc = post.location or ""
        if self.home and self.home.search(loc):
            why.append("In Arizona")
            return 12
        if re.search(r"\bremote\b", loc, re.I):
            why.append("Remote")
            return 9
        return 5

    def _company(self, post: Posting, why: list[str]) -> int:
        c = post.company
        if self.warm and self.warm.search(c):
            why.append("Warm lead (you have a contact)")
            return 16
        if self.cap_exempt and self.cap_exempt.search(c):
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

        if post.degrees and not any("bachelor" in d.lower() for d in post.degrees):
            return Result(0, [], "Graduate degree required")
        if re.search(r"\b(phd|ph\.d|master'?s|mba|doctoral)\b", post.title, re.I) and not re.search(
                r"\b(bachelor|bs|undergrad)", post.title, re.I):
            return Result(0, [], "Graduate degree required")

        role = self._role(post, why)
        if role == 0:
            return Result(0, why, "Not a target role")
        timing, excl = self._timing(post, screen, why)
        if excl:
            return Result(0, why, excl)
        total = role + timing + self._location(post, why) + self._company(post, why) + self._recency(post, why)

        citizen = screen.citizen or "citizen" in post.hints
        no_sponsor = screen.no_sponsor or "no_sponsor" in post.hints
        sponsor = screen.sponsor or "sponsor" in post.hints

        if citizen:
            total -= 60
            why.append("Requires U.S. citizenship, clearance or U.S.-person status")
        elif screen.export:
            total -= 12
            why.append("Export-control language: may require U.S.-person status")
        if no_sponsor and not citizen:
            if post.track == "intern":
                total -= 8
                why.append("States no sponsorship (internship on OPT may still work; return offer may not)")
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

        return Result(max(0, min(100, total)), why)
