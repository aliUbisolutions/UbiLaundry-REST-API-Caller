'use client';

import { useState } from 'react';

export interface Config {
  baseUrl: string;
  username: string;
  password: string;
}

interface Props {
  config: Config;
  onChange: (config: Config) => void;
}

export default function ConfigBar({ config, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(config);

  const save = () => {
    onChange(local);
    setOpen(false);
  };

  return (
    <div className="bg-slate-800 border-b border-slate-700">
      <div className="flex items-center gap-4 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <rect width="24" height="24" rx="4" fill="#2563EB" />
              <path d="M5 8h14M5 12h14M5 16h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-bold text-white text-sm tracking-wide">UbiLaundry API</span>
        </div>

        <div className="flex-1 flex items-center gap-2 bg-slate-900 rounded px-3 py-1 min-w-0">
          <span className="text-slate-400 text-xs shrink-0">Base URL:</span>
          <span className="text-blue-300 text-xs truncate font-mono">
            {config.baseUrl || <span className="text-slate-500 italic">not set</span>}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {config.username && (
            <span className="text-xs text-slate-400">
              User: <span className="text-slate-300">{config.username}</span>
            </span>
          )}
          <button
            onClick={() => { setLocal(config); setOpen(true); }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configure
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h2 className="text-white font-semibold">API Configuration</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Base URL</label>
                <input
                  type="text"
                  value={local.baseUrl}
                  onChange={e => setLocal({ ...local, baseUrl: e.target.value })}
                  placeholder="https://your-server.ubi-manager.com"
                  className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500 font-mono placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Username</label>
                <input
                  type="text"
                  value={local.username}
                  onChange={e => setLocal({ ...local, username: e.target.value })}
                  placeholder="admin"
                  className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                <input
                  type="password"
                  value={local.password}
                  onChange={e => setLocal({ ...local, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                />
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5 justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
