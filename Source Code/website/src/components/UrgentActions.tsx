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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-600 uppercase tracking-widest">
          Needs Attention
        </h2>
      </div>
      <div className="premium-glass rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-center p-5 text-center border-t border-red-500/50 relative">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Bell className="w-32 h-32 text-red-500 transform -rotate-12 translate-x-8 -translate-y-8" />
        </div>

        {actions.length > 0 ? (
          <div className="w-full relative z-10 space-y-4">
            {actions.map((action, idx) => (
              <div
                key={idx}
                className="group relative premium-glass-heavy p-4 rounded-xl hover:border-red-500/50 hover:-translate-y-1 shadow-lg transition-all duration-300 cursor-pointer text-left overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/0 to-red-500/0 group-hover:from-red-500/5 group-hover:to-pink-500/5 transition-colors duration-500" />

                <div className="flex justify-between items-start mb-2 relative z-10">
                  <span className="bg-red-900/40 text-red-300 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest shadow-sm">
                    {action.priority}
                  </span>
                  <span className="text-xs font-bold text-slate-300 font-mono tracking-tight">
                    {action.time}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1 relative z-10">
                  {action.title}
                </h3>
                <p className="text-[11px] text-slate-300 relative z-10">
                  {action.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12">
            <p className="text-slate-300 font-medium">
              No urgent actions.
            </p>
          </div>
        )}

        <button className="mt-6 w-full py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-bold rounded-2xl shadow-lg shadow-red-500/20 hover:shadow-red-500/40 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2 group">
          View Calendar{" "}
          <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
