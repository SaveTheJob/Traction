"""Company feeds that users add by pasting a careers-page URL.

SSRF guard: a user URL is never fetched. It is parsed into ATS identifiers,
and only when its host is one of the known ATS hosts below; the collector then
calls that ATS's public API, built from validated identifiers.
"""

from __future__ import annotations

import logging
import re
import time
from urllib.parse import parse_qs, urlparse

from . import sources as S
from .util import get_json, post_json

log = logging.getLogger("collector.feeds")

_ID = r"[A-Za-z0-9][A-Za-z0-9._-]{0,99}"
ID_RE = re.compile(rf"^{_ID}$")
WORKDAY_JOBS_HOST = re.compile(r"^([a-z0-9-]{1,63})(?:\.wd\d{1,3})?\.myworkdayjobs\.com$")
WORKDAY_SITE_HOST = re.compile(r"^wd\d{1,3}\.myworkdaysite\.com$")
LOCALE = re.compile(r"^[a-z]{2}-[A-Za-z]{2}$")
SIMPLE_HOSTS = {
    "boards.greenhouse.io": "greenhouse",
    "job-boards.greenhouse.io": "greenhouse",
    "jobs.lever.co": "lever",
    "jobs.eu.lever.co": "lever",
    "jobs.ashbyhq.com": "ashby",
    "jobs.smartrecruiters.com": "smartrecruiters",
}


class FeedError(ValueError):
    """Raised with a message that is safe to show the user."""


def feed_id(entry: dict) -> str:
    if entry["ats"] == "workday":
        return f"workday-{entry['tenant']}-{entry['site']}".lower()
    return f"{entry['ats']}-{entry['token']}".lower()


def entry_from_url(url: str, company: str = "") -> dict:
    """Parse a careers or posting URL into a watchlist entry, or raise FeedError."""
    url = (url or "").strip()
    if len(url) > 500:
        raise FeedError("That URL is too long.")
    try:
        u = urlparse(url if "://" in url else "https://" + url)
        port = u.port
    except ValueError as e:
        raise FeedError("That doesn't look like a valid link.") from e
    if u.scheme not in ("http", "https") or u.username or u.password or port:
        raise FeedError("Paste a plain https:// careers-page link.")
    host = (u.hostname or "").lower()
    parts = [p for p in u.path.split("/") if p]
    if parts and LOCALE.match(parts[0]):
        parts = parts[1:]
    company = re.sub(r"\s+", " ", company or "").strip()[:80]

    if m := WORKDAY_JOBS_HOST.match(host):
        if not parts or not ID_RE.match(parts[0]):
            raise FeedError("That Workday link is missing the careers-site name (the part after the domain).")
        entry = {"ats": "workday", "host": host, "tenant": m.group(1), "site": parts[0]}
    elif WORKDAY_SITE_HOST.match(host):
        if len(parts) < 3 or parts[0] != "recruiting" or not (ID_RE.match(parts[1]) and ID_RE.match(parts[2])):
            raise FeedError("Workday links on myworkdaysite.com look like /recruiting/<company>/<site>.")
        entry = {"ats": "workday", "host": host, "tenant": parts[1], "site": parts[2]}
    elif host in SIMPLE_HOSTS:
        ats = SIMPLE_HOSTS[host]
        token = parts[0] if parts else ""
        if ats == "greenhouse" and token == "embed":
            token = (parse_qs(u.query).get("for") or [""])[0]
        if not ID_RE.match(token or ""):
            raise FeedError("That link doesn't include the company's board name.")
        entry = {"ats": ats, "token": token}
        if host == "jobs.eu.lever.co":
            entry["region"] = "eu"
    else:
        raise FeedError("Only Workday, Greenhouse, Lever, Ashby and SmartRecruiters career pages are supported.")
    entry["company"] = company or (entry.get("token") or entry["tenant"]).replace("-", " ").title()
    return entry


def verify(entry: dict) -> str | None:
    """Confirm the board exists and has postings. Returns the ATS's own company name when it
    reports one. Raises FeedError when the board is missing or empty."""
    try:
        ats = entry["ats"]
        if ats == "workday":
            data = post_json(f"https://{entry['host']}/wday/cxs/{entry['tenant']}/{entry['site']}/jobs",
                             {"appliedFacets": {}, "limit": 1, "offset": 0, "searchText": ""})
            if not data.get("total"):
                raise FeedError("That Workday site has no open postings.")
            return None
        if ats == "greenhouse":
            board = get_json(f"https://boards-api.greenhouse.io/v1/boards/{entry['token']}")
            jobs = get_json(f"https://boards-api.greenhouse.io/v1/boards/{entry['token']}/jobs")
            if not jobs.get("jobs"):
                raise FeedError("That Greenhouse board has no open postings.")
            return (board.get("name") or "").strip()[:80] or None
        if ats == "lever":
            data = get_json(f"{S.lever_api(entry)}/v0/postings/{entry['token']}?mode=json&limit=1")
            if not isinstance(data, list) or not data:
                raise FeedError("That Lever board has no open postings.")
            return None
        if ats == "ashby":
            data = get_json(f"https://api.ashbyhq.com/posting-api/job-board/{entry['token']}")
            if not data.get("jobs"):
                raise FeedError("That Ashby board has no open postings.")
            return None
        if ats == "smartrecruiters":
            data = get_json(f"https://api.smartrecruiters.com/v1/companies/{entry['token']}/postings?limit=1")
            if not data.get("totalFound"):
                raise FeedError("That SmartRecruiters company has no open postings.")
            return None
    except FeedError:
        raise
    except Exception as e:
        log.info("feed verify failed for %s: %s", feed_id(entry), e)
        raise FeedError("Couldn't read that careers page's job feed.") from e
    raise FeedError("Unsupported job board.")


def process_requests(fs, cfg: dict, known_ids: set[str]) -> dict:
    """Handle pending feedRequests. Returns counts for the run summary."""
    st = cfg["settings"]["feeds"]
    deadline = time.monotonic() + st["max_seconds"]
    counts = {"added": 0, "duplicate": 0, "rejected": 0}
    per_user: dict[str, int] = {}
    added_by_user: dict[str, int] = {}
    for req_id, req in fs.pending_feed_requests():
        if time.monotonic() > deadline:
            break  # the rest stay pending for the next run
        uid = req.get("userId") if isinstance(req.get("userId"), str) else ""
        if not uid:
            fs.resolve_feed_request(req_id, "rejected", "Missing user.")
            counts["rejected"] += 1
            continue
        per_user[uid] = per_user.get(uid, 0) + 1
        if per_user[uid] > st["max_requests_per_run"]:
            # Answer instead of leaving them pending, so a flood can't pile up between runs.
            fs.resolve_feed_request(req_id, "rejected", "Too many requests at once. Try again after the next refresh.")
            counts["rejected"] += 1
            continue
        try:
            entry = entry_from_url(str(req.get("url") or ""), str(req.get("company") or ""))
            fid = feed_id(entry)
            if fid in known_ids:
                fs.resolve_feed_request(req_id, "added", "Already tracked", fid, duplicate=True)
                counts["duplicate"] += 1
                continue
            if uid not in added_by_user:
                added_by_user[uid] = fs.count_added_feeds(uid)
            if added_by_user[uid] >= st["max_per_user"]:
                raise FeedError(f"You've reached the limit of {st['max_per_user']} company feeds.")
            name = verify(entry)
            if name:
                entry["company"] = name
            fs.add_feed(fid, entry)  # this run's gather fills in earlyCareerCount
            fs.resolve_feed_request(req_id, "added", "", fid)
            known_ids.add(fid)
            added_by_user[uid] += 1
            counts["added"] += 1
        except FeedError as e:
            fs.resolve_feed_request(req_id, "rejected", str(e))
            counts["rejected"] += 1
        except Exception as e:  # never leave a request stuck on an unexpected error
            log.warning("feed request %s failed: %s", req_id, e)
            fs.resolve_feed_request(req_id, "rejected", "Couldn't read that careers page's job feed.")
            counts["rejected"] += 1
    return counts
