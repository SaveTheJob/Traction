/**
 * App.tsx — Root application component.
 *
 * Architecture:
 *   ThemeProvider wraps everything so AppBackground can read theme config
 *   and apply the wallpaper as a real fixed DOM node (required for
 *   backdrop-filter to composite correctly in production builds).
 *
 *   z-index layering:
 *     0  — AppBackground (fixed wallpaper div)
 *     1+ — All app content (Layout, modals, etc.)
 */

import React from "react";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { JobProvider } from "./context/JobContext";
import { NetworkProvider } from "./context/NetworkContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { NotificationProvider } from "./context/NotificationContext";

import { ProtectedRoute, PublicRoute } from "./components/AuthRoutes";
import Layout from "./components/Layout";
import NewApplicationModal from "./components/NewApplicationModal";
import NewContactModal from "./components/NewContactModal";
import DocumentVaultModal from "./components/DocumentVaultModal";

const Account = React.lazy(() => import("./pages/Account"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const AdminPortal = React.lazy(() => import("./pages/AdminPortal"));
const Login = React.lazy(() => import("./pages/Login"));
const Network = React.lazy(() => import("./pages/Network"));
const Pipeline = React.lazy(() => import("./pages/Pipeline"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const Signup = React.lazy(() => import("./pages/Signup"));
const Onboarding = React.lazy(() => import("./pages/Onboarding"));
const ResumeBuilder = React.lazy(() => import("./pages/ResumeBuilder"));

// ---------------------------------------------------------------------------
// AppBackground
// Renders the user-selected wallpaper as a real fixed DOM element.
// Using a CSS variable on <body> is not composited by backdrop-filter in
// production Chromium/WebKit builds — a real DOM node is required.
// ---------------------------------------------------------------------------

function BackgroundAura() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 z-[-1]">
      <div className="aura-blob aura-blob-1" />
      <div className="aura-blob aura-blob-2" />
      <div className="aura-blob aura-blob-3" />
    </div>
  );
}

function BackgroundNoise() {
  return (
    <div className="fixed inset-0 pointer-events-none opacity-[0.025] z-[1] mix-blend-overlay"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
    />
  );
}

function BackgroundGeometric() {
  return (
    <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-0"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg stroke='%23ffffff' stroke-width='1' stroke-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM6 30V20h2v10h10v2H8v10H6V32H-4v-2h10zM30 0h-2v10h-10v2h10v10h2V12h10v-2H30V0zM0 60h2V50h10v-2H2v-10H0v12h-10v2h10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}
    />
  );
}

function AppBackground() {
  const { backgroundConfig } = useTheme();
  const [currentBg, setCurrentBg] = React.useState(backgroundConfig);
  const [pendingBg, setPendingBg] = React.useState<typeof backgroundConfig | null>(null);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  React.useEffect(() => {
    if (backgroundConfig.value !== currentBg.value || backgroundConfig.type !== currentBg.type) {
      setPendingBg(backgroundConfig);
      setIsTransitioning(true);

      const timer = setTimeout(() => {
        setCurrentBg(backgroundConfig);
        setPendingBg(null);
        setIsTransitioning(false);
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [backgroundConfig, currentBg.value, currentBg.type]);

  const getStyle = (config: typeof backgroundConfig): React.CSSProperties => {
    if (config.type === "image") return { backgroundImage: `url('${config.value}')` };
    if (config.type === "mesh") return { background: "transparent" }; // Handled by class
    return { background: config.value };
  };

  const getClassName = (config: typeof backgroundConfig) => {
    let base = "app-background-v2";
    if (config.type === "mesh") base += " bg-mesh-premium";
    return base;
  };

  return (
    <>
      {/* Dark Base */}
      <div className="fixed inset-0 bg-[#020617] z-[-2]" />

      {/* Current Layer */}
      <div
        className={getClassName(currentBg)}
        style={{ ...getStyle(currentBg), opacity: 1 }}
      />

      {/* Pending Layer */}
      {pendingBg && (
        <div
          className={getClassName(pendingBg)}
          style={{ ...getStyle(pendingBg), opacity: isTransitioning ? 1 : 0 }}
        />
      )}

      {/* Persistent Effects Layers */}
      {backgroundConfig.type === "aura" && <BackgroundAura />}
      {backgroundConfig.showNoise && <BackgroundNoise />}
      {backgroundConfig.showGeometric && <BackgroundGeometric />}

      {/* Dim Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{ background: `rgba(0,0,0,${(backgroundConfig.overlayOpacity ?? 14) / 100})` }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// AppRoutes — route definitions and auth/onboarding guards
// ---------------------------------------------------------------------------

function AppRoutes() {
  const { isLocalAdmin, userProfile, loading, user, impersonatedUser } = useAuth();
  const location = useLocation();

  const isPublicRoute = ["/login", "/signup", "/privacy-policy"].includes(location.pathname);

  // Show loading spinner while auth is resolving
  if (!isPublicRoute && !loading && user && !userProfile && !isLocalAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ position: "relative", zIndex: 1 }}>
        <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Redirect to onboarding if profile not yet completed
  if (!loading && userProfile && !userProfile.onboardingCompleted && !isLocalAdmin) {
    if (location.pathname !== "/onboarding") {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // Prevent accessing onboarding once completed
  if (!loading && userProfile?.onboardingCompleted && location.pathname === "/onboarding") {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <React.Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-white/30 border-t-white animate-spin" />
        </div>
      }>
        <Routes>
          {/* ── Public auth routes ── */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

          {/* ── Protected app routes ── */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route
              index
              element={
                isLocalAdmin && !impersonatedUser
                  ? <Navigate to="/admin" replace />
                  : <Dashboard />
              }
            />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="account" element={<Account />} />
            <Route path="network" element={<Network />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="resume" element={<ResumeBuilder />} />
            <Route path="admin/*" element={<AdminPortal />} />
            <Route path="*" element={<div className="p-8 text-white">Page not found</div>} />
          </Route>
        </Routes>
      </React.Suspense>

      {/* Global modals — rendered outside Layout but inside auth providers */}
      <NewApplicationModal />
      <NewContactModal />
      <DocumentVaultModal />
    </div>
  );
}

// ---------------------------------------------------------------------------
// App — provider tree
// ---------------------------------------------------------------------------

function App() {
  return (
    <ThemeProvider>
      {/* Fixed wallpaper at z=0 */}
      <AppBackground />

      {/* App content at z=1+ */}
      <AuthProvider>
        <NotificationProvider>
          <JobProvider>
            <NetworkProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </NetworkProvider>
          </JobProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
