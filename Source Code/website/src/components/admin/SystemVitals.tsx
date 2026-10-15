import {
  collection,
  collectionGroup,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { Activity, Database, Globe, Timer, UserX } from "lucide-react";
import React, { useEffect, useState } from "react";
import { refs, toDate } from "../../lib/db";
import { db } from "../../lib/firebase";
import CollectorHealth from "./CollectorHealth";

interface HourlyBucket {
  hour: number;
  count: number;
}

const REFRESH_MS = 60_000;

const SystemVitals: React.FC = () => {
  const [stats, setStats] = useState({
    users: 0,
    apps: 0,
    suspended: 0,
    latency: null as number | null,
    loading: true,
  });
  const [error, setError] = useState("");
  const [hourlyData, setHourlyData] = useState<HourlyBucket[]>([]);

  useEffect(() => {
    let cancelled = false;

    // Count queries cost one read per 1,000 docs, so poll instead of listening.
    const refresh = async () => {
      try {
        const start = performance.now();
        await getDoc(refs.systemHealth());
        const latency = Math.round(performance.now() - start);

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const [users, apps, suspended, today] = await Promise.all([
          getCountFromServer(collection(db, "users")),
          getCountFromServer(collectionGroup(db, "jobs")),
          getCountFromServer(
            query(collection(db, "users"), where("status", "==", "suspended")),
          ),
          getDocs(
            query(
              collectionGroup(db, "jobs"),
              where("createdAt", ">=", Timestamp.fromDate(startOfDay)),
              orderBy("createdAt"),
            ),
          ),
        ]);
        if (cancelled) return;

        const buckets: number[] = new Array(24).fill(0);
        today.docs.forEach((d) => {
          const at = toDate(d.data().createdAt);
          if (at) buckets[at.getHours()]++;
        });
        // Show hours 0..currentHour (at least 12 bars for visual balance)
        const barCount = Math.max(new Date().getHours() + 1, 12);
        setHourlyData(
          buckets.slice(0, barCount).map((count, hour) => ({ hour, count })),
        );
        setStats({
          users: users.data().count,
          apps: apps.data().count,
          suspended: suspended.data().count,
          latency,
          loading: false,
        });
        setError("");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStats((prev) => ({ ...prev, loading: false }));
      }
    };

    refresh();
    const interval = setInterval(refresh, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const maxCount = Math.max(...hourlyData.map((b) => b.count), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {error && (
        <p className="md:col-span-2 lg:col-span-4 text-xs text-red-300">
          {error}
        </p>
      )}
      {[
        {
          label: "Users",
          val: stats.loading ? "..." : stats.users.toLocaleString(),
          icon: Globe,
          color: "blue",
        },
        {
          label: "Applications",
          val: stats.loading ? "..." : stats.apps.toLocaleString(),
          icon: Database,
          color: "indigo",
        },
        {
          label: "Suspended",
          val: stats.loading ? "..." : stats.suspended.toLocaleString(),
          icon: UserX,
          color: stats.suspended > 0 ? "amber" : "emerald",
        },
        {
          label: "Firestore latency",
          val: stats.latency == null ? "..." : `${stats.latency} ms`,
          icon: Timer,
          color: "emerald",
        },
      ].map((v) => (
        <div
          key={v.label}
          className="premium-glass p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
            <v.icon className={`w-12 h-12 text-${v.color}-500`} />
          </div>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">
            {v.label}
          </p>
          <p className="text-2xl font-black text-white uppercase tracking-tighter">
            {v.val}
          </p>
        </div>
      ))}
      <div className="md:col-span-2 lg:col-span-4 premium-glass p-8 rounded-3xl border border-white/5 shadow-2xl">
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" /> Applications
          added
          <span className="text-[9px] font-bold text-slate-400 ml-2 normal-case tracking-normal">
            (Today's application activity by hour)
          </span>
        </h3>
        <div className="h-64 flex items-end gap-2 px-1">
          {hourlyData.length > 0 ? (
            hourlyData.map((bucket) => {
              const heightPct =
                maxCount > 0 ? Math.max((bucket.count / maxCount) * 100, 4) : 4;
              return (
                <div
                  key={bucket.hour}
                  className="flex-1 bg-gradient-to-t from-blue-600/20 to-blue-500/60 rounded-t-lg transition-all hover:to-blue-400 relative group/bar"
                  style={{ height: `${heightPct}%` }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-400 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                    {bucket.count}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-bold uppercase tracking-widest">
              No activity data yet today
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-between text-[9px] font-black text-slate-300 uppercase tracking-widest px-1">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:59</span>
        </div>
      </div>
      <CollectorHealth />
    </div>
  );
};

export default SystemVitals;
