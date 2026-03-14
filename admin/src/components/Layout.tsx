import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ROUTES: { path: string; label: string }[] = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/farmers', label: 'Farmers' },
  { path: '/reports', label: 'Reports' },
  { path: '/config', label: 'Config' },
];

function getPageTitle(pathname: string): string {
  const r = ROUTES.find(({ path }) => pathname === path || pathname.startsWith(path + '/'));
  return r?.label ?? 'Admin';
}

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  );

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const handler = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-page">
      {/* AppTopBar — primary top bar per UI_STANDARDS */}
      <header className="sticky top-0 z-30 bg-slate-900 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 min-h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-slate-900 shrink-0"
              aria-hidden
            >
              🌾
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                Kweka Jeeto
              </p>
              <h1 className="text-xl font-black text-white truncate">{pageTitle}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-slate-300 font-medium hidden sm:inline">Admin</span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-lg"
            >
              → Logout
            </button>
          </div>
        </div>

        {/* SecondaryNavBar — horizontal tabs (desktop) or hamburger (mobile) */}
        <nav className="bg-slate-900 h-14 flex items-center max-w-7xl mx-auto px-4 sm:px-6">
          {isDesktop ? (
            <div className="flex items-center gap-1 overflow-x-auto">
              {ROUTES.map(({ path, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path !== '/dashboard'}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors min-h-[48px] ${
                      isActive
                        ? 'text-primary font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span>{label}</span>
                      {isActive && (
                        <span
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                          aria-hidden
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 text-slate-400 hover:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="Open menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {mobileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    aria-hidden
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  <div className="fixed top-0 left-0 z-50 w-72 max-w-[85vw] h-full bg-slate-900 border-r border-slate-700 shadow-xl flex flex-col">
                    <div className="p-4 flex items-center justify-between border-b border-slate-700">
                      <span className="text-base font-bold text-white">Menu</span>
                      <button
                        type="button"
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 text-slate-400 hover:text-white rounded-lg"
                        aria-label="Close menu"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex flex-col py-2">
                      {ROUTES.map(({ path, label }) => (
                        <NavLink
                          key={path}
                          to={path}
                          end={path !== '/dashboard'}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center px-4 min-h-[48px] text-sm font-medium transition-colors ${
                              isActive ? 'bg-primary/20 text-primary' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                            }`
                          }
                        >
                          {label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </nav>
      </header>

      {/* Main content — scrolls; info bar and page content inside */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
