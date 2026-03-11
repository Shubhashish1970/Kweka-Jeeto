import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Farmers from './pages/Farmers';
import Reports from './pages/Reports';
import Config from './pages/Config';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authenticated, authDisabled } = useAuth();
  if (authenticated === null && !authDisabled) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!authenticated && !authDisabled) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="farmers" element={<Farmers />} />
          <Route path="reports" element={<Reports />} />
          <Route path="config" element={<Config />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
