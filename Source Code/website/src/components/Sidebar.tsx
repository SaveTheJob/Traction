import {
  BarChart3,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  Users,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Logo from "./Logo";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Pipeline", path: "/pipeline", icon: KanbanSquare },
    { label: "Network", path: "/network", icon: Users },
    { label: "Analytics", path: "/analytics", icon: BarChart3 },
  ];

  return (
    <div
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 ease-in-out md:static md:translate-x-0 flex flex-col h-screen shrink-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="p-6 flex items-center justify-between">
        <Logo className="h-8" />
        <button
          onClick={onClose}
          className="md:hidden p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <nav className="flex-1 px-4 space-y-1 mt-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={() => onClose && onClose()}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${isActive ? "text-blue-700 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col gap-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full text-left cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
          <Link
            to="/account"
            className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md cursor-pointer transition-colors block"
          >
            <div className="flex items-center gap-3 w-full">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm shrink-0 uppercase">
                {user?.email ? user.email.charAt(0) : "U"}
              </div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate block">
                {user?.displayName || user?.email || "User"}
              </div>
            </div>
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
