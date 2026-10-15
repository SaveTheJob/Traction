import sqlite3

from collector.store import Store

OLD = """
CREATE TABLE roles (key TEXT PRIMARY KEY, company TEXT NOT NULL, title TEXT NOT NULL, location TEXT, url TEXT,
  track TEXT, terms TEXT, category TEXT, sources TEXT, hints TEXT, posted_ts REAL, first_seen REAL NOT NULL,
  last_seen REAL NOT NULL, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE pushes (uid TEXT NOT NULL, key TEXT NOT NULL, score INTEGER NOT NULL, active INTEGER NOT NULL,
  closed INTEGER NOT NULL, flags TEXT NOT NULL, pushed_at REAL NOT NULL, deleted_at REAL, PRIMARY KEY (uid, key));
INSERT INTO roles VALUES ('k','Co','Eng','X','u','intern','[]','c','["s"]','[]',1,1,1,1);
INSERT INTO pushes VALUES ('u1','k',50,1,0,'{}',1,NULL);
"""


def test_migrates_old_db(tmp_path):
    p = tmp_path / "old.db"
    con = sqlite3.connect(p)
    con.executescript(OLD)
    con.commit()
    con.close()
    s = Store(p)
    cols = {r["name"] for r in s.db.execute("PRAGMA table_info(roles)")}
    assert "closed_at" in cols
    tables = {r[0] for r in s.db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert "pushes" not in tables and "feeds_written" in tables
    assert s.get("k")["closed_at"] is None
    s.save_feed("u1", {"k": {"score": 1}})
    assert s.last_feed("u1") == {"k": {"score": 1}} and s.last_feed("zz") is None
    Store(p)  # second open is a no-op
