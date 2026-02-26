import {
  BarChart3,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Users,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Pipeline", path: "/pipeline", icon: KanbanSquare },
    { label: "Network", path: "/network", icon: Users },
    { label: "Analytics", path: "/analytics", icon: BarChart3 },
  ];

  return (
    <div
      className={`fixed inset-y-0 left-0 z-40 w-72 premium-glass transition-transform duration-300 ease-in-out md:static md:translate-x-0 flex flex-col h-screen shrink-0 border-r border-white/20 dark:border-white/10 ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
    >
      {/* Logo */}
      <div className="p-8 flex items-center justify-between shrink-0">
        <Logo className="h-9" />
        <button
          onClick={onClose}
          className="md:hidden p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors premium-glass rounded-full shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 px-5 py-6 overflow-y-auto scrollbar-hide flex flex-col gap-2">
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-wider uppercase mb-4 px-3">
          Menu
        </div>
        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => onClose && onClose()}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-medium transition-all duration-300 group relative overflow-hidden ${isActive
                  ? "text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/20 dark:hover:bg-black/20"
                  }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-indigo-600/90 dark:from-blue-500/80 dark:to-indigo-500/80 rounded-2xl -z-10 transition-all duration-300 backdrop-blur-md border border-white/20" />
                )}
                <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${isActive
                  ? "bg-white/20 text-white shadow-inner"
                  : "bg-transparent text-slate-500 dark:text-slate-400 group-hover:bg-white/50 group-hover:text-slate-800 dark:group-hover:bg-white/10 dark:group-hover:text-white group-hover:shadow-sm"
                  }`}>
                  <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <button
          onClick={signOut}
          className="mt-auto flex items-center gap-4 px-4 py-3 rounded-2xl text-[15px] font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300 transition-all w-full text-left group"
        >
          <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 dark:bg-red-500/20 group-hover:bg-red-500/20 dark:group-hover:bg-red-500/30 transition-colors">
            <LogOut className="w-[18px] h-[18px]" strokeWidth={2} />
          </div>
          Sign Out
        </button>
      </div>

      {/* Account card */}
      <div className="p-5 mx-5 mb-6 mt-2 rounded-2xl premium-glass-heavy shadow-lg">
        <Link
          to="/account"
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-slate-700 flex items-center justify-center text-white font-bold text-sm shrink-0 uppercase shadow-inner group-hover:scale-105 transition-transform duration-300">
            {user?.email ? user.email.charAt(0) : "U"}
          </div>
          <div className="overflow-hidden">
            <div className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 truncate">
              {user?.displayName || "My Account"}
            </div>
            <div className="text-[12px] font-medium text-slate-400 truncate mt-0.5">
              {user?.email || "Manage settings"}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
