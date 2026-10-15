import {
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { History, Lock, ShieldAlert } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { AdminAction, AdminOutcome } from "../../lib/adminLogger";
import { refs, toDate } from "../../lib/db";

interface AdminLog {
  id: string;
  action: AdminAction;
  actorEmail: string;
  target: string;
  outcome: AdminOutcome;
  createdAt: Date | null;
}

const SecurityPulse: React.FC = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      refs.adminLogs(),
      orderBy("createdAt", "desc"),
      limit(20),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(
        snapshot.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            action: x.action,
            actorEmail: String(x.actorEmail ?? ""),
            target: String(x.target ?? ""),
            outcome: x.outcome,
            createdAt: toDate(x.createdAt),
          } as AdminLog;
        }),
      );
      setLoading(false);
    }, () => setLoading(false));

    return () => unsubscribe();
  }, []);

  const getTimeAgo = (date: Date | null) => {
    if (!date) return "Just now";
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="premium-glass rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
      <div className="p-6 border-b border-white/5 bg-black/20 flex items-center justify-between">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-500" /> Authorization History
        </h3>
        {loading && (
          <div className="w-4 h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        )}
      </div>
      <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
        {logs.length === 0 && !loading ? (
          <div className="p-10 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              No administrative logs detected in this cluster.
            </p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-5 flex items-center justify-between hover:bg-black/10 transition-colors group animate-in slide-in-from-top-4 duration-300"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-xl ${log.outcome === "success" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}
                >
                  {log.outcome === "success" ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <ShieldAlert className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-black text-white tracking-widest uppercase">
                    {String(log.action).replace(/_/g, " ")}
                  </p>
                  <p className="text-[9px] font-bold text-slate-300 tracking-widest uppercase mt-0.5">
                    EXERCISED BY: {log.actorEmail} • ON: {log.target}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                  {getTimeAgo(log.createdAt)}
                </p>
                <span
                  className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${log.outcome === "success" ? "border-emerald-500/20 text-emerald-500" : "border-rose-500/20 text-rose-500"} uppercase tracking-widest mt-1 inline-block`}
                >
                  {log.outcome}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SecurityPulse;
