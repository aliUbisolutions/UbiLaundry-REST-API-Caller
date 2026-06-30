'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  loadEnvironments, saveEnvironments, saveActiveConfig, normalizeBaseUrl,
  loadConversionTables, saveConversionTables,
  genId, type Environment, type ConversionTable,
} from '@/lib/storage';
import { APP_VERSION } from '@/lib/version';
import { useIsAdmin } from '@/components/AuthContext';
import UserBadge from '@/components/UserBadge';
import type { ServerEnvironment } from '@/lib/data-store';

const EMPTY: Omit<Environment, 'id'> = { name: '', baseUrl: '', username: '', password: '' };

interface ConfigBundle {
  version: string;
  exportedAt: string;
  environments: Environment[];
  conversionTables: ConversionTable[];
}

type StorageTarget = 'local' | 'server';

export default function EnvironmentsPage() {
  const isAdminState = useIsAdmin();  // null while loading, then true/false
  const isAdmin = isAdminState === true;

  // Local environments
  const [envs, setEnvs] = useState<Environment[]>([]);
  // Server environments
  const [serverEnvs, setServerEnvs] = useState<ServerEnvironment[]>([]);

  const [editing, setEditing] = useState<Environment | null>(null);
  const [editTarget, setEditTarget] = useState<StorageTarget>('local');
  const [isNew, setIsNew] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

  // Import state
  const [importBundle, setImportBundle] = useState<ConfigBundle | null>(null);
  const [importError, setImportError]   = useState('');
  const importFileRef = useRef<HTMLInputElement>(null);

  const loadServerEnvs = useCallback(() => {
    fetch('/api/server-envs').then(r => r.json()).then(setServerEnvs).catch(() => {});
  }, []);

  useEffect(() => {
    setEnvs(loadEnvironments());
    loadServerEnvs();
  }, [loadServerEnvs]);

  // ─── Local env helpers ─────────────────────────────────────────────────────

  const persist = (updated: Environment[]) => { saveEnvironments(updated); setEnvs(updated); };
  const openNew = (target: StorageTarget = 'local') => { setEditing({ id: genId(), ...EMPTY }); setIsNew(true); setEditTarget(target); };
  const openEdit = (env: Environment, target: StorageTarget) => { setEditing({ ...env }); setIsNew(false); setEditTarget(target); };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.baseUrl.trim()) return;

    if (editTarget === 'server') {
      if (isNew) {
        const res = await fetch('/api/server-envs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editing.name, baseUrl: editing.baseUrl, username: editing.username, password: editing.password }),
        });
        if (res.ok) loadServerEnvs();
      } else {
        await fetch(`/api/server-envs/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editing.name, baseUrl: editing.baseUrl, username: editing.username, password: editing.password }),
        });
        loadServerEnvs();
      }
    } else {
      persist(isNew ? [...envs, editing] : envs.map(e => e.id === editing.id ? editing : e));
    }
    setEditing(null);
  };

  const remove = (id: string) => {
    if (confirm('Delete this environment?')) persist(envs.filter(e => e.id !== id));
  };

  const removeServer = async (id: string) => {
    if (!confirm('Delete this server environment?')) return;
    await fetch(`/api/server-envs/${id}`, { method: 'DELETE' });
    loadServerEnvs();
  };

  const activate = (env: Environment | ServerEnvironment) => {
    saveActiveConfig({ baseUrl: env.baseUrl, username: env.username, password: env.password });
    alert(`"${env.name}" is now the active environment.`);
  };

  const testEnv = async (env: Environment | ServerEnvironment) => {
    setTesting(env.id);
    const url = `${normalizeBaseUrl(env.baseUrl)}/api/getServerTime`;
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

  // ─── Export ────────────────────────────────────────────────────────────────

  const exportConfig = () => {
    const bundle: ConfigBundle = {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      environments: loadEnvironments(),
      conversionTables: loadConversionTables(),
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ubilaundry-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Import ────────────────────────────────────────────────────────────────

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(parsed.environments) || !Array.isArray(parsed.conversionTables))
          throw new Error('Invalid file: missing environments or conversionTables arrays.');
        setImportError('');
        setImportBundle(parsed as ConfigBundle);
      } catch (err: unknown) {
        setImportError(err instanceof Error ? err.message : 'Failed to parse file.');
        setImportBundle(null);
      }
      if (importFileRef.current) importFileRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const applyImport = (mode: 'merge' | 'replace') => {
    if (!importBundle) return;
    if (mode === 'replace') {
      if (!confirm('This will overwrite all current environments and conversion tables. Continue?')) return;
      saveEnvironments(importBundle.environments);
      saveConversionTables(importBundle.conversionTables);
      setEnvs(importBundle.environments);
    } else {
      const idMap = new Map<string, string>();
      const newEnvs = importBundle.environments.map(e => {
        const newId = genId();
        idMap.set(e.id, newId);
        return { ...e, id: newId };
      });
      const newTables = importBundle.conversionTables.map(t => ({
        ...t,
        id: genId(),
        sourceEnvId: idMap.get(t.sourceEnvId) ?? t.sourceEnvId,
        targetEnvId: idMap.get(t.targetEnvId) ?? t.targetEnvId,
      }));
      const mergedEnvs = [...loadEnvironments(), ...newEnvs];
      const mergedTables = [...loadConversionTables(), ...newTables];
      saveEnvironments(mergedEnvs);
      saveConversionTables(mergedTables);
      setEnvs(mergedEnvs);
    }
    setImportBundle(null);
  };

  // ─── Env card ──────────────────────────────────────────────────────────────

  const EnvCard = ({ env, target }: { env: Environment | ServerEnvironment; target: StorageTarget }) => (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-medium">{env.name}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${target === 'server' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
              {target === 'server' ? 'server' : 'local'}
            </span>
          </div>
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
          {isAdmin && (
            <>
              <button onClick={() => openEdit(env as Environment, target)}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 border border-slate-600 rounded transition-colors">
                Edit
              </button>
              <button onClick={() => target === 'server' ? removeServer(env.id) : remove(env.id)}
                className="text-xs text-slate-500 hover:text-red-400 px-2.5 py-1.5 border border-slate-700 rounded transition-colors">
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

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

        {isAdmin && (
          <>
            {/* Import local */}
            <input ref={importFileRef} type="file" accept=".json" className="hidden" onChange={onImportFile} />
            <button
              onClick={() => importFileRef.current?.click()}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500 text-xs px-3 py-1.5 rounded transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              Import
            </button>
            <button
              onClick={exportConfig}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500 text-xs px-3 py-1.5 rounded transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export
            </button>
            <button onClick={() => openNew('server')} className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              New server env
            </button>
            <button onClick={() => openNew('local')} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              New local env
            </button>
          </>
        )}
        <UserBadge />
      </div>

      {importError && (
        <div className="max-w-3xl mx-auto px-5 pt-4">
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded px-4 py-2">{importError}</p>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-5 py-8 space-y-8">
        {/* Server environments */}
        <section>
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Server environments</h2>
          {serverEnvs.length === 0 ? (
            <p className="text-slate-500 text-sm">
              {isAdmin ? 'No server environments yet. Create one to share it with users.' : 'No server environments available.'}
            </p>
          ) : (
            <div className="space-y-3">
              {serverEnvs.map(env => <EnvCard key={env.id} env={env} target="server" />)}
            </div>
          )}
        </section>

        {/* Local environments */}
        <section>
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Local environments (this browser only)</h2>
          {envs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-3">No local environments saved.</p>
              {isAdmin && (
                <button onClick={() => openNew('local')} className="text-blue-400 hover:text-blue-300 text-sm transition-colors">Add a local environment →</button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {envs.map(env => <EnvCard key={env.id} env={env} target="local" />)}
            </div>
          )}
        </section>
      </div>

      {/* Edit/New modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <div>
                <h2 className="text-white font-semibold">{isNew ? 'New environment' : 'Edit environment'}</h2>
                <span className={`text-xs font-medium ${editTarget === 'server' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {editTarget === 'server' ? 'Stored on server — shared with users' : 'Stored locally — this browser only'}
                </span>
              </div>
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

      {/* Import preview modal */}
      {importBundle && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h2 className="text-white font-semibold">Import configuration</h2>
              <button onClick={() => setImportBundle(null)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 space-y-1 text-sm">
                {importBundle.exportedAt && (
                  <p className="text-slate-500 text-xs">Exported {new Date(importBundle.exportedAt).toLocaleString()} · v{importBundle.version}</p>
                )}
                <p className="text-white">
                  <span className="font-semibold text-blue-300">{importBundle.environments.length}</span> environment{importBundle.environments.length !== 1 ? 's' : ''}
                  {importBundle.environments.length > 0 && (
                    <span className="text-slate-500 ml-2 text-xs">{importBundle.environments.map(e => e.name).join(', ')}</span>
                  )}
                </p>
                <p className="text-white">
                  <span className="font-semibold text-emerald-300">{importBundle.conversionTables.length}</span> conversion table{importBundle.conversionTables.length !== 1 ? 's' : ''}
                  {importBundle.conversionTables.length > 0 && (
                    <span className="text-slate-500 ml-2 text-xs">{importBundle.conversionTables.map(t => t.name).join(', ')}</span>
                  )}
                </p>
              </div>
              <p className="text-slate-400 text-xs">These will be imported as local environments.</p>
              <div className="space-y-2">
                <button onClick={() => applyImport('merge')}
                  className="w-full text-left px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg transition-colors">
                  <p className="text-white text-sm font-medium">Merge — add alongside existing</p>
                  <p className="text-slate-400 text-xs mt-0.5">All imported items are added as new entries. Nothing is deleted.</p>
                </button>
                <button onClick={() => applyImport('replace')}
                  className="w-full text-left px-4 py-3 bg-slate-700 hover:bg-red-900/30 border border-slate-600 hover:border-red-500/40 rounded-lg transition-colors">
                  <p className="text-red-300 text-sm font-medium">Replace — overwrite everything</p>
                  <p className="text-slate-400 text-xs mt-0.5">All current local environments and conversion tables are replaced.</p>
                </button>
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end">
              <button onClick={() => setImportBundle(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
