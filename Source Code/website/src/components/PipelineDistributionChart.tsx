import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#6b7280"];

interface PipelineDistributionChartProps {
  data: { name: string; value: number }[];
}

export default function PipelineDistributionChart({
  data,
}: PipelineDistributionChartProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-sm">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900">
          Pipeline Distribution
        </h2>
        <p className="text-sm text-gray-500 mt-1">
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
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-80 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          Not enough data to calculate distribution
        </div>
      )}
    </div>
  );
}
