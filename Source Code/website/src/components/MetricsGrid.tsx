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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {metrics.map((metric, idx) => (
        <div
          key={idx}
          className="premium-glass rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-10 relative group overflow-hidden shadow-xl"
          style={{
            animationDelay: `${idx * 0.15}s`,
            perspective: "1000px",
          }}
        >
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wide">
                {metric.label}
              </p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 mt-1 sm:mt-2 tracking-tight drop-shadow-sm">
                {metric.value}
              </p>
            </div>

            {/* 3D Icon Container */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl premium-glass-heavy flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-300">
              <metric.icon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-blue-400 drop-shadow-md" />
            </div>
          </div>

          <div className="mt-3 sm:mt-4 lg:mt-6 flex items-center gap-2 relative z-10">
            <div
              className={`
              text-xs font-bold px-3 py-1 rounded-full shadow-inner flex items-center gap-1
              ${metric.trend === "up"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30 backdrop-blur-sm"
                  : "premium-glass-heavy text-slate-300"
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
