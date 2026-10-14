"""Read job descriptions for work-authorization and graduation-timing language.

The point is to catch "U.S. citizens only", clearance, ITAR/U.S.-person and
"no sponsorship" requirements that list sites rarely flag, so an F-1 student
doesn't waste applications on roles they can't take.
"""

from __future__ import annotations

import re
from urllib.parse import parse_qs, urlparse

from .models import Screen
from .util import get_json, get_public_text, html_to_text

# ---------------------------------------------------------------------------
# Fetching the description for a posting URL
# ---------------------------------------------------------------------------

_ashby_cache: dict[str, dict] = {}


def _workday(url: str) -> str | None:
    u = urlparse(url)
    if "myworkdayjobs.com" in u.netloc:
        # /en-US/{site}/job/... or /{site}/job/...
        parts = [p for p in u.path.split("/") if p]
        if parts and re.fullmatch(r"[a-z]{2}-[A-Za-z]{2}", parts[0]):
            parts = parts[1:]
        if len(parts) < 3 or "job" not in parts:
            return None
        tenant = u.netloc.split(".")[0]
        site = parts[0]
        rest = "/".join(parts[1:])
        api = f"https://{u.netloc}/wday/cxs/{tenant}/{site}/{rest}"
    elif "myworkdaysite.com" in u.netloc:
        m = re.match(r"/recruiting/([^/]+)/([^/]+)/(job/.+)", u.path)
        if not m:
            return None
        api = f"https://{u.netloc}/wday/cxs/{m.group(1)}/{m.group(2)}/{m.group(3)}"
    else:
        return None
    data = get_json(api, headers={"Accept": "application/json"})
    info = data.get("jobPostingInfo") or {}
    return html_to_text(info.get("jobDescription") or "")


def _greenhouse(url: str) -> str | None:
    u = urlparse(url)
    q = parse_qs(u.query)
    board = job = None
    m = re.search(r"/([\w-]+)/jobs/(\d+)", u.path)
    if m and "greenhouse.io" in u.netloc:
        board, job = m.group(1), m.group(2)
    elif "for" in q and ("token" in q or "gh_jid" in q):
        board = q["for"][0]
        job = (q.get("token") or q.get("gh_jid"))[0]
    if not board or not job:
        return None
    data = get_json(f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs/{job}")
    return html_to_text(data.get("content") or "")


def _lever(url: str) -> str | None:
    m = re.match(r"https?://jobs\.(eu\.)?lever\.co/([^/]+)/([0-9a-f-]{36})", url)
    if not m:
        return None
    api = "https://api.eu.lever.co" if m.group(1) else "https://api.lever.co"
    j = get_json(f"{api}/v0/postings/{m.group(2)}/{m.group(3)}")
    parts = [j.get("descriptionPlain") or ""]
    for lst in j.get("lists") or []:
        parts.append(lst.get("text") or "")
        parts.append(html_to_text(lst.get("content") or ""))
    parts.append(j.get("additionalPlain") or "")
    return "\n".join(p for p in parts if p)


def _ashby(url: str) -> str | None:
    m = re.match(r"https?://jobs\.ashbyhq\.com/([^/]+)/([0-9a-f-]{36})", url)
    if not m:
        return None
    org, jid = m.group(1), m.group(2)
    if org not in _ashby_cache:
        _ashby_cache[org] = get_json(f"https://api.ashbyhq.com/posting-api/job-board/{org}")
    for j in _ashby_cache[org].get("jobs") or []:
        if j.get("id") == jid:
            return j.get("descriptionPlain") or html_to_text(j.get("descriptionHtml") or "")
    return ""


def _smartrecruiters(url: str) -> str | None:
    m = re.match(r"https?://jobs\.smartrecruiters\.com/([^/]+)/(\d+)", url)
    if not m:
        return None
    j = get_json(f"https://api.smartrecruiters.com/v1/companies/{m.group(1)}/postings/{m.group(2)}")
    secs = ((j.get("jobAd") or {}).get("sections") or {})
    return "\n".join(html_to_text((s or {}).get("text") or "") for s in secs.values())


def fetch_description(url: str) -> str:
    """Return plain-text JD for a posting URL, using ATS APIs where possible."""
    for fn in (_workday, _greenhouse, _lever, _ashby, _smartrecruiters):
        text = fn(url)
        if text is not None:
            return text
    # Generic page: works for server-rendered career sites, not for JS-only ones.
    return html_to_text(get_public_text(url))


# ---------------------------------------------------------------------------
# Screening rules
# ---------------------------------------------------------------------------

US = r"(?:U\.?\s?S\.?|United States|US)"

CITIZEN_PATTERNS = [
    rf"\b(must|required to|need to|should) (be|hold) (a |an )?{US} citizen",
    rf"\b{US} citizen(ship)?\s*(is |are )?(strictly )?(required|only|mandatory|a requirement)",
    rf"\brequires? {US} citizenship",
    rf"\b{US} citizens only",
    rf"\bonly (open|available) to {US} citizens",
    rf"\b(must|required to) (be|qualify as) (a |an )?{US} person",
    rf"\b{US} person(s)? (status )?(is |are )?(required|only)",
    r"\b(active|current|interim|existing) (secret|top secret|ts|ts/sci|dod|government|security) clearance",
    r"\b(ability|able|eligib\w+) to (obtain|maintain|hold) (a |an |and maintain )?[\w /-]{0,30}clearance",
    r"\bclearance (is )?(required|mandatory)",
    r"\bTS/SCI\b",
    r"\bpolygraph\b",
]
CLEARANCE_NEGATION = re.compile(r"\b(no|not|without|does not require|doesn't require)\b[^.]{0,30}clearance", re.I)

EXPORT_PATTERNS = [
    r"\bITAR\b",
    r"\bexport[- ]control(led|s)?\b",
    r"\bEAR99\b|\bExport Administration Regulations\b",
]

NO_SPONSOR_PATTERNS = [
    r"\b(will not|won't|cannot|can't|can ?not|unable to|does not|do not|doesn't|not able to|is not able to)\s+"
    r"(provide |offer |support |consider )?(employment |work |visa |immigration |h-?1b )?sponsor",
    r"\bwithout (the )?(need for |requiring )?(current or future |future |any )?(visa |employment |immigration )?sponsorship",
    r"\b(visa |employment |immigration )?sponsorship (is |will )?(not|never) (be )?(available|offered|provided|considered)",
    r"\bnot (eligible|available) for (visa |employment |immigration )?sponsorship",
    r"\bno (visa |employment |immigration )?sponsorship\b",
    r"\b(now or in the future|currently or in the future)[^.]{0,40}sponsor",
]

SPONSOR_PATTERNS = [
    r"\b(will|can|may|do|does) (provide |offer )?(visa |h-?1b |immigration )?sponsor(ship)?\b(?! not)",
    r"\b(visa |immigration )?sponsorship (is |may be )?available\b",
    r"\b(international students|F-?1 students|OPT|CPT|STEM OPT)\b[^.]{0,40}\b(welcome|eligible|encouraged|accepted|considered)",
]

GRAD_PATTERN = re.compile(
    r"[^.\n]{0,120}\b(graduat\w*|degree (completion|conferred)|expected to complete)\b[^.\n]{0,140}",
    re.I,
)
YEAR_RE = re.compile(r"\b20\d\d\b")


def _compile(pats):
    return [re.compile(p, re.I) for p in pats]


_CITIZEN = _compile(CITIZEN_PATTERNS)
_EXPORT = _compile(EXPORT_PATTERNS)
_NO_SPONSOR = _compile(NO_SPONSOR_PATTERNS)
_SPONSOR = _compile(SPONSOR_PATTERNS)


# A sentence ends at a newline or at a period followed by whitespace, except after a
# single capital letter, so "U.S. citizen" doesn't end a sentence at "U.S."
_SENTENCE_END = re.compile(r"(?<!\b[A-Z])\.(?=\s|$)|\n")


def _sentence(text: str, start: int, end: int) -> str:
    a = 0
    for m in _SENTENCE_END.finditer(text, 0, start):
        a = m.end()
    m = _SENTENCE_END.search(text, end)
    b = m.end() if m else len(text)
    s = re.sub(r"\s+", " ", text[a:b]).strip()
    return s[:260] + ("…" if len(s) > 260 else "")


def screen_text(text: str) -> Screen:
    s = Screen(status="screened")
    if not text or len(text) < 80:
        s.status = "failed"
        return s
    for rx in _CITIZEN:
        m = rx.search(text)
        if not m:
            continue
        sent = _sentence(text, m.start(), m.end())
        if "clearance" in m.group(0).lower() and CLEARANCE_NEGATION.search(sent):
            continue
        s.citizen = True
        s.snippets.append(sent)
        break
    for rx in _EXPORT:
        m = rx.search(text)
        if m:
            s.export = True
            if not s.citizen:
                s.snippets.append(_sentence(text, m.start(), m.end()))
            break
    for rx in _NO_SPONSOR:
        m = rx.search(text)
        if m:
            s.no_sponsor = True
            s.snippets.append(_sentence(text, m.start(), m.end()))
            break
    if not s.no_sponsor and not s.citizen:
        for rx in _SPONSOR:
            m = rx.search(text)
            if m:
                s.sponsor = True
                s.snippets.append(_sentence(text, m.start(), m.end()))
                break
    for m in GRAD_PATTERN.finditer(text):
        if YEAR_RE.search(m.group(0)):
            s.grad_window = re.sub(r"\s+", " ", m.group(0)).strip()[:260]
            break
    # Dedupe snippets, keep at most 3
    seen, uniq = set(), []
    for sn in s.snippets:
        if sn not in seen:
            seen.add(sn)
            uniq.append(sn)
    s.snippets = uniq[:3]
    return s


def screen_posting(url: str, inline_description: str = "") -> Screen:
    try:
        text = inline_description or fetch_description(url)
    except Exception:
        return Screen(status="failed")
    return screen_text(text)
