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
    <div className="glass-card rounded-2xl p-6 md:p-8 shadow-sm">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Pipeline Distribution
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
                innerRadius={80}
                outerRadius={120}
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
                  backgroundColor: isDark ? "#1f2937" : "#fff",
                  borderColor: isDark ? "#374151" : "#e5e7eb",
                  color: isDark ? "#fff" : "#111827",
                  borderRadius: "12px",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
                itemStyle={{ color: isDark ? "#e5e7eb" : "#374151" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-80 flex items-center justify-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          Not enough data to calculate distribution
        </div>
      )}
    </div>
  );
}
