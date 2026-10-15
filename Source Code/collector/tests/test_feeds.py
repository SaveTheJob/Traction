import pytest

from collector.feeds import FeedError, entry_from_url, feed_id


@pytest.mark.parametrize("url,ats,ident,site", [
    ("https://nxp.wd3.myworkdayjobs.com/en-US/careers/job/Austin/Intern_R-123", "workday", "nxp", "careers"),
    ("https://wd5.myworkdaysite.com/recruiting/microchiphr/External/job/x", "workday", "microchiphr", "External"),
    ("https://job-boards.greenhouse.io/axon/jobs/123", "greenhouse", "axon", None),
    ("https://boards.greenhouse.io/embed/job_board?for=stripe", "greenhouse", "stripe", None),
    ("jobs.lever.co/zoox/abc", "lever", "zoox", None),
    ("https://jobs.ashbyhq.com/openai", "ashby", "openai", None),
    ("https://jobs.smartrecruiters.com/BoschGroup/744000", "smartrecruiters", "BoschGroup", None),
])
def test_parses_supported_boards(url, ats, ident, site):
    e = entry_from_url(url, "")
    assert e["ats"] == ats
    assert (e.get("token") or e.get("tenant")) == ident
    assert e.get("site") == site


def test_lever_eu_region():
    e = entry_from_url("https://jobs.eu.lever.co/cirrus/abc")
    assert e["ats"] == "lever" and e["token"] == "cirrus" and e["region"] == "eu"


@pytest.mark.parametrize("url", [
    "https://example.com", "http://169.254.169.254/latest", "https://evil.com/jobs.lever.co/x",
    "https://jobs.lever.co.evil.com/x", "https://user@jobs.lever.co/x", "https://jobs.lever.co:8443/x",
    "https://jobs.lever.co/../admin", "https://boards.greenhouse.io/", "file:///etc/passwd",
    "https://x.myworkdayjobs.com.evil.com/a", "https://10.0.0.1.myworkdayjobs.com/a",
])
def test_rejects_unsupported_or_unsafe(url):
    with pytest.raises(FeedError):
        entry_from_url(url)


def test_feed_ids():
    assert feed_id(entry_from_url("https://nxp.wd3.myworkdayjobs.com/careers")) == "workday-nxp-careers"
    assert feed_id(entry_from_url("https://jobs.smartrecruiters.com/BoschGroup")) == "smartrecruiters-boschgroup"
    assert feed_id(entry_from_url("https://job-boards.greenhouse.io/axon")) == "greenhouse-axon"
