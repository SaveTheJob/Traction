import pytest

from collector.models import Posting, Screen
from collector.profile import Profile
from collector.score import _STATE_BY_CODE, Scorer, grad_mentions


def post(**kw):
    base = {"company": "Acme", "title": "Software Intern", "location": "", "url": "https://x", "source": "t",
            "track": "intern"}
    return Posting(**{**base, **kw})


def test_state_codes_align():
    assert _STATE_BY_CODE["IN"] == "Indiana"
    assert _STATE_BY_CODE["WY"] == "Wyoming"
    assert _STATE_BY_CODE["DC"] == "District of Columbia"


# -- graduation windows vs Dec 2027 ------------------------------------------

def gw(cfg, text):
    prof = Profile(uid="g", graduation="2027-12", role_families=["software"], tracks=["newgrad"])
    p = post(title="Software Engineer, New Grad", location="Remote", track="newgrad")
    return Scorer(prof, cfg).score(p, Screen(status="screened", grad_window=text)).reasons


@pytest.mark.parametrize("text", ["graduating in December 2027 or later", "expected graduation 2028",
                                  "Fall 2027 graduates"])
def test_grad_window_ok(cfg, text):
    assert "Graduation window matches Dec 2027" in gw(cfg, text)


def test_grad_window_may_2027_is_too_early(cfg):
    assert "Graduation window looks earlier than yours" in gw(cfg, "graduating between Dec 2026 and May 2027")


def test_junior_2027_is_not_june():
    assert grad_mentions("Junior 2027 standing") == [(2027, 12, True)]


# -- locations: the IN code must not match the word "in" ---------------------

@pytest.mark.parametrize("location,hit", [
    ("Remote in USA", False),
    ("Indianapolis, IN", True),
    ("Fort Wayne, Indiana", True),
    ("Phoenix, Arizona", True),
    ("Tempe, AZ", True),
])
def test_preferred_locations(cfg, location, hit):
    prof = Profile(uid="l", locations=["IN", "Phoenix, AZ"], role_families=["software"], tracks=["intern"],
                   terms_available=["Summer 2027"])
    r = Scorer(prof, cfg).score(post(company="A", location=location, terms=["Summer 2027"]), Screen())
    assert ("In your preferred location" in r.reasons) is hit


# -- sponsorship gating ------------------------------------------------------

def citizen_case(cfg, needs):
    prof = Profile(uid="s", needs_sponsorship=needs, role_families=["software"], tracks=["intern"],
                   terms_available=["Summer 2027"])
    p = post(company="Lockheed Martin", title="Software Engineer Intern", location="Denver, CO",
             terms=["Summer 2027"])
    return Scorer(prof, cfg).score(p, Screen(status="screened", citizen=True))


def test_sponsor_needing_user_penalized_for_citizenship(cfg):
    assert citizen_case(cfg, True).score < citizen_case(cfg, False).score - 50


def test_citizenship_informational_without_sponsorship(cfg):
    r = citizen_case(cfg, False)
    assert any("Mentions U.S. citizenship" in x for x in r.reasons)
    assert not any("Defense" in x for x in r.reasons)


def test_no_cap_exempt_bonus_without_sponsorship(cfg):
    prof = Profile(uid="c", needs_sponsorship=False, role_families=["software"], tracks=["intern"],
                   terms_available=["Summer 2027"])
    p = post(company="Arizona State University", location="Tempe, AZ", terms=["Summer 2027"])
    assert not any("Cap-exempt" in x for x in Scorer(prof, cfg).score(p, Screen()).reasons)


# -- hidden companies and excluded keywords ----------------------------------

def test_hidden_company_excluded(cfg):
    prof = Profile(uid="b", role_families=["software"], tracks=["intern"], hidden=["Acme"])
    assert Scorer(prof, cfg).score(post(company="Acme Inc"), Screen()).excluded == "Company you hid"


def test_exclude_keyword_beats_core(cfg):
    prof = Profile(uid="b", role_families=["software"], tracks=["intern"], exclude_keywords=["automotive"])
    r = Scorer(prof, cfg).score(post(company="Z", title="Automotive Software Intern"), Screen())
    assert r.excluded.startswith("Matches a keyword you excluded")


def test_product_family_lifts_avoid(cfg):
    prof = Profile(uid="pm", role_families=["product"], tracks=["intern"])
    assert Scorer(prof, cfg).score(post(company="Z", title="Product Manager Intern"), Screen()).tier == "core"
