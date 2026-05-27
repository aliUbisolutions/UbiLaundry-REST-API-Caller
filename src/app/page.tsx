'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ConfigBar, { type Config } from '@/components/ConfigBar';
import Sidebar from '@/components/Sidebar';
import EndpointPanel from '@/components/EndpointPanel';
import { endpoints } from '@/lib/endpoints';

const DEFAULT_CONFIG: Config = { baseUrl: '', username: '', password: '' };
const STORAGE_KEY = 'ubilaundry-config';

export default function Home() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setConfig(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const handleConfigChange = (c: Config) => {
    setConfig(c);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  };

  const selectedEndpoint = endpoints.find(e => e.id === selectedId) ?? null;

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
      <ConfigBar config={config} onChange={handleConfigChange} />

      <div className="flex flex-1 min-h-0">
        <div className="w-72 shrink-0 flex flex-col min-h-0">
          <Sidebar selected={selectedId} onSelect={setSelectedId} />
          <div className="p-3 border-t border-slate-700">
            <Link
              href="/import"
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Bulk Assignment Import
            </Link>
          </div>
        </div>

        <div className="flex-1 min-w-0 overflow-hidden">
          {selectedEndpoint ? (
            <EndpointPanel key={selectedEndpoint.id} endpoint={selectedEndpoint} config={config} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-white text-lg font-semibold mb-2">UbiLaundry REST API</h2>
              <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                Select an endpoint from the sidebar to get started. Configure your base URL and credentials using the{' '}
                <span className="text-blue-400">Configure</span> button above.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-2xl font-bold text-white">141</p>
                  <p className="text-xs text-slate-500 mt-0.5">Endpoints</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-2xl font-bold text-white">8</p>
                  <p className="text-xs text-slate-500 mt-0.5">Groups</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-2xl font-bold text-white">Basic</p>
                  <p className="text-xs text-slate-500 mt-0.5">Auth</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
