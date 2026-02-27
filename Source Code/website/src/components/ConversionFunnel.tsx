interface ConversionFunnelProps {
  totalJobs: number;
  saved: number;
  interviewing: number;
  offers: number;
}

export default function ConversionFunnel({
  totalJobs,
  saved,
  interviewing,
  offers,
}: ConversionFunnelProps) {
  // Total including saved for the "all" baseline
  const allJobs = totalJobs + saved;

  const stages = [
    {
      label: "Saved",
      value: saved,
      color: "bg-purple-400/80",
      pct: allJobs > 0 ? (saved / allJobs) * 100 : 0,
    },
    {
      label: "Applied",
      value: totalJobs,
      color: "bg-blue-400/80",
      pct: allJobs > 0 ? (totalJobs / allJobs) * 100 : 0,
    },
    {
      label: "Interviewing",
      value: interviewing,
      color: "bg-indigo-400/80",
      pct: allJobs > 0 ? (interviewing / allJobs) * 100 : 0,
    },
    {
      label: "Offers",
      value: offers,
      color: "bg-green-400/80 shadow-[0_0_10px_rgba(74,222,128,0.5)]",
      pct: allJobs > 0 ? (offers / allJobs) * 100 : 0,
    },
  ];

  return (
    <div className="premium-glass rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden">
      <div className="mb-4 sm:mb-8">
        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
          Statistics
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
          Visualize your success rate from saved to offer
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-6">
        {stages.map((stage) => (
          <div className="relative" key={stage.label}>
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span className="text-slate-300">{stage.label}</span>
              <span className="text-white">{stage.value}</span>
            </div>
            <div className="w-full bg-black/20 backdrop-blur-md rounded-full h-4 overflow-hidden border border-white/10 shadow-inner">
              <div
                className={`${stage.color} h-4 rounded-full transition-all duration-1000`}
                style={{
                  width: `${Math.max(stage.pct, stage.value > 0 ? 4 : 0)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
