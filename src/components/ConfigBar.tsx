'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  loadEnvironments, saveEnvironments, saveActiveConfig,
  genId, type Environment, type ActiveConfig,
} from '@/lib/storage';
import { APP_VERSION } from '@/lib/version';
import UserBadge from './UserBadge';

export type { ActiveConfig as Config };

interface Props {
  config: ActiveConfig;
  onChange: (config: ActiveConfig) => void;
}

type TestStatus = 'idle' | 'testing' | 'ok' | 'error';

export default function ConfigBar({ config, onChange }: Props) {
  const [open, setOpen]             = useState(false);
  const [local, setLocal]           = useState(config);
  const [envs, setEnvs]             = useState<Environment[]>([]);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [savePrompt, setSavePrompt] = useState(false);
  const [saveName, setSaveName]     = useState('');

  useEffect(() => { setEnvs(loadEnvironments()); }, [open]);

  const resetTest = () => { setTestStatus('idle'); setTestMessage(''); };

  const save = () => { onChange(local); setOpen(false); resetTest(); };

  const switchEnv = (id: string) => {
    const env = envs.find(e => e.id === id);
    if (!env) return;
    const next: ActiveConfig = { baseUrl: env.baseUrl, username: env.username, password: env.password };
    onChange(next);
    saveActiveConfig(next);
  };

  const saveAsEnv = () => {
    if (!saveName.trim()) return;
    const newEnv: Environment = { id: genId(), name: saveName.trim(), ...local };
    const updated = [...envs, newEnv];
    saveEnvironments(updated);
    setEnvs(updated);
    setSavePrompt(false);
    setSaveName('');
  };

  const test = async () => {
    if (!local.baseUrl) { setTestStatus('error'); setTestMessage('Base URL is required.'); return; }
    setTestStatus('testing'); setTestMessage('');
    const url = `${local.baseUrl.replace(/\/$/, '')}/api/getServerTime`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (local.username) headers['Authorization'] = 'Basic ' + btoa(`${local.username}:${local.password}`);
    try {
      const res  = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, method: 'GET', headers }) });
      const data = await res.json();
      if (data.error) { setTestStatus('error'); setTestMessage(data.error); }
      else if (data.status >= 200 && data.status < 300) { setTestStatus('ok'); setTestMessage(`Connected — ${data.status} in ${data.elapsed}ms`); }
      else if (data.status === 401 || data.status === 403) { setTestStatus('error'); setTestMessage(`Authentication failed (${data.status})`); }
      else { setTestStatus('error'); setTestMessage(`Server returned ${data.status} ${data.statusText}`); }
    } catch (err: unknown) { setTestStatus('error'); setTestMessage(err instanceof Error ? err.message : 'Unexpected error'); }
  };

  const activeEnvName = envs.find(e => e.baseUrl === config.baseUrl && e.username === config.username)?.name;

  return (
    <div className="bg-slate-800 border-b border-slate-700">
      <div className="flex items-center gap-3 px-4 py-2">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
            <rect width="24" height="24" rx="4" fill="#2563EB" />
            <path d="M5 8h14M5 12h14M5 16h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="font-bold text-white text-sm tracking-wide hidden sm:inline">UbiLaundry API</span>
          <span className="text-slate-500 text-xs font-mono hidden sm:inline">v{APP_VERSION}</span>
        </div>

        {/* Environment switcher */}
        {envs.length > 0 ? (
          <select
            value={activeEnvName ? envs.find(e => e.name === activeEnvName)?.id ?? '' : ''}
            onChange={e => switchEnv(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 max-w-[160px]"
          >
            <option value="" disabled>Switch environment</option>
            {envs.map(env => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
        ) : null}

        {/* Active URL pill */}
        <div className="flex-1 flex items-center gap-2 bg-slate-900 rounded px-3 py-1 min-w-0">
          {activeEnvName && <span className="text-blue-400 text-xs font-medium shrink-0">{activeEnvName}</span>}
          <span className="text-blue-300 text-xs truncate font-mono">
            {config.baseUrl || <span className="text-slate-500 italic">not set</span>}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/environments" className="text-xs text-slate-400 hover:text-white px-2 py-1.5 rounded hover:bg-slate-700 transition-colors">
            Environments
          </Link>
          <button
            onClick={() => { setLocal(config); resetTest(); setSavePrompt(false); setOpen(true); }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configure
          </button>
          <div className="w-px h-5 bg-slate-700 mx-1" />
          <UserBadge />
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h2 className="text-white font-semibold">API Configuration</h2>
              <button onClick={() => { setOpen(false); resetTest(); }} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Base URL</label>
                <input type="text" value={local.baseUrl}
                  onChange={e => { setLocal({ ...local, baseUrl: e.target.value }); resetTest(); }}
                  placeholder="https://your-server.ubi-manager.com"
                  className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500 font-mono placeholder:text-slate-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Username</label>
                <input type="text" value={local.username}
                  onChange={e => { setLocal({ ...local, username: e.target.value }); resetTest(); }}
                  placeholder="admin"
                  className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                <input type="password" value={local.password}
                  onChange={e => { setLocal({ ...local, password: e.target.value }); resetTest(); }}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
              </div>

              {/* Test result */}
              {testStatus !== 'idle' && (
                <div className={`flex items-center gap-2 text-xs rounded px-3 py-2 ${
                  testStatus === 'testing' ? 'bg-slate-900 text-slate-400' :
                  testStatus === 'ok'      ? 'bg-emerald-400/10 border border-emerald-400/20 text-emerald-400' :
                                            'bg-red-400/10 border border-red-400/20 text-red-400'
                }`}>
                  {testStatus === 'testing' && <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  {testStatus === 'ok'      && <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>}
                  {testStatus === 'error'   && <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>}
                  {testStatus === 'testing' ? 'Testing…' : testMessage}
                </div>
              )}

              {/* Save as environment prompt */}
              {savePrompt && (
                <div className="flex gap-2">
                  <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveAsEnv()}
                    placeholder="Environment name (e.g. Production)"
                    autoFocus
                    className="flex-1 bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
                  <button onClick={saveAsEnv} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded transition-colors">Save</button>
                  <button onClick={() => setSavePrompt(false)} className="px-3 py-2 text-slate-400 hover:text-white text-sm transition-colors">✕</button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 px-5 pb-5">
              <button onClick={test} disabled={testStatus === 'testing'}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                Test
              </button>
              {!savePrompt && (
                <button onClick={() => setSavePrompt(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                  Save as environment
                </button>
              )}
              <div className="flex-1" />
              <button onClick={() => { setOpen(false); resetTest(); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={save} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
