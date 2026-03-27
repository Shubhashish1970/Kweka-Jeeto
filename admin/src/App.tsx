import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Farmers from './pages/Farmers';
import Reports from './pages/Reports';
import Config from './pages/Config';
import FarmerEdit from './pages/FarmerEdit';
import CropConfigEdit from './pages/CropConfigEdit';
import MastersPage from './pages/MastersPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authenticated, authDisabled } = useAuth();
  if (authenticated === null && !authDisabled) return <div className="p-6 text-slate-600">Loading...</div>;
  if (!authenticated && !authDisabled) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function LoginOrRedirect() {
  const { authDisabled } = useAuth();
  if (authDisabled) return <Navigate to="/" replace />;
  return <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginOrRedirect />} />
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
          <Route path="farmers/:id/edit" element={<FarmerEdit />} />
          <Route path="reports" element={<Reports />} />
          <Route path="config" element={<Config />} />
          {/* Masters: States & Districts + Crop Config */}
          <Route path="masters" element={<MastersPage />} />
          <Route path="masters/crop/:state" element={<CropConfigEdit />} />
          {/* Legacy crop-config routes — redirect to masters */}
          <Route path="crop-config" element={<Navigate to="/masters?tab=crops" replace />} />
          <Route path="crop-config/:state" element={<CropConfigEditRedirect />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// Redirect old /crop-config/:state links to new /masters/crop/:state
function CropConfigEditRedirect() {
  const { state } = useParams<{ state: string }>();
  return <Navigate to={`/masters/crop/${state}`} replace />;
}
