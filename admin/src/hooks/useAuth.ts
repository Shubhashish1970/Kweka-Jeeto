import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

// When VITE_ADMIN_AUTH_DISABLED=true (set at build time), skip login and treat as authenticated
const authDisabled = import.meta.env.VITE_ADMIN_AUTH_DISABLED === 'true';

export function useAuth() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(authDisabled ? true : null);

  const checkAuth = useCallback(async () => {
    if (authDisabled) {
      setAuthenticated(true);
      return;
    }
    try {
      await api.get<{ authenticated: boolean }>('/me');
      setAuthenticated(true);
    } catch {
      setAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (password: string) => {
    await api.post<{ success: boolean }>('/login', { password });
    setAuthenticated(true);
  };

  const logout = async () => {
    await api.post('/logout');
    setAuthenticated(false);
  };

  return { authenticated, login, logout, checkAuth, authDisabled };
}
