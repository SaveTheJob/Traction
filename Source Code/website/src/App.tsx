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

import Account from "./pages/Account";
import Analytics from "./pages/Analytics";
import Dashboard from "./pages/Dashboard";
import AdminPortal from "./pages/AdminPortal";
import Login from "./pages/Login";
import Network from "./pages/Network";
import Pipeline from "./pages/Pipeline";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";

// ---------------------------------------------------------------------------
// AppBackground
// Renders the user-selected wallpaper as a real fixed DOM element.
// Using a CSS variable on <body> is not composited by backdrop-filter in
// production Chromium/WebKit builds — a real DOM node is required.
// ---------------------------------------------------------------------------

function AppBackground() {
  const { backgroundConfig } = useTheme();

  const bgStyle: React.CSSProperties =
    backgroundConfig.type === "image"
      ? { backgroundImage: `url('${backgroundConfig.value}')` }
      : { background: backgroundConfig.value };

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        ...bgStyle,
      }}
    />
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
          <Route path="admin/*" element={<AdminPortal />} />
          <Route path="*" element={<div className="p-8 text-white">Page not found</div>} />
        </Route>
      </Routes>

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
