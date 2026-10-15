/* eslint-disable @typescript-eslint/no-explicit-any -- catch clauses and third-party config objects have no useful static type here */
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#6b7280"];

interface PipelineDistributionChartProps {
  data: { name: string; value: number }[];
}

export default function PipelineDistributionChart({
  data,
}: PipelineDistributionChartProps) {
  return (
    <div className="premium-glass rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <div className="mb-4 sm:mb-8">
        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
          Distribution
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
          Current breakdown of all active and past applications
        </p>
      </div>
      {data.length > 0 ? (
        <div className="h-56 sm:h-72 lg:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${((percent || 0) * 100).toFixed(0)}%`
                }
              >
                {data.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [`${value} applications`, "Count"]}
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.7)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  borderColor: "rgba(255,255,255,0.1)",
                  color: "#fff",
                  borderRadius: "16px",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
                itemStyle={{ color: "#e5e7eb" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-56 sm:h-72 lg:h-80 flex items-center justify-center text-slate-300 border-2 border-dashed border-white/20 rounded-2xl bg-white/5 text-sm px-4 text-center">
          Not enough data to calculate distribution
        </div>
      )}
    </div>
  );
}
