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
        <h2 className="text-lg font-bold text-red-600 dark:text-red-400">
          Urgent Actions
        </h2>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Bell className="w-5 h-5" />
        </h2>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
        <div className="divide-y divide-gray-100 dark:divide-gray-700 flex-1">
          {actions.map((action, idx) => (
            <div
              key={idx}
              className="p-5 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {action.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {action.description}
                  </p>
                </div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap ml-4">
                  {action.time}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-center">
          <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center justify-center gap-1 w-full">
            View Calendar <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
