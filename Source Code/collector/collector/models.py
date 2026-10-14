"""Data types shared across the collector."""

from __future__ import annotations

from dataclasses import dataclass, field

from .util import role_key


@dataclass
class Posting:
    company: str
    title: str
    location: str
    url: str
    source: str
    track: str  # "intern" or "newgrad"
    posted_ts: float | None = None
    terms: list[str] = field(default_factory=list)
    category: str = ""
    degrees: list[str] = field(default_factory=list)
    salary: str = ""
    # Signals from the source's own metadata: "citizen", "no_sponsor", "sponsor"
    hints: set[str] = field(default_factory=set)
    # Job description text, when the source returns it inline (ATS feeds do)
    description: str = ""
    sources: list[str] = field(default_factory=list)

    def __post_init__(self):
        if not self.sources:
            self.sources = [self.source]

    @property
    def key(self) -> str:
        return role_key(self.company, self.title)


@dataclass
class Screen:
    """Result of reading a job description for work-authorization language."""

    status: str = "unscreened"  # "screened", "unscreened", "failed"
    citizen: bool = False  # US citizenship, clearance, or US-person requirement
    export: bool = False  # export-control / ITAR language without an explicit requirement
    no_sponsor: bool = False  # will not sponsor / must work without sponsorship
    sponsor: bool = False  # explicitly sponsor-friendly or welcomes OPT/CPT/F-1
    grad_window: str = ""  # sentence describing required graduation timing
    snippets: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "citizen": self.citizen,
            "export": self.export,
            "no_sponsor": self.no_sponsor,
            "sponsor": self.sponsor,
            "grad_window": self.grad_window,
            "snippets": self.snippets,
        }

    @classmethod
    def from_dict(cls, d: dict | None) -> "Screen":
        if not d:
            return cls()
        return cls(
            status=d.get("status", "unscreened"),
            citizen=bool(d.get("citizen")),
            export=bool(d.get("export")),
            no_sponsor=bool(d.get("no_sponsor")),
            sponsor=bool(d.get("sponsor")),
            grad_window=d.get("grad_window", "") or "",
            snippets=list(d.get("snippets") or []),
        )
