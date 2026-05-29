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
    <div className="flex items-center gap-2 ml-auto">
      {user.profile === 'admin' && (
        <Link href="/admin/users" className="text-xs text-slate-400 hover:text-white transition-colors">
          Users
        </Link>
      )}
      <span className="text-slate-400 text-xs hidden sm:inline">{user.username}</span>
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
        user.profile === 'admin' ? 'bg-purple-900/60 text-purple-300' : 'bg-blue-900/60 text-blue-300'
      }`}>
        {user.profile}
      </span>
      <button
        onClick={logout}
        className="text-xs text-slate-500 hover:text-red-400 transition-colors"
        title="Sign out"
      >
        Sign out
      </button>
    </div>
  );
}
