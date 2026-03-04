import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { Activity, Cpu, Database, Globe, ShieldAlert } from "lucide-react";
import React, { useEffect, useState } from "react";
import { db } from "../../lib/firebase";

interface HourlyBucket {
  hour: number;
  count: number;
}

const SystemVitals: React.FC = () => {
  const [stats, setStats] = useState({
    users: 0,
    apps: 0,
    suspended: 0,
    latency: 0,
    loading: true,
  });
  const [hourlyData, setHourlyData] = useState<HourlyBucket[]>([]);

  useEffect(() => {
    // Live listeners for counts
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const users = snapshot.size;
      const suspendedCount = snapshot.docs.filter(
        (d) => d.data().status === "Suspended",
      ).length;
      setStats((prev) => ({
        ...prev,
        users,
        suspended: suspendedCount,
        loading: false,
      }));
    });

    const unsubApps = onSnapshot(collection(db, "jobs"), (snapshot) => {
      setStats((prev) => ({ ...prev, apps: snapshot.size }));
    });

    // Real-time hourly application activity for today
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startTimestamp = Timestamp.fromDate(startOfDay);

    const jobsQuery = query(
      collection(db, "jobs"),
      where("createdAt", ">=", startTimestamp),
      orderBy("createdAt", "asc"),
    );

    const unsubHourly = onSnapshot(jobsQuery, (snapshot) => {
      const buckets: number[] = new Array(24).fill(0);
      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data.createdAt?.toDate) {
          const hour = data.createdAt.toDate().getHours();
          buckets[hour]++;
        }
      });
      const currentHour = new Date().getHours();
      // Show hours 0..currentHour (at minimum 12 bars for visual balance)
      const barCount = Math.max(currentHour + 1, 12);
      setHourlyData(
        buckets.slice(0, barCount).map((count, hour) => ({ hour, count })),
      );
    });

    // Latency pulse
    const interval = setInterval(async () => {
      const start = performance.now();
      try {
        await getDoc(doc(db, "vitals", "health"));
      } catch {
        // Ignore — we just want the round-trip time
      }
      const end = performance.now();
      setStats((prev) => ({ ...prev, latency: Math.floor(end - start) }));
    }, 5000);

    return () => {
      unsubUsers();
      unsubApps();
      unsubHourly();
      clearInterval(interval);
    };
  }, []);

  const getHealthPercent = () => {
    if (stats.latency === 0) return "99.9%";
    if (stats.latency < 150) return "99.9%";
    if (stats.latency < 400) return "98.5%";
    if (stats.latency < 1000) return "94.2%";
    return "82.1%";
  };

  const getThreatLevel = () => {
    if (stats.suspended === 0) return "Minimal";
    if (stats.suspended < 5) return "Elevated";
    return "Critical";
  };

  const maxCount = Math.max(...hourlyData.map((b) => b.count), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        {
          label: "Total Ingress Users",
          val: stats.loading ? "..." : stats.users,
          icon: Globe,
          color: "blue",
        },
        {
          label: "Asset Clusters",
          val: stats.loading ? "..." : stats.apps,
          icon: Database,
          color: "indigo",
        },
        {
          label: "Engine Health",
          val: getHealthPercent(),
          icon: Cpu,
          color: stats.latency > 600 ? "rose" : "emerald",
        },
        {
          label: "Threat Level",
          val: getThreatLevel(),
          icon: ShieldAlert,
          color: stats.suspended > 0 ? "amber" : "emerald",
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
          <div className="mt-4 w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full bg-${v.color}-500 transition-all duration-1000 ${stats.loading ? "w-0" : "w-[80%]"} ${v.label === "Engine Health" ? "animate-pulse" : ""}`}
            />
          </div>
        </div>
      ))}
      <div className="md:col-span-2 lg:col-span-4 premium-glass p-8 rounded-3xl border border-white/5 shadow-2xl">
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" /> Infrastructure
          Analytics
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
    </div>
  );
};

export default SystemVitals;
