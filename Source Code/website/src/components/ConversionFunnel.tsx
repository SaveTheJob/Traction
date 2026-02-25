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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8 shadow-sm flex flex-col justify-between">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Conversion Funnel
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="bg-blue-500 dark:bg-blue-600 h-4 rounded-full"
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
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="bg-blue-500 dark:bg-blue-600 h-4 rounded-full transition-all duration-1000"
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
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="bg-green-500 dark:bg-green-600 h-4 rounded-full transition-all duration-1000"
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
