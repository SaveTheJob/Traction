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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 lg:gap-10">
      {metrics.map((metric, idx) => (
        <div
          key={idx}
          className="premium-glass rounded-[2rem] p-6 md:p-8 relative group overflow-hidden shadow-xl"
          style={{
            animationDelay: `${idx * 0.15}s`,
            perspective: "1000px",
          }}
        >
          {/* Background Decorative Element */}
          <div className="absolute right-0 top-0 h-40 w-40 bg-gradient-to-br from-blue-400/10 to-purple-500/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-700 ease-in-out" />

          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {metric.label}
              </p>
              <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-gray-900 via-gray-700 to-gray-500 dark:from-white dark:via-gray-200 dark:to-gray-500 mt-2 tracking-tight drop-shadow-sm">
                {metric.value}
              </p>
            </div>

            {/* 3D Icon Container */}
            <div className="w-16 h-16 rounded-2xl premium-glass-heavy flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-300">
              <metric.icon className="w-8 h-8 text-blue-600 dark:text-blue-400 drop-shadow-md" />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 relative z-10">
            <div
              className={`
              text-xs font-bold px-3 py-1 rounded-full shadow-inner flex items-center gap-1
              ${metric.trend === "up"
                  ? "bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30 backdrop-blur-sm"
                  : "premium-glass-heavy text-slate-700 dark:text-slate-300"
                }
            `}
            >
              {metric.trend === "up" && (
                <span className="text-[10px] transform -translate-y-[1px]">
                  ▲
                </span>
              )}
              {metric.change}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
