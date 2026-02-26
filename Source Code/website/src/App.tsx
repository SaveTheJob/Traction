import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ProtectedRoute, PublicRoute } from "./components/AuthRoutes";
import Layout from "./components/Layout";
import NewApplicationModal from "./components/NewApplicationModal";
import NewContactModal from "./components/NewContactModal";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { JobProvider } from "./context/JobContext";
import { NetworkProvider } from "./context/NetworkContext";
import { ThemeProvider } from "./context/ThemeContext";
import { NotificationProvider } from "./context/NotificationContext";
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
import { useLocation } from "react-router-dom";

function AppRoutes() {
  const { isLocalAdmin, userProfile, loading, user, impersonatedUser } = useAuth();
  const location = useLocation();

  // Show loading spinner while auth or profile is still loading
  // This prevents the dashboard from flashing before onboarding redirect
  const isPublicRoute = ["/login", "/signup", "/privacy-policy"].includes(location.pathname);
  if (!isPublicRoute && !loading && user && !userProfile && !isLocalAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // Onboarding Redirect Logic
  if (!loading && userProfile && !userProfile.onboardingCompleted && !isLocalAdmin) {
    if (location.pathname !== "/onboarding") {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // Prevent accessing onboarding if already completed
  if (!loading && userProfile?.onboardingCompleted && location.pathname === "/onboarding") {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />

      {/* Protected App Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={(isLocalAdmin && !impersonatedUser) ? <Navigate to="/admin" replace /> : <Dashboard />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="account" element={<Account />} />
        <Route path="network" element={<Network />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="admin/*" element={<AdminPortal />} />
        <Route path="*" element={<div className="p-8">Work in progress</div>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <JobProvider>
            <NetworkProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
              <NewApplicationModal />
              <NewContactModal />
            </NetworkProvider>
          </JobProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
