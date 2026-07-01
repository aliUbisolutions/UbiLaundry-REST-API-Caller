'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { APP_VERSION } from '@/lib/version';
import UserBadge from '@/components/UserBadge';
import { useIsAdmin } from '@/components/AuthContext';
import { endpoints } from '@/lib/endpoints';
import type { PublicUser, ServerEnvironment } from '@/lib/data-store';

const ALL_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const ALL_PROTOCOLS = ['SOAP'];

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-400',
  POST: 'text-yellow-400',
  PUT: 'text-blue-400',
  PATCH: 'text-orange-400',
  DELETE: 'text-red-400',
  SOAP: 'text-amber-400',
};

interface UserForm {
  username: string;
  password: string;
  profile: 'admin' | 'user';
  allowedMethods: string[];
  serverEnvAccess: string[] | 'all';
  allowedEndpoints: string[] | 'all';
}

const DEFAULT_FORM: UserForm = {
  username: '',
  password: '',
  profile: 'user',
  allowedMethods: ['GET'],
  serverEnvAccess: [],
  allowedEndpoints: 'all',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [serverEnvs, setServerEnvs] = useState<ServerEnvironment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers);
    fetch('/api/server-envs').then(r => r.json()).then(setServerEnvs);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setError('');
    setShowForm(true);
  }

  function openEdit(u: PublicUser) {
    setEditingId(u.id);
    setForm({
      username: u.username,
      password: '',
      profile: u.profile,
      allowedMethods: u.allowedMethods,
      serverEnvAccess: u.serverEnvAccess,
      allowedEndpoints: u.allowedEndpoints ?? 'all',
    });
    setError('');
    setShowForm(true);
  }

  async function save() {
    if (!form.username) { setError('Username is required'); return; }
    if (!editingId && !form.password) { setError('Password is required'); return; }
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        username: form.username,
        profile: form.profile,
        allowedMethods: form.allowedMethods,
        serverEnvAccess: form.serverEnvAccess,
        allowedEndpoints: form.allowedEndpoints,
      };
      if (form.password) body.password = form.password;

      const res = editingId
        ? await fetch(`/api/users/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Save failed');
        return;
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Delete user "${name}"?`)) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    load();
  }

  function toggleMethod(m: string) {
    setForm(f => ({
      ...f,
      allowedMethods: f.allowedMethods.includes(m)
        ? f.allowedMethods.filter(x => x !== m)
        : [...f.allowedMethods, m],
    }));
  }

  function toggleEnvAccess(id: string) {
    if (form.serverEnvAccess === 'all') {
      setForm(f => ({ ...f, serverEnvAccess: serverEnvs.map(e => e.id).filter(e => e !== id) }));
    } else {
      const current = form.serverEnvAccess as string[];
      setForm(f => ({
        ...f,
        serverEnvAccess: current.includes(id) ? current.filter(x => x !== id) : [...current, id],
      }));
    }
  }

  const envAccessAll = form.serverEnvAccess === 'all';
  const envAccessList = envAccessAll ? [] : (form.serverEnvAccess as string[]);

  const endpointAccessAll = form.allowedEndpoints === 'all';
  const endpointAccessList = endpointAccessAll ? [] : (form.allowedEndpoints as string[]);

  const endpointsByGroup = useMemo(() => {
    const map: Record<string, typeof endpoints> = {};
    for (const ep of endpoints) {
      if (!map[ep.group]) map[ep.group] = [];
      map[ep.group].push(ep);
    }
    return map;
  }, []);

  const [epGroupExpanded, setEpGroupExpanded] = useState<Record<string, boolean>>({});

  function toggleEpGroup(group: string) {
    setEpGroupExpanded(prev => ({ ...prev, [group]: !prev[group] }));
  }

  function isEpGroupExpanded(group: string) {
    return group in epGroupExpanded ? epGroupExpanded[group] : false;
  }

  function toggleEndpoint(id: string) {
    const current = endpointAccessList;
    setForm(f => ({
      ...f,
      allowedEndpoints: current.includes(id) ? current.filter(x => x !== id) : [...current, id],
    }));
  }

  function toggleEndpointGroup(group: string) {
    const groupIds = endpointsByGroup[group].map(e => e.id);
    const current = endpointAccessList;
    const allSelected = groupIds.every(id => current.includes(id));
    setForm(f => ({
      ...f,
      allowedEndpoints: allSelected
        ? current.filter(id => !groupIds.includes(id))
        : [...new Set([...current, ...groupIds])],
    }));
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-5 py-3 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          Back
        </Link>
        <div className="w-px h-4 bg-slate-700" />
        <h1 className="text-white font-semibold text-sm">User Management</h1>
        <span className="text-slate-600 text-xs font-mono">v{APP_VERSION}</span>
        <div className="flex-1" />
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          New user
        </button>
        <UserBadge />
      </div>

      <div className="max-w-4xl mx-auto px-5 py-8">
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-750 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-400">Username</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400">Profile</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400">Allowed methods</th>
                <th className="px-4 py-3 text-left font-medium text-slate-400">Server env access</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-mono font-medium text-white">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.profile === 'admin' ? 'bg-purple-900/60 text-purple-300' : 'bg-blue-900/60 text-blue-300'}`}>
                      {u.profile}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-mono text-xs">{u.allowedMethods.join(' ')}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {u.serverEnvAccess === 'all' ? 'All' : (u.serverEnvAccess as string[]).length === 0 ? 'None' : `${(u.serverEnvAccess as string[]).length} env(s)`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(u)} className="text-blue-400 hover:text-blue-300 text-xs mr-3 transition-colors">Edit</button>
                    <button onClick={() => deleteUser(u.id, u.username)} className="text-red-500 hover:text-red-400 text-xs transition-colors">Delete</button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No users yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h2 className="text-white font-semibold">{editingId ? 'Edit user' : 'New user'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Username</label>
                <input
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  {editingId ? 'New password (leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Profile</label>
                <select
                  value={form.profile}
                  onChange={e => setForm(f => ({ ...f, profile: e.target.value as 'admin' | 'user' }))}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="user">User — can use existing environments and tables</option>
                  <option value="admin">Admin — full access</option>
                </select>
              </div>

              {/* Allowed methods */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Allowed HTTP methods</label>
                <div className="flex gap-2 flex-wrap">
                  {ALL_METHODS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMethod(m)}
                      className={`px-3 py-1 rounded text-xs font-mono font-medium border transition-colors ${
                        form.allowedMethods.includes(m)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-900 text-slate-400 border-slate-600 hover:border-blue-500'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allowed protocols */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Allowed protocols</label>
                <div className="flex gap-2 flex-wrap">
                  {ALL_PROTOCOLS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => toggleMethod(p)}
                      className={`px-3 py-1 rounded text-xs font-mono font-medium border transition-colors ${
                        form.allowedMethods.includes(p)
                          ? `bg-amber-700 border-amber-600 ${METHOD_COLORS[p]}`
                          : 'bg-slate-900 text-slate-400 border-slate-600 hover:border-amber-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-600 mt-1.5">Grant access to SOAP calls (Bulk Feeder &amp; Import pages)</p>
              </div>

              {/* Server env access */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Server environment access</label>
                <label className="flex items-center gap-2 mb-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={envAccessAll}
                    onChange={e => setForm(f => ({ ...f, serverEnvAccess: e.target.checked ? 'all' : [] }))}
                    className="rounded"
                  />
                  Access to all environments (current and future)
                </label>
                {!envAccessAll && (
                  <div className="space-y-1.5 pl-1">
                    {serverEnvs.length === 0 ? (
                      <p className="text-slate-500 text-xs italic">No server environments yet. Create environments first.</p>
                    ) : serverEnvs.map(env => (
                      <label key={env.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={envAccessList.includes(env.id)}
                          onChange={() => toggleEnvAccess(env.id)}
                          className="rounded"
                        />
                        {env.name}
                        <span className="text-slate-500 text-xs font-mono">{env.baseUrl}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Endpoint access */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Endpoint access</label>
                <label className="flex items-center gap-2 mb-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={endpointAccessAll}
                    onChange={e => setForm(f => ({ ...f, allowedEndpoints: e.target.checked ? 'all' : [] }))}
                    className="rounded"
                  />
                  Access to all endpoints (default)
                </label>
                {!endpointAccessAll && (
                  <div className="border border-slate-600 rounded max-h-52 overflow-y-auto">
                    {Object.entries(endpointsByGroup).map(([group, eps]) => {
                      const groupIds = eps.map(e => e.id);
                      const allSelected = groupIds.every(id => endpointAccessList.includes(id));
                      const someSelected = groupIds.some(id => endpointAccessList.includes(id));
                      return (
                        <div key={group} className="border-b border-slate-700 last:border-0">
                          <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-700/40">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={el => { if (el) el.indeterminate = !allSelected && someSelected; }}
                              onChange={() => toggleEndpointGroup(group)}
                              className="rounded shrink-0"
                            />
                            <button
                              type="button"
                              onClick={() => toggleEpGroup(group)}
                              className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 flex-1 text-left"
                            >
                              <svg
                                className={`w-3 h-3 transition-transform shrink-0 ${isEpGroupExpanded(group) ? 'rotate-90' : ''}`}
                                fill="currentColor" viewBox="0 0 20 20"
                              >
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                              {group}
                              <span className="text-slate-500 font-normal ml-1">({eps.length})</span>
                            </button>
                          </div>
                          {isEpGroupExpanded(group) && eps.map(ep => (
                            <label key={ep.id} className="flex items-center gap-2 px-3 py-1 pl-8 cursor-pointer hover:bg-slate-700/20">
                              <input
                                type="checkbox"
                                checked={endpointAccessList.includes(ep.id)}
                                onChange={() => toggleEndpoint(ep.id)}
                                className="rounded shrink-0"
                              />
                              <span className={`text-xs font-mono font-bold w-12 shrink-0 ${METHOD_COLORS[ep.method] ?? 'text-slate-400'}`}>
                                {ep.method}
                              </span>
                              <span className="text-xs text-slate-300 truncate">{ep.name}</span>
                            </label>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-2 rounded text-sm transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-slate-600 text-slate-400 hover:text-white py-2 rounded text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
