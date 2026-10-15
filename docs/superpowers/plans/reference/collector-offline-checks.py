import sys
from collector import config as C
from collector.feeds import entry_from_url, feed_id, FeedError
from collector.profile import Profile, valid_webhook
from collector.score import Scorer, grad_mentions, _STATE_BY_CODE
from collector.models import Posting, Screen

cfg = C.load(sys.argv[1])
fails = 0
def check(name, cond):
    global fails
    print(("PASS " if cond else "FAIL ") + name)
    fails += not cond

# state table alignment
check("state codes align", _STATE_BY_CODE["IN"] == "Indiana" and _STATE_BY_CODE["WY"] == "Wyoming" and _STATE_BY_CODE["DC"] == "District of Columbia")

# feed URL parsing
ok = {
 "https://nxp.wd3.myworkdayjobs.com/en-US/careers/job/Austin/Intern_R-123": ("workday", "nxp", "careers"),
 "https://wd5.myworkdaysite.com/recruiting/microchiphr/External/job/x": ("workday", "microchiphr", "External"),
 "https://job-boards.greenhouse.io/axon/jobs/123": ("greenhouse", "axon", None),
 "https://boards.greenhouse.io/embed/job_board?for=stripe": ("greenhouse", "stripe", None),
 "jobs.lever.co/zoox/abc": ("lever", "zoox", None),
 "https://jobs.ashbyhq.com/openai": ("ashby", "openai", None),
 "https://jobs.smartrecruiters.com/BoschGroup/744000": ("smartrecruiters", "BoschGroup", None),
}
for url, (ats, ident, site) in ok.items():
    e = entry_from_url(url, "")
    check(f"parse {url}", e["ats"] == ats and (e.get("token") or e.get("tenant")) == ident and e.get("site") == site)
bad = ["https://example.com", "http://169.254.169.254/latest", "https://evil.com/jobs.lever.co/x",
       "https://jobs.lever.co.evil.com/x", "https://user@jobs.lever.co/x", "https://jobs.lever.co:8443/x",
       "https://jobs.lever.co/../admin", "https://boards.greenhouse.io/", "file:///etc/passwd",
       "https://x.myworkdayjobs.com.evil.com/a", "https://10.0.0.1.myworkdayjobs.com/a"]
for url in bad:
    try:
        entry_from_url(url); check(f"reject {url}", False)
    except FeedError:
        check(f"reject {url}", True)
check("feed id workday", feed_id(entry_from_url("https://nxp.wd3.myworkdayjobs.com/careers")) == "workday-nxp-careers")

# webhooks
check("discord ok", valid_webhook("https://discord.com/api/webhooks/123/abc-DEF_1"))
check("ntfy ok", valid_webhook("https://ntfy.sh/my-topic"))
for w in ["https://evil.com/api/webhooks/1/a", "http://discord.com/api/webhooks/1/a", "https://ntfy.sh/a/../b",
          "https://discord.com.evil.com/api/webhooks/1/a", "https://ntfy.example.com/topic"]:
    check(f"webhook reject {w}", not valid_webhook(w))

# profile validation: caps, junk types, regex-y input stays literal
fams = set(cfg["role_families"])
junk = {"enabled": True, "tracks": ["intern", "evil"], "graduation": "2027-13", "minScore": 5,
        "roleFamilies": ["software", "nope"], "includeKeywords": ["(a+)+$", "x"] * 40 + [{"a": 1}],
        "companies": {"warm": "notalist", "blocked": [str(i) for i in range(500)]},
        "notify": {"webhook": "http://192.168.1.1/x"}, "needsSponsorship": "yes"}
p = Profile.from_doc("u1", junk, fams)
check("tracks filtered", p.tracks == ["intern"])
check("bad graduation dropped", p.graduation == "")
check("minScore clamped", p.min_score == 40)
check("families filtered", p.role_families == ["software"])
check("keywords deduped/capped", p.include_keywords == ["(a+)+$", "x"])
check("blocked capped at 100", len(p.blocked) == 100)
check("warm non-list ignored", p.warm == [])
check("bad webhook dropped", p.webhook == "")
check("non-bool sponsorship -> False", p.needs_sponsorship is False)
sc = Scorer(p, cfg)
post = Posting(company="Acme", title="(a+)+$ Software Engineer Intern aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!", location="Austin, TX",
               url="https://x", source="t", track="intern", terms=["Summer 2027"])
r = sc.score(post, Screen())
check("literal keyword matched as text", any("Matches your keyword: (a+)+$" in x for x in r.reasons))

# grad windows vs Dec 2027
def gw(text):
    prof = Profile(uid="g", graduation="2027-12", role_families=["software"], tracks=["newgrad"])
    s = Scorer(prof, cfg)
    post = Posting(company="Acme", title="Software Engineer, New Grad", location="Remote", url="https://x", source="t", track="newgrad")
    return s.score(post, Screen(status="screened", grad_window=text)).reasons
check("Dec 2027 ok", "Graduation window matches Dec 2027" in gw("graduating in December 2027 or later"))
check("2028 ok", "Graduation window matches Dec 2027" in gw("expected graduation 2028"))
check("May 2027 bad", "Graduation window looks earlier than yours" in gw("graduating between Dec 2026 and May 2027"))
check("Fall 2027 ok", "Graduation window matches Dec 2027" in gw("Fall 2027 graduates"))
check("Junior 2027 is not June", grad_mentions("Junior 2027 standing") == [(2027, 12, True)])

# locations: IN code must not match "in"
prof = Profile(uid="l", locations=["IN", "Phoenix, AZ"], role_families=["software"], tracks=["intern"], terms_available=["Summer 2027"])
s = Scorer(prof, cfg)
def loc(l):
    return "In your preferred location" in s.score(Posting(company="A", title="Software Intern", location=l, url="https://x", source="t", track="intern", terms=["Summer 2027"]), Screen()).reasons
check("Remote in USA not Indiana", not loc("Remote in USA"))
check("Indianapolis, IN matches", loc("Indianapolis, IN"))
check("Indiana matches", loc("Fort Wayne, Indiana"))
check("Phoenix matches", loc("Phoenix, Arizona"))
check("Tempe, AZ matches via code", loc("Tempe, AZ"))

# sponsorship gating
def citizen_case(needs):
    prof = Profile(uid="s", needs_sponsorship=needs, role_families=["software"], tracks=["intern"], terms_available=["Summer 2027"])
    post = Posting(company="Lockheed Martin", title="Software Engineer Intern", location="Denver, CO", url="https://x", source="t", track="intern", terms=["Summer 2027"])
    return Scorer(prof, cfg).score(post, Screen(status="screened", citizen=True))
a, b = citizen_case(True), citizen_case(False)
check("sponsor-needing user penalized", a.score < b.score - 50)
check("non-sponsor user: informational reason, no defense penalty", any("Mentions U.S. citizenship" in x for x in b.reasons) and not any("Defense" in x for x in b.reasons))
prof = Profile(uid="c", needs_sponsorship=False, role_families=["software"], tracks=["intern"], terms_available=["Summer 2027"])
r = Scorer(prof, cfg).score(Posting(company="Arizona State University", title="Software Intern", location="Tempe, AZ", url="https://x", source="t", track="intern", terms=["Summer 2027"]), Screen())
check("no cap-exempt bonus without sponsorship", not any("Cap-exempt" in x for x in r.reasons))
# blocked + excluded keywords
prof = Profile(uid="b", role_families=["software"], tracks=["intern"], blocked=["Acme"], exclude_keywords=["automotive"])
s = Scorer(prof, cfg)
check("blocked company excluded", s.score(Posting(company="Acme Inc", title="Software Intern", location="", url="https://x", source="t", track="intern"), Screen()).excluded == "Company you hid")
check("exclude keyword beats core", s.score(Posting(company="Z", title="Automotive Software Intern", location="", url="https://x", source="t", track="intern"), Screen()).excluded.startswith("Matches a keyword you excluded"))
# product user isn't avoided
prof = Profile(uid="pm", role_families=["product"], tracks=["intern"])
check("product family lifts avoid", Scorer(prof, cfg).score(Posting(company="Z", title="Product Manager Intern", location="", url="https://x", source="t", track="intern"), Screen()).tier == "core")
print("\nFAILURES:", fails)
sys.exit(1 if fails else 0)
