import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: '8px 16px',
    color: isActive ? '#2563eb' : '#666',
    fontWeight: isActive ? 600 : 400,
    textDecoration: 'none',
    borderRadius: 6,
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 220,
          background: '#fff',
          borderRight: '1px solid #e5e7eb',
          padding: 16,
        }}
      >
        <h2 style={{ marginBottom: 24, fontSize: 18 }}>🌾 Kweka Jeeto</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <NavLink to="/dashboard" style={navStyle}>
            Dashboard
          </NavLink>
          <NavLink to="/farmers" style={navStyle}>
            Farmers
          </NavLink>
          <NavLink to="/reports" style={navStyle}>
            Reports
          </NavLink>
          <NavLink to="/config" style={navStyle}>
            Config
          </NavLink>
        </nav>
        <button
          onClick={handleLogout}
          style={{
            marginTop: 24,
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
          }}
        >
          Logout
        </button>
      </aside>
      <main style={{ flex: 1, padding: 24, background: '#f5f5f5' }}>
        <Outlet />
      </main>
    </div>
  );
}
