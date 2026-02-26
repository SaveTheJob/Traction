import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "../context/ThemeContext";

interface ApplicationVelocityChartProps {
  data: { name: string; applications: number }[];
  timeFilter: "monthly" | "weekly";
  setTimeFilter: (filter: "monthly" | "weekly") => void;
}

export default function ApplicationVelocityChart({
  data,
  timeFilter,
  setTimeFilter,
}: ApplicationVelocityChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="premium-glass rounded-[2rem] shadow-2xl p-6 md:p-8 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Application Velocity
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Number of applications submitted over time
          </p>
        </div>
        <div className="inline-flex premium-glass-heavy p-1 rounded-xl">
          <button
            onClick={() => setTimeFilter("weekly")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${timeFilter === "weekly"
              ? "bg-white/80 dark:bg-white/20 text-blue-700 dark:text-blue-300 shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeFilter("monthly")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${timeFilter === "monthly"
              ? "bg-white/80 dark:bg-white/20 text-blue-700 dark:text-blue-300 shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            Monthly
          </button>
        </div>
      </div>
      {data.length > 0 ? (
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={isDark ? "#374151" : "#f3f4f6"}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 13, fill: isDark ? "#9ca3af" : "#6b7280" }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fontSize: 13, fill: isDark ? "#9ca3af" : "#6b7280" }}
                axisLine={false}
                tickLine={false}
                dx={-10}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? "rgba(15, 23, 42, 0.7)" : "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.5)",
                  color: isDark ? "#fff" : "#111827",
                  borderRadius: "16px",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
                itemStyle={{ color: "#4f46e5", fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="applications"
                stroke="#4f46e5"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorApps)"
                activeDot={{ r: 8 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[400px] flex items-center justify-center text-slate-500 border-2 border-dashed border-white/20 rounded-2xl bg-white/5">
          Not enough data. Start adding applications!
        </div>
      )}
    </div>
  );
}
