'use client';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UserBadge() {
  const { user } = useAuth();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      {user.profile === 'admin' && (
        <>
          <Link
            href="/admin/users"
            className="text-xs text-slate-400 hover:text-white px-2 py-1.5 rounded hover:bg-slate-700 transition-colors"
          >
            Users
          </Link>
          <div className="w-px h-5 bg-slate-700" />
        </>
      )}
      <div className="flex items-center gap-1.5">
        <span className="text-slate-300 text-xs hidden sm:inline">{user.username}</span>
        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
          user.profile === 'admin' ? 'bg-purple-900/60 text-purple-300' : 'bg-blue-900/60 text-blue-300'
        }`}>
          {user.profile}
        </span>
      </div>
      <div className="w-px h-5 bg-slate-700" />
      <button
        onClick={logout}
        title="Sign out"
        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  );
}
