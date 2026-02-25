import React from "react";

interface Metric {
  label: string;
  value: string;
  icon: React.ElementType;
  change: string;
  trend: string;
}

interface MetricsGridProps {
  metrics: Metric[];
}

export default function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {metrics.map((metric, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 md:p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {metric.label}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {metric.value}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <metric.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span
              className={`text-sm font-medium ${metric.trend === "up" ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}
            >
              {metric.change}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
