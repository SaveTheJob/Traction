import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Application Velocity
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Number of applications submitted over time
          </p>
        </div>
        <div className="inline-flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
          <button
            onClick={() => setTimeFilter("weekly")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${timeFilter === "weekly" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeFilter("monthly")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${timeFilter === "monthly" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
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
                stroke="#f3f4f6"
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 13, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fontSize: 13, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                dx={-10}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
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
        <div className="h-[400px] flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          Not enough data. Start adding applications!
        </div>
      )}
    </div>
  );
}
