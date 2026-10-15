import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle,
  Clock,
  Info,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useNotification } from "../context/NotificationContext";

interface NotificationDropdownProps {
  position?: "below" | "above";
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  position = "below",
}) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsSelectionMode(false);
        setSelectedIds([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map((n) => n.id));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.max(
      0,
      Math.floor((new Date().getTime() - date.getTime()) / 1000),
    );
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2.5 rounded-xl transition-all duration-300 relative group overflow-hidden ${
          isOpen
            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105"
            : "bg-black/20 text-white/80 hover:text-white hover:bg-black/30"
        }`}
      >
        <Bell
          className={`w-5 h-5 transition-transform duration-500 ${isOpen ? "rotate-12 scale-110" : "group-hover:rotate-12"}`}
        />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-slate-900 ring-2 ring-rose-500/20 animate-in zoom-in duration-300">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            position === "above"
              ? "bottom-14 w-[calc(16rem-1.5rem)] lg:w-[calc(18rem-2rem)]"
              : "top-14 -right-2 sm:right-0 w-[calc(100vw-1rem)] sm:w-80 md:w-96 max-w-[24rem]"
          } premium-glass-heavy rounded-[2rem] border border-white/10 shadow-2xl z-50 overflow-hidden animate-in fade-in ${
            position === "above"
              ? "slide-in-from-bottom-4"
              : "slide-in-from-top-4"
          } duration-300`}
        >
          {/* Header */}
          <div className="p-3 sm:p-5 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                Notifications
              </h3>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-0.5">
                {isSelectionMode
                  ? `${selectedIds.length} SELECTED`
                  : `${unreadCount} UNREAD Notifications`}
              </p>
            </div>
            <div className="flex gap-1 items-center">
              {isSelectionMode && notifications.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="px-2 py-1 text-[9px] font-black text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                >
                  {selectedIds.length === notifications.length
                    ? "DESELECT ALL"
                    : "SELECT ALL"}
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    setSelectedIds([]);
                  }}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all border ${isSelectionMode ? "bg-blue-600 text-white border-blue-500" : "text-slate-300 border-white/10 hover:bg-white/10"}`}
                >
                  {isSelectionMode ? "CANCEL" : "SELECT"}
                </button>
              )}

              <button
                onClick={markAllAsRead}
                className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                title="Mark all as read"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[350px] sm:max-h-[450px] overflow-y-auto scrollbar-theme py-2">
            {notifications.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-slate-700" />
                </div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  No new notifications
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => (isSelectionMode ? null : markAsRead(n.id))}
                  className={`p-4 flex gap-4 transition-all hover:bg-black/10 cursor-pointer relative group ${!n.read ? "bg-blue-500/5" : ""}`}
                >
                  {isSelectionMode && (
                    <div
                      className="flex items-center"
                      onClick={(e) => toggleSelect(n.id, e)}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${selectedIds.includes(n.id) ? "bg-blue-600 border-blue-600" : "border-white/20"}`}
                      >
                        {selectedIds.includes(n.id) && (
                          <Check className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                    </div>
                  )}
                  <div
                    className={`w-10 h-10 rounded-xl border border-white/5 flex items-center justify-center shrink-0 shadow-sm ${!n.read ? "bg-blue-500/10" : "bg-slate-800"}`}
                  >
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p
                        className={`text-[13px] leading-relaxed transition-colors ${!n.read ? "text-white font-bold" : "text-slate-300 font-medium"}`}
                      >
                        {n.message}
                      </p>
                      {!n.read && !isSelectionMode && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5 shadow-lg shadow-blue-500/50" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {getTimeAgo(n.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
