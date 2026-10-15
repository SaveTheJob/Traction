import pytest

from collector.firestore_sync import Writer


class FakeBatch:
    def __init__(self, db):
        self.db, self.ops = db, []

    def set(self, ref, data, merge=False):
        self.ops.append(ref)

    def commit(self):
        if self.db.fail:
            self.db.fail = False
            raise RuntimeError("commit failed")
        self.db.committed += self.ops


class FakeDB:
    def __init__(self):
        self.fail, self.committed = False, []

    def batch(self):
        return FakeBatch(self)


def test_failed_batch_is_dropped_and_callbacks_skipped():
    db = FakeDB()
    w = Writer(db)
    done = []
    w.set("a", {}, after=lambda: done.append("a"))
    db.fail = True
    with pytest.raises(RuntimeError):
        w.flush()
    w.set("b", {}, after=lambda: done.append("b"))
    w.flush()
    assert db.committed == ["b"] and done == ["b"]
