import { Bell, ChevronRight } from "lucide-react";

interface Action {
  title: string;
  description: string;
  time: string;
  priority: string;
}

interface UrgentActionsProps {
  actions: Action[];
}

export default function UrgentActions({ actions }: UrgentActionsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 text-red-600">
          Urgent Actions
        </h2>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Bell className="w-5 h-5" />
        </h2>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="divide-y divide-gray-100 flex-1">
          {actions.map((action, idx) => (
            <div
              key={idx}
              className="p-5 hover:bg-gray-50/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {action.title}
                  </p>
                  <p className="text-xs text-gray-500">{action.description}</p>
                </div>
                <span className="text-xs font-semibold text-gray-500 whitespace-nowrap ml-4">
                  {action.time}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
          <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 w-full">
            View Calendar <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
