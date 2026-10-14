import { formatDistanceToNowStrict } from "date-fns";
import { collection, deleteDoc, doc, onSnapshot, type Timestamp } from "firebase/firestore";
import { Compass, Rss, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { db } from "../../lib/firebase";

interface GlobalRun {
  lastRunAt?: Timestamp | null;
  durationSec?: number;
  rawPostings?: number;
  uniqueRoles?: number;
  screened?: number;
  usersServed?: number;
  sourcesOk?: number;
  failedSources?: Record<string, string>;
  firestoreWrites?: number;
  firestoreReads?: number;
  feedRequests?: Record<string, number>;
}

interface Feed {
  id: string;
  company?: string;
  ats?: string;
  origin?: "config" | "user";
  status?: "ok" | "failed" | "pending";
  lastError?: string;
  lastCheckedAt?: Timestamp | null;
  earlyCareerCount?: number;
}

const ago = (ts?: Timestamp | null) => {
  try {
    return ts ? formatDistanceToNowStrict(ts.toDate(), { addSuffix: true }) : "never";
  } catch {
    return "never";
  }
};

const statusCls: Record<string, string> = {
  ok: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-red-500/15 text-red-300",
  pending: "bg-white/10 text-slate-300",
};

/** Discover collector health (`collectorRuns/_global`) and the shared company feeds. */
const CollectorHealth: React.FC = () => {
  const [run, setRun] = useState<GlobalRun | null>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    const unsubRun = onSnapshot(
      doc(db, "collectorRuns", "_global"),
      (snap) => setRun(snap.exists() ? (snap.data() as GlobalRun) : null),
      (e) => setError(e.message),
    );
    const unsubFeeds = onSnapshot(
      collection(db, "companyFeeds"),
      (snap) =>
        setFeeds(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Feed)
            .sort((a, b) => (a.status === "failed" ? -1 : 0) - (b.status === "failed" ? -1 : 0) || (a.company ?? "").localeCompare(b.company ?? "")),
        ),
      (e) => setError(e.message),
    );
    return () => {
      unsubRun();
      unsubFeeds();
    };
  }, []);

  const remove = async (f: Feed) => {
    if (!window.confirm(`Stop collecting from ${f.company ?? f.id} for everyone?`)) return;
    setRemoving(f.id);
    try {
      await deleteDoc(doc(db, "companyFeeds", f.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRemoving(null);
    }
  };

  const failed = Object.entries(run?.failedSources ?? {});
  const tiles = [
    { label: "Last run", val: ago(run?.lastRunAt) },
    { label: "Duration", val: run?.durationSec != null ? `${Math.round(run.durationSec)}s` : "-" },
    { label: "Users served", val: run?.usersServed ?? "-" },
    { label: "Roles found", val: run?.uniqueRoles?.toLocaleString() ?? "-" },
    { label: "Writes", val: run?.firestoreWrites?.toLocaleString() ?? "-" },
    { label: "Failed sources", val: failed.length },
  ];

  return (
    <div className="md:col-span-2 lg:col-span-4 premium-glass p-6 sm:p-8 rounded-3xl border border-white/5 shadow-2xl space-y-6">
      <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
        <Compass className="w-4 h-4 text-blue-400" /> Discover collector
      </h3>
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="bg-black/20 border border-white/5 rounded-2xl px-4 py-3">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t.label}</p>
            <p className="text-lg font-black text-white mt-0.5">{t.val}</p>
          </div>
        ))}
      </div>
      {failed.length > 0 && (
        <ul className="space-y-1 text-xs">
          {failed.map(([src, err]) => (
            <li key={src} className="text-red-300">
              <span className="font-bold">{src}</span>: <span className="text-slate-300">{err}</span>
            </li>
          ))}
        </ul>
      )}

      <div>
        <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 mb-3">
          <Rss className="w-3.5 h-3.5 text-blue-400" /> Company feeds ({feeds.length})
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] font-black text-slate-300 uppercase tracking-widest">
                <th className="py-2 pr-3">Company</th>
                <th className="py-2 pr-3">Board</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Early-career</th>
                <th className="py-2 pr-3">Checked</th>
                <th className="py-2 pr-3">Last error</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {feeds.map((f) => (
                <tr key={f.id} className="text-slate-200">
                  <td className="py-2 pr-3 font-bold text-white">{f.company ?? f.id}</td>
                  <td className="py-2 pr-3">
                    {f.ats}
                    {f.origin === "config" && <span className="ml-1.5 text-[10px] text-slate-400">(config)</span>}
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`px-2 py-0.5 rounded-full font-bold ${statusCls[f.status ?? "pending"] ?? statusCls.pending}`}>
                      {f.status ?? "pending"}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{f.earlyCareerCount ?? "-"}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{ago(f.lastCheckedAt)}</td>
                  <td className="py-2 pr-3 text-slate-400 max-w-[280px] truncate" title={f.lastError}>
                    {f.lastError || ""}
                  </td>
                  <td className="py-2 text-right">
                    {f.origin !== "config" && (
                      <button
                        onClick={() => remove(f)}
                        disabled={removing === f.id}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                        title="Remove feed"
                        aria-label={`Remove ${f.company ?? f.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {feeds.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-slate-400">
                    No feeds yet. The collector lists its config feeds here after its first run.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Config feeds live in the collector's config.yaml; remove them there.
        </p>
      </div>
    </div>
  );
};

export default CollectorHealth;
