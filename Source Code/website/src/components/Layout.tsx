import { Menu } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import ImpersonationBanner from "./ImpersonationBanner";
import Logo from "./Logo";
import Sidebar from "./Sidebar";
import ThemeCustomizer from "./ThemeCustomizer";

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-transparent overflow-hidden transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area - Adds padding around the edges to let the cards "float" */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ImpersonationBanner />
        <div className="flex-1 overflow-hidden bg-transparent flex flex-col relative">
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="md:hidden flex items-center justify-between p-3 sm:p-4 premium-glass border-b-0 shrink-0 sticky top-0 z-10 m-2 rounded-xl sm:rounded-2xl gap-3">
            <Logo className="h-14" />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-slate-300 hover:bg-slate-800 rounded-full transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto w-full h-full">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Global Theme Customizer FAB + Sidebar */}
      <ThemeCustomizer />
    </div>
  );
}
