import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-slate-900 flex flex-col p-4 shrink-0">
        <h2 className="text-base font-bold text-white uppercase tracking-wide mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-slate-900 text-lg">🌾</span>
          Kweka Jeeto
        </h2>
        <nav className="flex flex-col gap-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-primary/20 text-primary' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/farmers"
            className={({ isActive }) =>
              `px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-primary/20 text-primary' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            Farmers
          </NavLink>
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-primary/20 text-primary' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            Reports
          </NavLink>
          <NavLink
            to="/config"
            className={({ isActive }) =>
              `px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-primary/20 text-primary' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            Config
          </NavLink>
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-auto px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors rounded-lg border border-slate-700 hover:border-slate-600"
        >
          Logout
        </button>
      </aside>
      <main className="flex-1 p-6 bg-page overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
