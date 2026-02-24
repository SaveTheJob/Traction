import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Account from './pages/Account';
import Network from './pages/Network';
import Analytics from './pages/Analytics';
import { JobProvider } from './context/JobContext';
import { NetworkProvider } from './context/NetworkContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import NewApplicationModal from './components/NewApplicationModal';
import NewContactModal from './components/NewContactModal';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Public Route Wrapper
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div></div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

      {/* Protected App Routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
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
  );
}

export default App;
