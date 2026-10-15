import pytest
import yaml

from collector import __main__ as cli
from collector import notify

from .conftest import ROOT

HOOK = "https://ntfy.sh/offerward-admin"


class FakeSession:
    def __init__(self):
        self.posts = []

    def post(self, url, **kw):
        self.posts.append((url, kw))
        return type("R", (), {"raise_for_status": lambda self: None})()


@pytest.fixture
def session(monkeypatch):
    s = FakeSession()
    monkeypatch.setattr(notify, "SESSION", s)
    return s


@pytest.fixture
def config_path(tmp_path):
    raw = yaml.safe_load((ROOT / "config.example.yaml").read_text())
    raw["notify"] = {"admin_webhook": HOOK}
    raw["settings"].update(db_path=str(tmp_path / "state.db"), report_dir=str(tmp_path))
    p = tmp_path / "config.yaml"
    p.write_text(yaml.safe_dump(raw))
    return str(p)


def test_admin_alert_posts_to_valid_webhook_only(session):
    notify.send_admin_alert(HOOK, "Offerward collector run failed", ["boom"])
    notify.send_admin_alert("https://evil.com/hook", "x", ["y"])
    notify.send_admin_alert("", "x", ["y"])
    assert len(session.posts) == 1
    url, kw = session.posts[0]
    assert url == HOOK and kw["headers"]["Title"] == "Offerward collector run failed" and kw["data"] == b"boom"


def test_digest_reads_cards(session):
    card = {"score": 88, "company": "Acme", "title": "Firmware Intern", "location": "", "track": "intern",
            "url": "https://x/1"}
    notify.send_digest("https://discord.com/api/webhooks/1/a", [card], [], "https://app")
    content = session.posts[0][1]["json"]["content"]
    assert content.startswith("**Offerward: 1 new matches**")
    assert "[88] Acme: Firmware Intern (n/a, Intern)" in content and "<https://app/discover>" in content


def test_run_failure_alerts_admin(session, config_path, monkeypatch):
    def boom(*a, **kw):
        raise RuntimeError("firestore down")
    monkeypatch.setattr(cli, "run", boom)
    with pytest.raises(RuntimeError):
        cli.main(["--config", config_path, "run"])
    assert session.posts[0][1]["headers"]["Title"] == "Offerward collector run failed"
    assert b"firestore down" in session.posts[0][1]["data"]


def test_failed_sources_alert_admin(session, config_path, monkeypatch):
    monkeypatch.setattr(cli, "run", lambda *a, **kw: {"failedSources": {"lever:zoox": "HTTP 500"}, "sourcesOk": 3})
    assert cli.main(["--config", config_path, "run"]) == 0
    assert session.posts[0][1]["headers"]["Title"] == "Offerward collector: sources failed"
    assert session.posts[0][1]["data"] == b"lever:zoox: HTTP 500"


def test_dry_run_sends_no_alert(session, config_path, monkeypatch):
    monkeypatch.setattr(cli, "run", lambda *a, **kw: {"failedSources": {"x": "y"}, "sourcesOk": 1})
    cli.main(["--config", config_path, "run", "--dry-run"])
    assert session.posts == []
