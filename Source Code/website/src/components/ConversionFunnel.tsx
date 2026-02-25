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
    <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-sm flex flex-col justify-between">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900">Conversion Funnel</h2>
        <p className="text-sm text-gray-500 mt-1">
          Visualize your success rate from application to offer
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-6">
        <div className="relative">
          <div className="flex justify-between text-sm font-semibold mb-2">
            <span className="text-gray-700">Total Applied</span>
            <span className="text-gray-900">{totalJobs}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="bg-blue-500 h-4 rounded-full"
              style={{ width: "100%" }}
            ></div>
          </div>
        </div>

        <div className="relative">
          <div className="flex justify-between text-sm font-semibold mb-2">
            <span className="text-gray-700">Interviewing</span>
            <span className="text-gray-900">{interviewing}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="bg-blue-500 h-4 rounded-full transition-all duration-1000"
              style={{
                width: `${totalJobs > 0 ? (interviewing / totalJobs) * 100 : 0}%`,
              }}
            ></div>
          </div>
          {totalJobs > 0 && (
            <span className="absolute -right-12 top-8 text-xs font-bold text-blue-600">
              {Math.round((interviewing / totalJobs) * 100)}%
            </span>
          )}
        </div>

        <div className="relative">
          <div className="flex justify-between text-sm font-semibold mb-2">
            <span className="text-gray-700">Offers</span>
            <span className="text-gray-900">{offers}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="bg-green-500 h-4 rounded-full transition-all duration-1000"
              style={{
                width: `${totalJobs > 0 ? (offers / totalJobs) * 100 : 0}%`,
              }}
            ></div>
          </div>
          {interviewing > 0 && (
            <span className="absolute -right-12 top-8 text-xs font-bold text-green-600">
              {Math.round((offers / interviewing) * 100)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
