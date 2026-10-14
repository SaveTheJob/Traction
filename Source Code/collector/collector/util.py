"""Shared helpers: HTTP session, text cleanup, location checks, normalization."""

from __future__ import annotations

import hashlib
import html
import re
import time
from datetime import datetime, timezone
from html.parser import HTMLParser

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Identify honestly, with a contact URL, so site operators know who is calling.
USER_AGENT = "TractionCollector/1.0 (+https://traction-37.web.app)"


def make_session() -> requests.Session:
    s = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=1.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"GET", "POST"}),
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=16, pool_maxsize=16)
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    s.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9"})
    return s


SESSION = make_session()
TIMEOUT = 25


def get_json(url: str, **kw):
    r = SESSION.get(url, timeout=TIMEOUT, **kw)
    r.raise_for_status()
    return r.json()


def post_json(url: str, payload: dict, **kw):
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    r = SESSION.post(url, json=payload, headers=headers, timeout=TIMEOUT, **kw)
    r.raise_for_status()
    return r.json()


def get_text(url: str, **kw) -> str:
    r = SESSION.get(url, timeout=TIMEOUT, **kw)
    r.raise_for_status()
    return r.text


# ---------------------------------------------------------------------------
# Text
# ---------------------------------------------------------------------------


class _Stripper(HTMLParser):
    BLOCK = {"p", "div", "br", "li", "ul", "ol", "h1", "h2", "h3", "h4", "tr", "section"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript"):
            self._skip += 1
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript") and self._skip:
            self._skip -= 1
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self._skip:
            self.parts.append(data)


def html_to_text(raw: str) -> str:
    if not raw:
        return ""
    # Greenhouse returns HTML-escaped HTML; unescape first so tags parse.
    if "&lt;" in raw[:500]:
        raw = html.unescape(raw)
    p = _Stripper()
    try:
        p.feed(raw)
        p.close()
    except Exception:
        return re.sub(r"<[^>]+>", " ", raw)
    text = "".join(p.parts)
    text = re.sub(r"[ \t ]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text)
    return text.strip()


def norm(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


_CO_SUFFIX = re.compile(
    r"\b(inc|incorporated|llc|ltd|corp|corporation|co|company|plc|gmbh|holdings|"
    r"technology|technologies|semiconductors?|group|the)\b"
)


def norm_company(s: str) -> str:
    s = _CO_SUFFIX.sub(" ", norm(s))
    return re.sub(r"\s+", " ", s).strip()


_TITLE_NOISE = re.compile(
    r"\b(summer|fall|spring|winter)?\s*20\d\d\b|\b(intern(ship)?s?|co op|coop)\b"
)


def role_key(company: str, title: str) -> str:
    t = _TITLE_NOISE.sub(" ", norm(title))
    t = re.sub(r"\s+", " ", t).strip()
    base = f"{norm_company(company)}|{t}"
    return hashlib.sha1(base.encode()).hexdigest()[:16]


# ---------------------------------------------------------------------------
# Locations
# ---------------------------------------------------------------------------

US_STATES = (
    "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO "
    "MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC"
).split()
US_STATE_NAMES = (
    "Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|"
    "Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|"
    "Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|"
    "New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|"
    "Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|"
    "Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming"
)
_US_RE = re.compile(
    r"(,\s*(" + "|".join(US_STATES) + r")\b)|\b(" + US_STATE_NAMES + r")\b|"
    r"\b(USA|U\.S\.A?\.?|United States|US Remote|Remote US|Remote in USA|Remote - US)\b|"
    r"^(SF|NYC|LA|Remote)$|\b(SF|NYC)\b|^US\b|\bUS-|\b(" + "|".join(US_STATES) + r")\s*-\s",
    re.IGNORECASE,
)
_NON_US_RE = re.compile(
    r"\b(Canada|Ontario|Quebec|British Columbia|Alberta|Toronto|Vancouver|Montreal|Ottawa|"
    r"Waterloo|Mississauga|United Kingdom|UK|England|London|Scotland|Ireland|Dublin|"
    r"Germany|Berlin|Munich|Dresden|France|Paris|Netherlands|Amsterdam|Eindhoven|Belgium|"
    r"Switzerland|Zurich|Austria|Vienna|Poland|Krakow|Warsaw|Romania|Bucharest|Czech|"
    r"Prague|Spain|Madrid|Barcelona|Portugal|Lisbon|Italy|Milan|Sweden|Stockholm|Norway|"
    r"Denmark|Finland|Israel|Tel Aviv|Haifa|India|Bangalore|Bengaluru|Hyderabad|Pune|"
    r"Chennai|Noida|Gurgaon|Gurugram|China|Shanghai|Beijing|Shenzhen|Taiwan|Taipei|Hsinchu|"
    r"Hong Kong|Singapore|Malaysia|Penang|Philippines|Manila|Vietnam|Japan|Tokyo|Korea|"
    r"Seoul|Australia|Sydney|Melbourne|New Zealand|Mexico|Guadalajara|Brazil|Sao Paulo|"
    r"Argentina|Costa Rica|Chile|Colombia|Luxembourg|Egypt|Cairo|UAE|Dubai|Thailand)\b",
    re.IGNORECASE,
)


def is_us_location(loc: str) -> bool | None:
    """True if clearly US, False if clearly not, None if unknown (e.g. '3 Locations')."""
    if not loc:
        return None
    parts = [p.strip() for p in re.split(r"[;|\n]|\s/\s", loc) if p.strip()]
    if not parts:
        parts = [loc]
    # A part counts as US only if it does not also name a foreign place
    # (", IN" is Indiana in "Fort Wayne, IN" but India in "Bangalore, IN").
    any_us = any(_US_RE.search(p) and not _NON_US_RE.search(p) for p in parts)
    if any_us:
        return True
    if all(_NON_US_RE.search(p) for p in parts):
        return False
    if re.search(r"\bremote\b", loc, re.I) and not _NON_US_RE.search(loc):
        return True
    if re.search(r"\d+\s+locations?", loc, re.I):
        return None
    return None


# ---------------------------------------------------------------------------
# Time
# ---------------------------------------------------------------------------


def now_ts() -> float:
    return time.time()


def iso_to_ts(s: str | None) -> float | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def days_ago(ts: float | None) -> int | None:
    if not ts:
        return None
    return max(0, int((now_ts() - ts) // 86400))


_MONTHS = {m: i for i, m in enumerate(
    "jan feb mar apr may jun jul aug sep oct nov dec".split(), start=1)}


def age_text_to_ts(s: str) -> float | None:
    """Parse '3d', '2mo', 'Aug 21', 'Posted Today', 'Posted 30+ Days Ago', '2026-07-09'."""
    s = (s or "").strip().lower()
    if not s:
        return None
    now = datetime.now(timezone.utc)
    if "today" in s or s in ("0d", "new"):
        return now.timestamp()
    if "yesterday" in s:
        return now.timestamp() - 86400
    m = re.search(r"(\d+)\+?\s*(d|day|days)\b", s)
    if m:
        return now.timestamp() - int(m.group(1)) * 86400
    m = re.search(r"(\d+)\s*(mo|month|months)\b", s)
    if m:
        return now.timestamp() - int(m.group(1)) * 30 * 86400
    m = re.search(r"(\d+)\s*(w|wk|week|weeks)\b", s)
    if m:
        return now.timestamp() - int(m.group(1)) * 7 * 86400
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)),
                        tzinfo=timezone.utc).timestamp()
    m = re.match(r"([a-z]{3})[a-z]*\s+(\d{1,2})", s)
    if m and m.group(1) in _MONTHS:
        dt = datetime(now.year, _MONTHS[m.group(1)], int(m.group(2)), tzinfo=timezone.utc)
        if dt > now:
            dt = dt.replace(year=now.year - 1)
        return dt.timestamp()
    return None
