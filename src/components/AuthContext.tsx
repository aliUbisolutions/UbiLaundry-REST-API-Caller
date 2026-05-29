'use client';
import { createContext, useContext, useEffect, useState } from 'react';

export interface AuthUser {
  id: string;
  username: string;
  profile: 'admin' | 'user';
  allowedMethods: string[];
  serverEnvAccess: string[] | 'all';
  allowedEndpoints: string[] | 'all';
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => void;
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, refresh: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  function refresh() {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setUser(d.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => { refresh(); }, []);

  return <Ctx.Provider value={{ user, loading, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}

export function useIsAdmin(): boolean | null {
  const { user, loading } = useContext(Ctx);
  if (loading) return null;        // null = still loading
  return user?.profile === 'admin';
}
