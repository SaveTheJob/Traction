from collector.models import Posting, Screen
from collector.profile import Profile, valid_webhook
from collector.score import Scorer

FAMS = {"software", "embedded", "hardware"}


def junk_profile(cfg):
    junk = {"enabled": True, "tracks": ["intern", "evil"], "graduation": "2027-13", "minScore": 5,
            "roleFamilies": ["software", "nope"], "includeKeywords": ["(a+)+$", "x"] * 40 + [{"a": 1}],
            "companies": {"warm": "notalist", "hidden": [str(i) for i in range(500)]},
            "alerts": {"webhook": "http://192.168.1.1/x"}, "needsSponsorship": "yes"}
    return Profile.from_doc("u1", junk, set(cfg["role_families"]))


def test_junk_doc_is_cleaned(cfg):
    p = junk_profile(cfg)
    assert p.tracks == ["intern"]
    assert p.graduation == ""
    assert p.min_score == 40
    assert p.role_families == ["software"]
    assert p.include_keywords == ["(a+)+$", "x"]
    assert p.warm == []


def test_hidden_capped_at_100(cfg):
    assert len(junk_profile(cfg).hidden) == 100


def test_bad_webhook_dropped(cfg):
    assert junk_profile(cfg).webhook == ""


def test_non_bool_sponsorship_is_false(cfg):
    assert junk_profile(cfg).needs_sponsorship is False


def test_caps_keywords_and_terms():
    d = {"includeKeywords": [f"k{i}" for i in range(80)], "excludeKeywords": [f"e{i}" for i in range(80)],
         "companies": {"warm": [f"w{i}" for i in range(150)], "target": [f"t{i}" for i in range(150)]},
         "terms": {"available": [f"Summer {2000 + i}" for i in range(30)],
                   "partTime": [f"Fall {2000 + i}" for i in range(30)]}}
    p = Profile.from_doc("u", d, FAMS)
    assert len(p.include_keywords) == 50 and len(p.exclude_keywords) == 50
    assert len(p.warm) == 100 and len(p.target) == 100
    assert len(p.terms_available) == 12 and len(p.terms_part_time) == 12


def test_reads_hidden_and_alerts():
    d = {"enabled": True, "companies": {"hidden": ["Acme"], "warm": ["W"], "target": ["T"]},
         "alerts": {"webhook": "https://ntfy.sh/my-topic", "minScore": 85}}
    p = Profile.from_doc("u", d, FAMS)
    assert p.hidden == ["Acme"] and p.warm == ["W"] and p.target == ["T"]
    assert p.webhook == "https://ntfy.sh/my-topic"
    assert p.notify_min_score == 85


def test_to_doc_has_exactly_the_settings_keys():
    doc = Profile(uid="u", hidden=["Acme"], webhook="https://ntfy.sh/t", notify_min_score=80).to_doc()
    assert set(doc) == {"enabled", "tracks", "graduation", "terms", "needsSponsorship", "locations",
                        "roleFamilies", "includeKeywords", "excludeKeywords", "companies", "minScore", "alerts"}
    assert set(doc["terms"]) == {"available", "partTime"}
    assert set(doc["locations"]) == {"preferred", "remoteOk"}
    assert doc["companies"] == {"warm": [], "target": [], "hidden": ["Acme"]}
    assert doc["alerts"] == {"webhook": "https://ntfy.sh/t", "minScore": 80}


def test_to_doc_round_trips():
    p = Profile(uid="u", tracks=["newgrad"], graduation="2027-12", needs_sponsorship=True, hidden=["Acme"],
                role_families=["software"], webhook="https://ntfy.sh/t", notify_min_score=75, min_score=55)
    assert Profile.from_doc("u", p.to_doc(), FAMS) == p


def test_no_plan_attribute():
    p = Profile(uid="u")
    assert not hasattr(p, "plan")
    assert "plan" not in p.to_doc()


def test_from_yaml_maps_old_and_new_names(cfg):
    old = {"profile": {"role_families": ["software"], "companies": {"blocked": ["Acme"]},
                       "webhook": "https://ntfy.sh/t", "notify_min_score": 90}}
    p = Profile.from_yaml("u", old, cfg["role_families"])
    assert p.hidden == ["Acme"] and p.webhook == "https://ntfy.sh/t" and p.notify_min_score == 90
    new = {"profile": {"role_families": ["software"], "companies": {"hidden": ["Beta"]}}}
    assert Profile.from_yaml("u", new, cfg["role_families"]).hidden == ["Beta"]


def test_webhooks():
    assert valid_webhook("https://discord.com/api/webhooks/123/abc-DEF_1")
    assert valid_webhook("https://ntfy.sh/my-topic")
    for w in ["https://evil.com/api/webhooks/1/a", "http://discord.com/api/webhooks/1/a", "https://ntfy.sh/a/../b",
              "https://discord.com.evil.com/api/webhooks/1/a", "https://ntfy.example.com/topic"]:
        assert not valid_webhook(w), w


def test_regex_keyword_stays_literal(cfg):
    p = junk_profile(cfg)
    post = Posting(company="Acme", title="(a+)+$ Software Engineer Intern aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!",
                   location="Austin, TX", url="https://x", source="t", track="intern", terms=["Summer 2027"])
    r = Scorer(p, cfg).score(post, Screen())
    assert any("Matches your keyword: (a+)+$" in x for x in r.reasons)
