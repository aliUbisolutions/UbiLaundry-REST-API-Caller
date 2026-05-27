'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  loadEnvironments, saveEnvironments, saveActiveConfig,
  genId, type Environment,
} from '@/lib/storage';
import { APP_VERSION } from '@/lib/version';

const EMPTY: Omit<Environment, 'id'> = { name: '', baseUrl: '', username: '', password: '' };

export default function EnvironmentsPage() {
  const [envs, setEnvs]       = useState<Environment[]>([]);
  const [editing, setEditing] = useState<Environment | null>(null);
  const [isNew, setIsNew]     = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

  useEffect(() => { setEnvs(loadEnvironments()); }, []);

  const persist = (updated: Environment[]) => { saveEnvironments(updated); setEnvs(updated); };

  const openNew  = () => { setEditing({ id: genId(), ...EMPTY }); setIsNew(true); };
  const openEdit = (env: Environment) => { setEditing({ ...env }); setIsNew(false); };

  const saveEdit = () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.baseUrl.trim()) return;
    persist(isNew ? [...envs, editing] : envs.map(e => e.id === editing.id ? editing : e));
    setEditing(null);
  };

  const remove = (id: string) => { if (confirm('Delete this environment?')) persist(envs.filter(e => e.id !== id)); };

  const activate = (env: Environment) => {
    saveActiveConfig({ baseUrl: env.baseUrl, username: env.username, password: env.password });
    alert(`"${env.name}" is now the active environment. Reload the main page to see it applied.`);
  };

  const testEnv = async (env: Environment) => {
    setTesting(env.id);
    const url = `${env.baseUrl.replace(/\/$/, '')}/api/getServerTime`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (env.username) headers['Authorization'] = 'Basic ' + btoa(`${env.username}:${env.password}`);
    try {
      const res  = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, method: 'GET', headers }) });
      const data = await res.json();
      const ok   = !data.error && data.status >= 200 && data.status < 300;
      setTestResults(prev => ({ ...prev, [env.id]: { ok, msg: ok ? `${data.status} in ${data.elapsed}ms` : (data.error ?? `${data.status} ${data.statusText}`) } }));
    } catch (err: unknown) {
      setTestResults(prev => ({ ...prev, [env.id]: { ok: false, msg: err instanceof Error ? err.message : 'Error' } }));
    } finally { setTesting(null); }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="bg-slate-800 border-b border-slate-700 px-5 py-3 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          Back
        </Link>
        <div className="w-px h-4 bg-slate-700" />
        <h1 className="text-white font-semibold text-sm">Environments</h1>
        <span className="text-slate-600 text-xs font-mono">v{APP_VERSION}</span>
        <div className="flex-1" />
        <button onClick={openNew} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          New environment
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-8">
        {envs.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-slate-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"/></svg>
            <p className="text-slate-500 mb-4">No environments saved yet.</p>
            <button onClick={openNew} className="text-blue-400 hover:text-blue-300 text-sm transition-colors">Add your first environment →</button>
          </div>
        ) : (
          <div className="space-y-3">
            {envs.map(env => (
              <div key={env.id} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-white font-medium">{env.name}</p>
                    <p className="text-slate-400 text-xs font-mono mt-0.5 truncate">{env.baseUrl}</p>
                    {env.username && <p className="text-slate-500 text-xs mt-0.5">User: {env.username}</p>}
                    {testResults[env.id] && (
                      <p className={`text-xs mt-1 ${testResults[env.id].ok ? 'text-emerald-400' : 'text-red-400'}`}>
                        {testResults[env.id].ok ? '✓' : '✗'} {testResults[env.id].msg}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => testEnv(env)} disabled={testing === env.id}
                      className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 border border-slate-600 hover:border-slate-500 rounded transition-colors disabled:opacity-50">
                      {testing === env.id ? '…' : 'Test'}
                    </button>
                    <button onClick={() => activate(env)}
                      className="text-xs text-blue-400 hover:text-white px-2.5 py-1.5 border border-blue-500/40 hover:border-blue-400 rounded transition-colors">
                      Activate
                    </button>
                    <button onClick={() => openEdit(env)}
                      className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 border border-slate-600 rounded transition-colors">
                      Edit
                    </button>
                    <button onClick={() => remove(env.id)}
                      className="text-xs text-slate-500 hover:text-red-400 px-2.5 py-1.5 border border-slate-700 rounded transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit/New modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h2 className="text-white font-semibold">{isNew ? 'New environment' : 'Edit environment'}</h2>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Name', key: 'name' as const, placeholder: 'e.g. Production France', type: 'text' },
                { label: 'Base URL', key: 'baseUrl' as const, placeholder: 'https://...', type: 'text', mono: true },
                { label: 'Username', key: 'username' as const, placeholder: 'admin', type: 'text' },
                { label: 'Password', key: 'password' as const, placeholder: '••••••••', type: 'password' },
              ].map(({ label, key, placeholder, type, mono }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
                  <input type={type} value={editing[key]}
                    onChange={e => setEditing({ ...editing, [key]: e.target.value })}
                    placeholder={placeholder}
                    className={`w-full bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-600 ${mono ? 'font-mono' : ''}`} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-5 pb-5 justify-end">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={saveEdit}
                disabled={!editing.name.trim() || !editing.baseUrl.trim()}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded transition-colors">
                {isNew ? 'Create' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
