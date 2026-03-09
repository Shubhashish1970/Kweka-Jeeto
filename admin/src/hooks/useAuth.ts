import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export function useAuth() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  const checkAuth = useCallback(async () => {
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

  return { authenticated, login, logout, checkAuth };
}
