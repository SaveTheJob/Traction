"""Three full collector runs against the Firestore emulator (no network, no live project).

    firebase emulators:start --only firestore --project demo-offerward   (from tests/rules/)
    FIRESTORE_EMULATOR_HOST=127.0.0.1:8086 .venv/bin/python -m pytest -m emulator -q
"""

import json
import os
import time
from datetime import datetime, timedelta, timezone

import pytest
import requests
import yaml

from collector import runner
from collector.models import Posting

from .conftest import ROOT

pytestmark = pytest.mark.emulator

PROJECT = "demo-offerward"
HOST = os.environ.get("FIRESTORE_EMULATOR_HOST", "")
NOW = time.time()
WATCHLIST = [{"company": "Axon", "ats": "greenhouse", "token": "axon"},
             {"company": "Zoox", "ats": "lever", "token": "zoox"}]
TITLES = ["Software Engineer Intern", "Firmware Engineer Intern", "Backend Engineer Intern",
          "Software Development Intern", "Embedded Software Intern", "Platform Engineer Intern"]


def P(company, title, track="intern", hints=()):
    return Posting(company=company, title=title, location="Austin, TX",
                   url=f"https://jobs.example.org/{company}/{title}".replace(" ", "-"),
                   source=f"simplify-{track}", track=track, posted_ts=NOW - 86400,
                   terms=["Summer 2027"] if track == "intern" else [], hints=set(hints))


def postings(include_newgrad=True):
    out = [P(f"Company {i}", t) for i, t in enumerate(TITLES * 3)]
    out += [P("Defense Works", "Software Engineer Intern", hints={"citizen"}),
            P("HiddenCo", "Software Engineer Intern"), P("WarmCo", "Software Engineer Intern")]
    if include_newgrad:  # uB only (uA doesn't pick newgrad); closes before run 2
        out.append(P("Newco", "Software Engineer, New Grad", track="newgrad"))
    return out


def fake_gather(include_newgrad):
    def gather(cfg, watchlist):
        ok = {"simplify-intern", "simplify-newgrad", "greenhouse:axon"}
        return postings(include_newgrad), ok, {"lever:zoox": "HTTP 500"}, {"greenhouse:axon": 3}
    return gather


def settings(enabled, needs, tracks, **companies):
    return {"enabled": enabled, "tracks": tracks, "graduation": "2027-12",
            "terms": {"available": ["Summer 2027"], "partTime": []}, "needsSponsorship": needs,
            "locations": {"preferred": [], "remoteOk": True}, "roleFamilies": ["software", "embedded"],
            "includeKeywords": [], "excludeKeywords": [],
            "companies": {"warm": companies.get("warm", []), "target": [], "hidden": companies.get("hidden", [])},
            "minScore": 40, "alerts": {"webhook": "", "minScore": 70}, "updatedAt": datetime.now(timezone.utc)}


def fake_service_account(path):
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                            serialization.NoEncryption()).decode()
    path.write_text(json.dumps({
        "type": "service_account", "project_id": PROJECT, "private_key_id": "fake", "private_key": pem,
        "client_email": f"collector@{PROJECT}.iam.gserviceaccount.com", "client_id": "1",
        "token_uri": "https://oauth2.googleapis.com/token",
    }))


@pytest.fixture(scope="module")
def env(tmp_path_factory):
    if not HOST:
        pytest.skip("FIRESTORE_EMULATOR_HOST is not set")
    import firebase_admin
    from google.auth.credentials import AnonymousCredentials
    from google.cloud import firestore

    tmp = tmp_path_factory.mktemp("emu")
    requests.delete(f"http://{HOST}/emulator/v1/projects/{PROJECT}/databases/(default)/documents",
                    timeout=10).raise_for_status()
    fake_service_account(tmp / "fake-sa.json")
    raw = yaml.safe_load((ROOT / "config.example.yaml").read_text())
    raw["traction"].update(service_account=str(tmp / "fake-sa.json"), beta_allowlist=[])
    raw["settings"].update(db_path=str(tmp / "state.db"), report_dir=str(tmp))
    raw["settings"]["screen"]["enabled"] = False  # screening would fetch posting pages
    raw["sources"], raw["watchlist"] = [], WATCHLIST
    (tmp / "config.yaml").write_text(yaml.safe_dump(raw))

    db = firestore.Client(project=PROJECT, credentials=AnonymousCredentials())
    users = db.collection("users")
    users.document("uA").collection("discover").document("settings").set(
        settings(True, True, ["intern"], hidden=["HiddenCo"], warm=["WarmCo"]))
    users.document("uB").collection("discover").document("settings").set(settings(True, False, ["intern", "newgrad"]))
    users.document("uC").collection("discover").document("settings").set(settings(False, False, ["intern"]))
    users.document("uB").collection("feedRequests").document("r1").set(
        {"company": "Example", "url": "https://example.com", "status": "pending",
         "createdAt": datetime.now(timezone.utc)})
    yield {"db": db, "cfg_path": str(tmp / "config.yaml"), "db_path": str(tmp / "state.db")}
    for app in list(firebase_admin._apps.values()):
        firebase_admin.delete_app(app)


def do_run(env, monkeypatch, include_newgrad):
    from collector import config as C
    monkeypatch.setattr(runner, "gather", fake_gather(include_newgrad))
    return runner.run(C.load(env["cfg_path"]))


def feed_doc(db, uid):
    return db.collection("users").document(uid).collection("discover").document("feed").get()


def by_company(snap):
    return {c["company"]: c for c in snap.to_dict()["cards"]}


@pytest.fixture(scope="module")
def first(env):
    mp = pytest.MonkeyPatch()
    summary = do_run(env, mp, include_newgrad=True)
    mp.undo()
    db = env["db"]
    return {"summary": summary, "uA": feed_doc(db, "uA"), "uB": feed_doc(db, "uB"),
            "feeds": {s.id: s for s in db.collection("feeds").stream()}}


def test_feeds_written_for_enabled_users(env, first):
    for uid in ("uA", "uB"):
        snap = first[uid]
        assert snap.exists
        d = snap.to_dict()
        assert d["cap"] == 300 and d["failedSources"] == 1 and d["totalMatches"] > 0
        scores = [c["score"] for c in d["cards"]]
        assert scores and scores == sorted(scores, reverse=True)
    assert not feed_doc(env["db"], "uC").exists


def test_sponsorship_hidden_and_warm(first):
    a, b = by_company(first["uA"]), by_company(first["uB"])
    assert not any(c["flags"]["citizen"] for c in a.values())
    assert b["Defense Works"]["flags"]["citizen"] is True
    assert "HiddenCo" not in a and "HiddenCo" in b
    assert "Warm lead (you have a contact)" in a["WarmCo"]["reasons"]
    assert "Newco" not in a and "Newco" in b


def test_feed_request_rejected(env, first):
    r1 = env["db"].document("users/uB/feedRequests/r1").get().to_dict()
    assert r1["status"] == "rejected" and r1["reason"] and r1["duplicate"] is False and r1["feedId"] == ""
    assert r1["processedAt"] is not None


def test_system_docs(env, first):
    disc = env["db"].document("system/discover").get().to_dict()
    assert {"id": "software", "label": "Software engineering"} in disc["roleFamilies"]
    assert disc["inviteOnly"] is False and disc["updatedAt"]
    run = env["db"].document("system/health").get().to_dict()["lastRun"]
    assert set(run) == {"at", "durationSec", "rawPostings", "uniqueRoles", "usersServed", "reads", "writes",
                        "failedSources"}
    assert run["usersServed"] == 2 and run["failedSources"] == {"lever:zoox": "HTTP 500"}


def test_config_feeds_mirrored(first):
    feeds = {k: v.to_dict() for k, v in first["feeds"].items()}
    assert set(feeds) == {"greenhouse-axon", "lever-zoox"}
    assert feeds["greenhouse-axon"]["origin"] == "config"
    assert feeds["greenhouse-axon"]["status"] == "ok" and feeds["greenhouse-axon"]["earlyCareerCount"] == 3
    assert feeds["lever-zoox"]["status"] == "failing" and feeds["lever-zoox"]["lastError"] == "HTTP 500"


@pytest.fixture(scope="module")
def second(env, first):
    db = env["db"]
    b = by_company(first["uB"])
    k_dismissed, k_expired, k_saved = (b["Company 0"]["roleKey"], b["Company 1"]["roleKey"],
                                       b["Newco"]["roleKey"])
    now = datetime.now(timezone.utc)
    db.document("users/uB/discover/triage").set({"cards": {
        k_dismissed: {"status": "dismissed", "at": now - timedelta(days=40)},
        k_expired: {"status": "dismissed", "at": now - timedelta(days=200)},
        k_saved: {"status": "saved", "jobId": "job1", "at": now},
    }, "updatedAt": now})
    mp = pytest.MonkeyPatch()
    summary = do_run(env, mp, include_newgrad=False)  # Newco closes
    mp.undo()
    return {"summary": summary, "uA": feed_doc(db, "uA"), "uB": feed_doc(db, "uB"),
            "feeds": {s.id: s for s in db.collection("feeds").stream()},
            "keys": (k_dismissed, k_expired, k_saved)}


def test_triage_applied(env, second):
    k_dismissed, k_expired, k_saved = second["keys"]
    cards = {c["roleKey"]: c for c in second["uB"].to_dict()["cards"]}
    assert k_dismissed not in cards and k_expired not in cards
    assert k_saved in cards and cards[k_saved]["closed"] is True
    triage = env["db"].document("users/uB/discover/triage").get().to_dict()["cards"]
    assert set(triage) == {k_dismissed, k_saved}  # the 200-day dismissal was deleted


def test_unchanged_feed_not_rewritten(first, second):
    assert second["uA"].update_time == first["uA"].update_time
    assert second["uA"].to_dict()["refreshedAt"] == first["uA"].to_dict()["refreshedAt"]
    assert second["uB"].update_time != first["uB"].update_time
    for fid in ("greenhouse-axon", "lever-zoox"):  # status, count and error unchanged
        assert second["feeds"][fid].update_time == first["feeds"][fid].update_time


def test_due_followups_single_filter(env, second):
    from collector.firestore_sync import FirestoreSync
    jobs = env["db"].collection("users").document("uB").collection("jobs")
    now = datetime.now(timezone.utc)
    base = {"company": "Acme", "title": "Intern", "url": "https://acme.example/1"}
    jobs.document("due").set({**base, "status": "applied", "appliedAt": now - timedelta(days=10),
                              "followedUpAt": None})
    jobs.document("followed").set({**base, "status": "applied", "appliedAt": now - timedelta(days=10),
                                   "followedUpAt": now})
    jobs.document("recent").set({**base, "status": "applied", "appliedAt": now - timedelta(days=2),
                                 "followedUpAt": None})
    jobs.document("saved").set({**base, "status": "saved", "appliedAt": None, "followedUpAt": None})
    due = FirestoreSync("").due_followups("uB", 7)  # reuses the app the runs initialized
    assert due == [{"company": "Acme", "title": "Intern", "days": 10, "url": "https://acme.example/1"}]


@pytest.fixture(scope="module")
def third(env, second):
    db = env["db"]
    db.document("users/uA/discover/settings").update({"enabled": False})
    mp = pytest.MonkeyPatch()
    summary = do_run(env, mp, include_newgrad=False)
    mp.undo()
    return {"summary": summary, "uA": feed_doc(db, "uA"), "uB": feed_doc(db, "uB")}


def test_feed_deleted_when_discover_turned_off(env, third):
    from collector.store import Store
    assert third["summary"]["usersServed"] == 1
    assert not third["uA"].exists  # turned off between runs: the stale feed is gone
    assert third["uB"].exists
    assert Store(env["db_path"]).known_uids() == {"uB"}  # forgotten after the delete committed
