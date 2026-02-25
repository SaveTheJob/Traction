interface ConversionFunnelProps {
  totalJobs: number;
  interviewing: number;
  offers: number;
}

export default function ConversionFunnel({
  totalJobs,
  interviewing,
  offers,
}: ConversionFunnelProps) {
  return (
    <div className="premium-glass rounded-[2rem] shadow-2xl p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
          Conversion Funnel
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Visualize your success rate from application to offer
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-6">
        <div className="relative">
          <div className="flex justify-between text-sm font-semibold mb-2">
            <span className="text-gray-700 dark:text-gray-300">
              Total Applied
            </span>
            <span className="text-gray-900 dark:text-white">{totalJobs}</span>
          </div>
          <div className="w-full bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-full h-4 overflow-hidden border border-white/10 shadow-inner">
            <div
              className="bg-blue-500/80 dark:bg-blue-400/80 h-4 rounded-full"
              style={{ width: "100%" }}
            ></div>
          </div>
        </div>

        <div className="relative">
          <div className="flex justify-between text-sm font-semibold mb-2">
            <span className="text-gray-700 dark:text-gray-300">
              Interviewing
            </span>
            <span className="text-gray-900 dark:text-white">
              {interviewing}
            </span>
          </div>
          <div className="w-full bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-full h-4 overflow-hidden border border-white/10 shadow-inner">
            <div
              className="bg-indigo-500/80 dark:bg-indigo-400/80 h-4 rounded-full transition-all duration-1000"
              style={{
                width: `${totalJobs > 0 ? (interviewing / totalJobs) * 100 : 0}%`,
              }}
            ></div>
          </div>
        </div>

        <div className="relative">
          <div className="flex justify-between text-sm font-semibold mb-2">
            <span className="text-gray-700 dark:text-gray-300">Offers</span>
            <span className="text-gray-900 dark:text-white">{offers}</span>
          </div>
          <div className="w-full bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-full h-4 overflow-hidden border border-white/10 shadow-inner">
            <div
              className="bg-green-500/80 dark:bg-green-400/80 h-4 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(74,222,128,0.5)]"
              style={{
                width: `${totalJobs > 0 ? (offers / totalJobs) * 100 : 0}%`,
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
