import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useTheme } from "../context/ThemeContext";

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#6b7280"];

interface PipelineDistributionChartProps {
  data: { name: string; value: number }[];
}

export default function PipelineDistributionChart({
  data,
}: PipelineDistributionChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="premium-glass rounded-[2rem] shadow-2xl p-6 md:p-8 relative overflow-hidden">
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
          Pipeline Distribution
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Current breakdown of all active and past applications
        </p>
      </div>
      {data.length > 0 ? (
        <div className="h-80">
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
                  backgroundColor: isDark ? "rgba(15, 23, 42, 0.7)" : "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.5)",
                  color: isDark ? "#fff" : "#111827",
                  borderRadius: "16px",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
                itemStyle={{ color: isDark ? "#e5e7eb" : "#374151" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-80 flex items-center justify-center text-slate-500 border-2 border-dashed border-white/20 rounded-2xl bg-white/5">
          Not enough data to calculate distribution
        </div>
      )}
    </div>
  );
}
