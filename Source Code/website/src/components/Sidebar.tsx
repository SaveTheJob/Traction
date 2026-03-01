import {
  Activity,
  BarChart3,
  History,
  KanbanSquare,
  LayoutDashboard,
  Palette,
  Radio,
  Users,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import NotificationDropdown from "./NotificationDropdown";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user, isLocalAdmin, impersonatedUser } = useAuth();

  // Show user nav items when impersonating (God Mode)
  const showAdminNav = isLocalAdmin && !impersonatedUser;

  const navItems = showAdminNav
    ? [
      { label: "User Command", path: "/admin", icon: Users },
      { label: "System Vitals", path: "/admin/vitals", icon: Activity },
      { label: "Security Pulse", path: "/admin/logs", icon: History },
      { label: "Broadcast", path: "/admin/broadcast", icon: Radio },
    ]
    : [
      { label: "Dashboard", path: "/", icon: LayoutDashboard },
      { label: "Pipeline", path: "/pipeline", icon: KanbanSquare },
      { label: "Network", path: "/network", icon: Users },
      { label: "Analytics", path: "/analytics", icon: BarChart3 },
    ];

  return (
    <div
      className={`fixed inset-y-0 left-0 z-40 w-64 lg:w-72 premium-glass transition-transform duration-300 ease-in-out md:static md:translate-x-0 flex flex-col h-screen shrink-0 rounded-r-2xl ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
    >
      <div className="px-4 lg:px-6 pt-8 pb-4 lg:pt-10 lg:pb-6 flex items-center justify-between md:justify-center shrink-0 relative">
        <Logo className="h-9 lg:h-10" />
        <button
          onClick={onClose}
          className="md:hidden p-2 text-slate-300 hover:text-white transition-colors premium-glass rounded-full shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 px-3 lg:px-4 py-4 lg:py-6 overflow-y-auto scrollbar-theme flex flex-col gap-2">
        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => onClose && onClose()}
                className={`flex items-center gap-3 lg:gap-4 px-3 lg:px-4 py-3 lg:py-3.5 rounded-2xl text-[14px] lg:text-[15px] font-medium transition-all duration-300 group relative overflow-hidden ${isActive
                  ? "text-white shadow-lg shadow-blue-500/20"
                  : "text-white hover:bg-black/20"
                  }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/80 to-indigo-500/80 rounded-2xl -z-10 transition-all duration-300 backdrop-blur-md" />
                )}
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${isActive
                    ? "bg-white/20 text-white shadow-inner"
                    : "bg-transparent text-white group-hover:bg-white/10 group-hover:shadow-sm"
                    }`}
                >
                  <Icon
                    className="w-[18px] h-[18px]"
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Account pod + quick actions at the very bottom */}
      <div className="mt-auto">
        <div className="premium-glass rounded-none rounded-br-2xl border-t border-white/10 shadow-lg flex flex-col">
          <Link
            to={isLocalAdmin ? "/admin" : "/account"}
            className="flex items-center gap-2.5 lg:gap-3 p-4 lg:p-5 group hover:bg-white/5 transition-all"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 uppercase shadow-inner ${isLocalAdmin ? "bg-blue-600 shadow-blue-500/20" : "bg-slate-700"}`}
            >
              {isLocalAdmin ? "A" : user?.email ? user.email.charAt(0) : "U"}
            </div>
            <span className="text-[14px] font-bold text-slate-100 truncate">
              {isLocalAdmin
                ? "Admin Access"
                : user?.displayName || "My Account"}
            </span>
          </Link>
          <div className="flex items-center border-t border-white/5 px-4 py-3 gap-2 bg-black/10 rounded-br-2xl">
            <NotificationDropdown position="above" />
            <button
              onClick={() =>
                window.dispatchEvent(new Event("open-theme-customizer"))
              }
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all ml-auto"
              title="Customize Theme"
            >
              <Palette className="w-[17px] h-[17px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
