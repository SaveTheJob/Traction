import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicRoute } from "./components/AuthRoutes";
import Layout from "./components/Layout";
import NewApplicationModal from "./components/NewApplicationModal";
import NewContactModal from "./components/NewContactModal";
import { AuthProvider } from "./context/AuthContext";
import { JobProvider } from "./context/JobContext";
import { NetworkProvider } from "./context/NetworkContext";
import { ThemeProvider } from "./context/ThemeContext";
import Account from "./pages/Account";
import Analytics from "./pages/Analytics";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Network from "./pages/Network";
import Pipeline from "./pages/Pipeline";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Signup from "./pages/Signup";

function AppRoutes() {
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

      {/* Protected App Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="account" element={<Account />} />
        <Route path="network" element={<Network />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="*" element={<div className="p-8">Work in progress</div>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <JobProvider>
          <NetworkProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
            <NewApplicationModal />
            <NewContactModal />
          </NetworkProvider>
        </JobProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
