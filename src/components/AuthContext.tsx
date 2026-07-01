'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const AUTH_EXEMPT_PATHS = ['/login', '/setup'];

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
  expired: boolean;
  refresh: () => void;
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, expired: false, refresh: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  function refresh() {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        setUser(d.user ?? null);
        setExpired(!d.user && !!d.error);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => { refresh(); }, []);

  const showExpiredBanner = expired && !AUTH_EXEMPT_PATHS.includes(pathname);

  return (
    <Ctx.Provider value={{ user, loading, expired, refresh }}>
      {showExpiredBanner && (
        <div className="bg-amber-900/40 border-b border-amber-700/50 text-amber-300 text-xs px-4 py-2 flex items-center gap-2">
          <span>Your session has expired.</span>
          <a href="/login" className="underline hover:text-amber-100">Log in again</a>
          <span>to restore admin features and your user info.</span>
        </div>
      )}
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}

export function useIsAdmin(): boolean | null {
  const { user, loading } = useContext(Ctx);
  if (loading) return null;        // null = still loading
  return user?.profile === 'admin';
}
