import { formatDistanceToNowStrict } from "date-fns";
import { deleteDoc, onSnapshot } from "firebase/firestore";
import { Compass, Rss, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { recordAdminLog } from "../../lib/adminLogger";
import { refs, toDate } from "../../lib/db";

interface LastRun {
  at: Date | null;
  durationSec?: number;
  rawPostings?: number;
  uniqueRoles?: number;
  usersServed?: number;
  writes?: number;
  failedSources?: Record<string, string>;
}

interface Feed {
  id: string;
  company: string;
  ats: string;
  origin: "config" | "user";
  status: "ok" | "failing" | "checking";
  lastError: string;
  updatedAt: Date | null;
  earlyCareerCount: number | null;
}

const ago = (d?: Date | null) => {
  try {
    return d ? formatDistanceToNowStrict(d, { addSuffix: true }) : "never";
  } catch {
    return "never";
  }
};

const num = (v: unknown) => (typeof v === "number" ? v : undefined);

const statusCls: Record<string, string> = {
  ok: "bg-emerald-500/15 text-emerald-300",
  failing: "bg-red-500/15 text-red-300",
  checking: "bg-white/10 text-slate-300",
};

/** Discover collector health (`system/health`) and the shared company feeds. */
const CollectorHealth: React.FC = () => {
  const [run, setRun] = useState<LastRun | null>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    const unsubRun = onSnapshot(
      refs.systemHealth(),
      (snap) => {
        const r = snap.data()?.lastRun;
        setRun(
          r
            ? {
                at: toDate(r.at),
                durationSec: num(r.durationSec),
                rawPostings: num(r.rawPostings),
                uniqueRoles: num(r.uniqueRoles),
                usersServed: num(r.usersServed),
                writes: num(r.writes),
                failedSources:
                  r.failedSources && typeof r.failedSources === "object" ? r.failedSources : {},
              }
            : null,
        );
      },
      (e) => setError(e.message),
    );
    const unsubFeeds = onSnapshot(
      refs.feeds(),
      (snap) =>
        setFeeds(
          snap.docs
            .map((d): Feed => {
              const x = d.data();
              return {
                id: d.id,
                company: typeof x.company === "string" ? x.company : d.id,
                ats: typeof x.ats === "string" ? x.ats : "",
                origin: x.origin === "user" ? "user" : "config",
                status: x.status === "failing" || x.status === "checking" ? x.status : "ok",
                lastError: typeof x.lastError === "string" ? x.lastError : "",
                updatedAt: toDate(x.updatedAt),
                earlyCareerCount: num(x.earlyCareerCount) ?? null,
              };
            })
            .sort((a, b) => (a.status === "failing" ? -1 : 0) - (b.status === "failing" ? -1 : 0) || a.company.localeCompare(b.company)),
        ),
      (e) => setError(e.message),
    );
    return () => {
      unsubRun();
      unsubFeeds();
    };
  }, []);

  const remove = async (f: Feed) => {
    if (!window.confirm(`Stop collecting from ${f.company} for everyone?`)) return;
    setRemoving(f.id);
    try {
      await deleteDoc(refs.feed(f.id));
      recordAdminLog("FEED_REMOVED", f.id);
    } catch (e) {
      recordAdminLog("FEED_REMOVED", f.id, "error");
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRemoving(null);
    }
  };

  const failed = Object.entries(run?.failedSources ?? {});
  const tiles = [
    { label: "Last run", val: ago(run?.at) },
    { label: "Duration", val: run?.durationSec != null ? `${Math.round(run.durationSec)}s` : "-" },
    { label: "Users served", val: run?.usersServed ?? "-" },
    { label: "Roles found", val: run?.uniqueRoles?.toLocaleString() ?? "-" },
    { label: "Writes", val: run?.writes?.toLocaleString() ?? "-" },
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
                <th className="py-2 pr-3">Updated</th>
                <th className="py-2 pr-3">Last error</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {feeds.map((f) => (
                <tr key={f.id} className="text-slate-200">
                  <td className="py-2 pr-3 font-bold text-white">{f.company}</td>
                  <td className="py-2 pr-3">
                    {f.ats}
                    {f.origin === "config" && <span className="ml-1.5 text-[10px] text-slate-400">(config)</span>}
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`px-2 py-0.5 rounded-full font-bold ${statusCls[f.status] ?? statusCls.checking}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{f.earlyCareerCount ?? "-"}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{ago(f.updatedAt)}</td>
                  <td className="py-2 pr-3 text-slate-400 max-w-[280px] truncate" title={f.lastError}>
                    {f.lastError || ""}
                  </td>
                  <td className="py-2 text-right">
                    {f.origin === "user" && (
                      <button
                        onClick={() => remove(f)}
                        disabled={removing === f.id}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                        title="Remove feed"
                        aria-label={`Remove ${f.company}`}
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
