"""Job sources: community GitHub lists plus direct company ATS feeds.

Every source function returns a list of Posting objects and raises on failure;
the runner records which sources succeeded so closed roles are only marked
closed when their source was actually read this run.
"""

from __future__ import annotations

import re
from urllib.parse import quote

from .models import Posting
from .util import age_text_to_ts, get_json, get_text, html_to_text, iso_to_ts, post_json

# ---------------------------------------------------------------------------
# Track detection for titles that come without metadata
# ---------------------------------------------------------------------------

_INTERN_RE = re.compile(r"\b(intern(ship)?s?|co-?op|apprentice(ship)?|summer student)\b", re.I)
_NEWGRAD_RE = re.compile(
    r"\b(new grad(uate)?s?|university grad(uate)?s?|recent grad(uate)?s?|college grad(uate)?s?|"
    r"early career|entry[- ]level|graduate (engineer|program|rotation)|rotational|"
    r"associate(\s+[\w/&-]+){0,3}?\s+(engineer|developer)|"
    r"engineer\s*(i|1)\b|developer\s*(i|1)\b|level\s*1|campus|class of 20\d\d)\b",
    re.I,
)
_SENIOR_RE = re.compile(
    r"\b(senior|sr\.?|staff|principal|lead|manager|director|architect|head of|vp|"
    r"engineer\s*(ii|iii|iv|2|3|4)|phd|postdoc|mba)\b", re.I)
_TERM_RE = re.compile(r"\b(Summer|Fall|Spring|Winter)\s*(20\d\d)\b", re.I)


def classify_track(title: str) -> str | None:
    if _INTERN_RE.search(title):
        return "intern"
    if _SENIOR_RE.search(title):
        return None
    if _NEWGRAD_RE.search(title):
        return "newgrad"
    return None


def terms_from_title(title: str) -> list[str]:
    return [f"{m.group(1).title()} {m.group(2)}" for m in _TERM_RE.finditer(title)]


# ---------------------------------------------------------------------------
# Community lists
# ---------------------------------------------------------------------------

SIMPLIFY_SPONSOR = {
    "U.S. Citizenship is Required": "citizen",
    "Does Not Offer Sponsorship": "no_sponsor",
    "Offers Sponsorship": "sponsor",
}


def simplify(url: str, label: str, track: str) -> list[Posting]:
    """SimplifyJobs structured listings.json (Summer2027-Internships, New-Grad-Positions)."""
    data = get_json(url)
    out: list[Posting] = []
    for x in data:
        if not x.get("active") or not x.get("is_visible", True):
            continue
        title = (x.get("title") or "").strip()
        company = (x.get("company_name") or "").strip()
        if not title or not company:
            continue
        hint = SIMPLIFY_SPONSOR.get(x.get("sponsorship") or "")
        out.append(Posting(
            company=company,
            title=title,
            location="; ".join(x.get("locations") or []),
            url=x.get("url") or "",
            source=label,
            track=track,
            posted_ts=float(x["date_posted"]) if x.get("date_posted") else None,
            terms=[t for t in (x.get("terms") or []) if t and t != "N/A"] or terms_from_title(title),
            category=x.get("category") or "",
            degrees=list(x.get("degrees") or []),
            hints={hint} if hint else set(),
        ))
    return out


_HREF_RE = re.compile(r'href=["\']([^"\']+)["\']')
_MDLINK_RE = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")
_CLOSED = "\U0001F512"  # lock emoji
_NO_SPONSOR = "\U0001F6C2"  # passport control emoji
_US_FLAG = "\U0001F1FA\U0001F1F8"


def markdown_table(url: str, label: str, default_track: str) -> list[Posting]:
    """Generic parser for the pipe-table READMEs (vanshb03, speedyapply, ...).

    Columns are matched by header name, so column order changes don't break it.
    """
    text = get_text(url)
    out: list[Posting] = []
    cols: dict[str, int] = {}
    last_company = ""
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            cols = {} if not line else cols
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if re.match(r"^:?-{2,}", cells[0] or "-"):
            continue
        heads = [re.sub(r"[^a-z/ ]", "", c.lower()).strip() for c in cells]
        if "company" in heads:
            cols = {}
            for i, h in enumerate(heads):
                if h == "company":
                    cols["company"] = i
                elif h in ("role", "position", "title", "job title"):
                    cols["title"] = i
                elif h == "location":
                    cols["location"] = i
                elif h in ("application/link", "application", "apply", "link", "posting"):
                    cols["apply"] = i
                elif h in ("date posted", "age", "posted", "added", "date"):
                    cols["age"] = i
                elif h == "salary":
                    cols["salary"] = i
            continue
        if not {"company", "title", "location"} <= cols.keys():
            continue
        get = lambda k: cells[cols[k]] if k in cols and cols[k] < len(cells) else ""  # noqa: E731
        raw_co, raw_title, raw_apply = get("company"), get("title"), get("apply")
        if _CLOSED in raw_apply or _CLOSED in raw_title:
            continue
        if raw_co.strip() in ("↳", "&#8627;"):
            company = last_company
        else:
            m = re.search(r"<strong>(.*?)</strong>", raw_co) or re.search(r"\*\*(.*?)\*\*", raw_co)
            company = html_to_text(m.group(1) if m else raw_co)
            company = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", company)
            company = re.sub(r"[\U0001F000-\U0001FFFF☀-➿]", "", company).strip()
            last_company = company
        flags_text = raw_co + raw_title
        title = html_to_text(raw_title)
        title = re.sub(r"[\U0001F000-\U0001FFFF☀-➿]", "", title).strip()
        location = html_to_text(re.sub(r"<details.*?</details>", "", get("location"), flags=re.S))
        location = re.sub(r"\s*\+\d+$", "", location).strip()
        m = _HREF_RE.search(raw_apply) or _MDLINK_RE.search(raw_apply)
        link = m.group(1) if m else ""
        if not company or not title or not link:
            continue
        hints = set()
        if _NO_SPONSOR in flags_text:
            hints.add("no_sponsor")
        if _US_FLAG in flags_text:
            hints.add("citizen")
        track = classify_track(title) or default_track
        out.append(Posting(
            company=company,
            title=title,
            location=location,
            url=link,
            source=label,
            track=track,
            posted_ts=age_text_to_ts(html_to_text(get("age"))),
            terms=terms_from_title(title),
            salary=html_to_text(get("salary")),
            hints=hints,
        ))
    return out


# ---------------------------------------------------------------------------
# Direct ATS feeds (watchlist)
# ---------------------------------------------------------------------------


def workday(entry: dict, queries: list[str], max_per_query: int = 60) -> list[Posting]:
    host, tenant, site = entry["host"], entry["tenant"], entry["site"]
    api = f"https://{host}/wday/cxs/{tenant}/{site}"
    if "myworkdaysite" in host:
        public = f"https://{host}/recruiting/{tenant}/{site}"
    else:
        public = f"https://{host}/en-US/{site}"
    seen: set[str] = set()
    out: list[Posting] = []
    for q in queries:
        offset = 0
        while offset < max_per_query:
            data = post_json(f"{api}/jobs", {
                "appliedFacets": {}, "limit": 20, "offset": offset, "searchText": q,
            })
            posts = data.get("jobPostings") or []
            for p in posts:
                path = p.get("externalPath") or ""
                title = (p.get("title") or "").strip()
                if not path or path in seen or not title:
                    continue
                seen.add(path)
                track = classify_track(title)
                if not track:
                    continue
                out.append(Posting(
                    company=entry["company"],
                    title=title,
                    location=p.get("locationsText") or "",
                    url=public + path,
                    source=f"workday:{tenant}/{site}",
                    track=track,
                    posted_ts=age_text_to_ts(p.get("postedOn") or ""),
                    terms=terms_from_title(title),
                ))
            total = data.get("total") or 0
            offset += 20
            if len(posts) < 20 or offset >= total:
                break
    return out


def greenhouse(entry: dict) -> list[Posting]:
    t = entry["token"]
    data = get_json(f"https://boards-api.greenhouse.io/v1/boards/{t}/jobs?content=true")
    out = []
    for j in data.get("jobs") or []:
        title = (j.get("title") or "").strip()
        track = classify_track(title)
        if not track:
            continue
        out.append(Posting(
            company=entry["company"],
            title=title,
            location=(j.get("location") or {}).get("name") or "",
            url=j.get("absolute_url") or "",
            source=f"greenhouse:{t}",
            track=track,
            posted_ts=iso_to_ts(j.get("first_published") or j.get("updated_at")),
            terms=terms_from_title(title),
            description=html_to_text(j.get("content") or ""),
        ))
    return out


def lever_api(entry: dict) -> str:
    """Lever hosts EU customers (jobs.eu.lever.co) on a separate API."""
    return "https://api.eu.lever.co" if entry.get("region") == "eu" else "https://api.lever.co"


def lever(entry: dict) -> list[Posting]:
    t = entry["token"]
    data = get_json(f"{lever_api(entry)}/v0/postings/{t}?mode=json")
    out = []
    for j in data or []:
        title = (j.get("text") or "").strip()
        track = classify_track(title)
        if not track:
            continue
        cats = j.get("categories") or {}
        locs = cats.get("allLocations") or ([cats.get("location")] if cats.get("location") else [])
        parts = [j.get("descriptionPlain") or ""]
        for lst in j.get("lists") or []:
            parts.append(lst.get("text") or "")
            parts.append(html_to_text(lst.get("content") or ""))
        parts.append(j.get("additionalPlain") or "")
        out.append(Posting(
            company=entry["company"],
            title=title,
            location="; ".join(l for l in locs if l),
            url=j.get("hostedUrl") or "",
            source=f"lever:{t}",
            track=track,
            posted_ts=(j["createdAt"] / 1000.0) if j.get("createdAt") else None,
            terms=terms_from_title(title),
            description="\n".join(p for p in parts if p),
        ))
    return out


def ashby(entry: dict) -> list[Posting]:
    t = entry["token"]
    data = get_json(f"https://api.ashbyhq.com/posting-api/job-board/{quote(t)}")
    out = []
    for j in data.get("jobs") or []:
        if j.get("isListed") is False:
            continue
        title = (j.get("title") or "").strip()
        track = classify_track(title)
        if not track:
            continue
        locs = [j.get("location") or ""] + [
            (s or {}).get("location") or "" for s in (j.get("secondaryLocations") or [])]
        if j.get("isRemote"):
            locs.append("Remote")
        out.append(Posting(
            company=entry["company"],
            title=title,
            location="; ".join(l for l in locs if l),
            url=j.get("jobUrl") or "",
            source=f"ashby:{t}",
            track=track,
            posted_ts=iso_to_ts(j.get("publishedAt")),
            terms=terms_from_title(title),
            description=j.get("descriptionPlain") or "",
        ))
    return out


def smartrecruiters(entry: dict, queries: list[str]) -> list[Posting]:
    t = entry["token"]
    seen: set[str] = set()
    out = []
    for q in queries:
        data = get_json(
            f"https://api.smartrecruiters.com/v1/companies/{t}/postings"
            f"?q={quote(q)}&limit=100&country=us")
        for j in data.get("content") or []:
            jid = str(j.get("id") or "")
            title = (j.get("name") or "").strip()
            if not jid or jid in seen or not title:
                continue
            seen.add(jid)
            track = classify_track(title)
            if not track:
                continue
            loc = j.get("location") or {}
            location = loc.get("fullLocation") or ", ".join(
                x for x in (loc.get("city"), (loc.get("region") or ""), (loc.get("country") or "").upper()) if x)
            if loc.get("remote"):
                location = (location + "; Remote").strip("; ")
            out.append(Posting(
                company=entry["company"],
                title=title,
                location=location,
                url=f"https://jobs.smartrecruiters.com/{t}/{jid}",
                source=f"smartrecruiters:{t}",
                track=track,
                posted_ts=iso_to_ts(j.get("releasedDate")),
                terms=terms_from_title(title),
            ))
    return out


def fetch_watchlist_entry(entry: dict, queries: list[str]) -> list[Posting]:
    ats = entry["ats"]
    if ats == "workday":
        return workday(entry, queries)
    if ats == "greenhouse":
        return greenhouse(entry)
    if ats == "lever":
        return lever(entry)
    if ats == "ashby":
        return ashby(entry)
    if ats == "smartrecruiters":
        return smartrecruiters(entry, queries)
    raise ValueError(f"unknown ats '{ats}' for {entry.get('company')}")
