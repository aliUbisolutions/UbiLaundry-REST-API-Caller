'use client';

import { useState, useMemo } from 'react';
import { endpoints, type Endpoint } from '@/lib/endpoints';

interface Props {
  selected: string | null;
  onSelect: (id: string) => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-400',
  POST: 'text-yellow-400',
  PUT: 'text-blue-400',
  PATCH: 'text-orange-400',
  DELETE: 'text-red-400',
};

export default function Sidebar({ selected, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return endpoints;
    return endpoints.filter(
      ep =>
        ep.name.toLowerCase().includes(q) ||
        ep.group.toLowerCase().includes(q) ||
        ep.subgroup.toLowerCase().includes(q) ||
        ep.url.toLowerCase().includes(q)
    );
  }, [search]);

  const groups = useMemo(() => {
    const map: Record<string, Record<string, Endpoint[]>> = {};
    for (const ep of filtered) {
      if (!map[ep.group]) map[ep.group] = {};
      const sub = ep.subgroup || '__root__';
      if (!map[ep.group][sub]) map[ep.group][sub] = [];
      map[ep.group][sub].push(ep);
    }
    return map;
  }, [filtered]);

  const toggle = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const isExpanded = (key: string) => key in expanded ? expanded[key] : true;

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-700">
      <div className="p-3 border-b border-slate-700">
        <div className="relative">
          <svg className="absolute left-2.5 top-2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search endpoints..."
            className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded pl-8 pr-3 py-1.5 focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
          />
        </div>
        <p className="text-slate-600 text-xs mt-1.5">{filtered.length} endpoints</p>
      </div>

      <div className="flex-1 overflow-y-auto text-sm">
        {Object.entries(groups).map(([group, subgroups]) => (
          <div key={group}>
            <button
              onClick={() => toggle(`g:${group}`)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-300 font-semibold text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors"
            >
              <svg
                className={`w-3 h-3 transition-transform shrink-0 ${isExpanded(`g:${group}`) ? 'rotate-90' : ''}`}
                fill="currentColor" viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              {group}
            </button>

            {isExpanded(`g:${group}`) && Object.entries(subgroups).map(([sub, eps]) => (
              <div key={sub}>
                {sub !== '__root__' && (
                  <button
                    onClick={() => toggle(`s:${group}:${sub}`)}
                    className="w-full flex items-center gap-2 pl-6 pr-3 py-1.5 text-left text-slate-400 text-xs font-medium hover:bg-slate-800/50 transition-colors"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform shrink-0 ${isExpanded(`s:${group}:${sub}`) ? 'rotate-90' : ''}`}
                      fill="currentColor" viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    {sub}
                  </button>
                )}

                {(sub === '__root__' || isExpanded(`s:${group}:${sub}`)) && eps.map(ep => (
                  <button
                    key={ep.id}
                    onClick={() => onSelect(ep.id)}
                    className={`w-full flex items-center gap-2 pl-${sub === '__root__' ? '5' : '9'} pr-3 py-1.5 text-left hover:bg-slate-800 transition-colors ${selected === ep.id ? 'bg-slate-800 border-l-2 border-blue-500' : ''}`}
                    style={{ paddingLeft: sub === '__root__' ? '1.25rem' : '2.25rem' }}
                  >
                    <span className={`text-xs font-bold w-12 shrink-0 ${METHOD_COLORS[ep.method] ?? 'text-slate-400'}`}>
                      {ep.method}
                    </span>
                    <span className={`text-xs truncate ${selected === ep.id ? 'text-white' : 'text-slate-400'}`}>
                      {ep.name}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
