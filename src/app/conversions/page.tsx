'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  loadEnvironments, loadConversionTables, saveConversionTables,
  proxyGet, genId,
  ENTITY_TYPES,
  type Environment, type ConversionTable, type ConversionMapping,
} from '@/lib/storage';

interface IdOption { id: string; label: string; }

function extractIdOptions(items: unknown[]): IdOption[] {
  return items.map((item) => {
    const o = item as Record<string, unknown>;
    const id = String(o.id ?? '');
    const label = String(o.name ?? o.id ?? '');
    return { id, label: label !== id ? `${id} — ${label}` : id };
  }).filter(o => o.id);
}

export default function ConversionsPage() {
  const [envs, setEnvs]     = useState<Environment[]>([]);
  const [tables, setTables] = useState<ConversionTable[]>([]);
  const [selected, setSelected] = useState<ConversionTable | null>(null);

  // New table form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', sourceEnvId: '', targetEnvId: '', fieldPath: '' });

  // ID loading for mapping editor
  const [entityType, setEntityType]   = useState('Location');
  const [sourceIds, setSourceIds]     = useState<IdOption[]>([]);
  const [targetIds, setTargetIds]     = useState<IdOption[]>([]);
  const [loadingIds, setLoadingIds]   = useState<'source' | 'target' | null>(null);
  const [loadError, setLoadError]     = useState('');

  useEffect(() => {
    setEnvs(loadEnvironments());
    setTables(loadConversionTables());
  }, []);

  const persist = (updated: ConversionTable[]) => { saveConversionTables(updated); setTables(updated); };

  const createTable = () => {
    if (!form.name.trim() || !form.sourceEnvId || !form.targetEnvId || !form.fieldPath.trim()) return;
    const t: ConversionTable = { id: genId(), ...form, mappings: [] };
    persist([...tables, t]);
    setSelected(t);
    setShowForm(false);
    setForm({ name: '', sourceEnvId: '', targetEnvId: '', fieldPath: '' });
  };

  const deleteTable = (id: string) => {
    if (!confirm('Delete this conversion table?')) return;
    const updated = tables.filter(t => t.id !== id);
    persist(updated);
    if (selected?.id === id) setSelected(null);
  };

  const addMapping = () => {
    if (!selected) return;
    const updated: ConversionTable = { ...selected, mappings: [...selected.mappings, { sourceId: '', targetId: '' }] };
    persist(tables.map(t => t.id === selected.id ? updated : t));
    setSelected(updated);
  };

  const updateMapping = (i: number, field: keyof ConversionMapping, val: string) => {
    if (!selected) return;
    const mappings = selected.mappings.map((m, idx) => idx === i ? { ...m, [field]: val } : m);
    const updated = { ...selected, mappings };
    persist(tables.map(t => t.id === selected.id ? updated : t));
    setSelected(updated);
  };

  const removeMapping = (i: number) => {
    if (!selected) return;
    const mappings = selected.mappings.filter((_, idx) => idx !== i);
    const updated = { ...selected, mappings };
    persist(tables.map(t => t.id === selected.id ? updated : t));
    setSelected(updated);
  };

  const loadIds = async (side: 'source' | 'target') => {
    if (!selected) return;
    const envId = side === 'source' ? selected.sourceEnvId : selected.targetEnvId;
    const env = envs.find(e => e.id === envId);
    if (!env) { setLoadError(`Environment not found`); return; }
    setLoadingIds(side); setLoadError('');
    try {
      const items = await proxyGet(env, `/api/entities/${entityType}`);
      const opts  = extractIdOptions(items);
      if (side === 'source') setSourceIds(opts); else setTargetIds(opts);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load IDs');
    } finally { setLoadingIds(null); }
  };

  const autoMatch = () => {
    if (!selected || !sourceIds.length || !targetIds.length) return;
    const newMappings: ConversionMapping[] = sourceIds.map(src => {
      const srcName = src.label.split(' — ')[1] ?? src.id;
      const match   = targetIds.find(t => (t.label.split(' — ')[1] ?? t.id) === srcName);
      return { sourceId: src.id, targetId: match?.id ?? '', label: srcName };
    });
    const updated = { ...selected, mappings: newMappings };
    persist(tables.map(t => t.id === selected.id ? updated : t));
    setSelected(updated);
  };

  const envName = (id: string) => envs.find(e => e.id === id)?.name ?? id;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="bg-slate-800 border-b border-slate-700 px-5 py-3 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          Back
        </Link>
        <div className="w-px h-4 bg-slate-700" />
        <h1 className="text-white font-semibold text-sm">Conversion Tables</h1>
        <div className="flex-1" />
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          New table
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Table list */}
        <div className="w-72 shrink-0 border-r border-slate-700 overflow-y-auto">
          {tables.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-slate-500 text-sm mb-3">No conversion tables yet.</p>
              <button onClick={() => setShowForm(true)} className="text-blue-400 hover:text-blue-300 text-xs transition-colors">Create one →</button>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {tables.map(t => (
                <button key={t.id} onClick={() => { setSelected(t); setSourceIds([]); setTargetIds([]); setLoadError(''); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors group ${selected?.id === t.id ? 'bg-slate-700' : 'hover:bg-slate-800'}`}>
                  <p className="text-white text-sm font-medium truncate">{t.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5 truncate">{envName(t.sourceEnvId)} → {envName(t.targetEnvId)}</p>
                  <p className="text-slate-600 text-xs font-mono">{t.fieldPath} · {t.mappings.length} mappings</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mapping editor */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-slate-600">
              <p>Select a table to edit its mappings</p>
            </div>
          ) : (
            <div className="p-6 max-w-3xl space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-white text-lg font-semibold">{selected.name}</h2>
                  <p className="text-slate-400 text-sm mt-0.5">
                    <span className="text-blue-300">{envName(selected.sourceEnvId)}</span>
                    {' → '}
                    <span className="text-emerald-300">{envName(selected.targetEnvId)}</span>
                    {' · field: '}
                    <code className="text-slate-300 font-mono">{selected.fieldPath}</code>
                  </p>
                </div>
                <button onClick={() => deleteTable(selected.id)} className="text-xs text-slate-500 hover:text-red-400 px-2.5 py-1.5 border border-slate-700 rounded transition-colors">
                  Delete table
                </button>
              </div>

              {/* Load IDs from API */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-slate-300">Load IDs from API</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <select value={entityType} onChange={e => setEntityType(e.target.value)}
                    className="bg-slate-900 border border-slate-600 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500">
                    {ENTITY_TYPES.map(et => <option key={et} value={et}>{et}</option>)}
                  </select>
                  <button onClick={() => loadIds('source')} disabled={loadingIds !== null}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded transition-colors">
                    {loadingIds === 'source' ? '…' : `Load from ${envName(selected.sourceEnvId)}`}
                  </button>
                  <button onClick={() => loadIds('target')} disabled={loadingIds !== null}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded transition-colors">
                    {loadingIds === 'target' ? '…' : `Load from ${envName(selected.targetEnvId)}`}
                  </button>
                  {sourceIds.length > 0 && targetIds.length > 0 && (
                    <button onClick={autoMatch} className="text-xs px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors">
                      Auto-match by name
                    </button>
                  )}
                </div>
                {loadError && <p className="text-red-400 text-xs">{loadError}</p>}
                {(sourceIds.length > 0 || targetIds.length > 0) && (
                  <div className="flex gap-4 text-xs text-slate-400">
                    {sourceIds.length > 0 && <span className="text-blue-300">{sourceIds.length} source IDs loaded</span>}
                    {targetIds.length > 0 && <span className="text-emerald-300">{targetIds.length} target IDs loaded</span>}
                  </div>
                )}
              </div>

              {/* Mappings table */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                  <div className="grid grid-cols-3 gap-3 flex-1 text-xs font-medium text-slate-400">
                    <span>Source ID ({envName(selected.sourceEnvId)})</span>
                    <span>Target ID ({envName(selected.targetEnvId)})</span>
                    <span>Label (optional)</span>
                  </div>
                  <div className="w-6" />
                </div>

                {selected.mappings.length === 0 ? (
                  <p className="px-4 py-6 text-slate-600 text-sm text-center">No mappings yet. Add one below or use Auto-match.</p>
                ) : (
                  <div className="divide-y divide-slate-700/50 max-h-96 overflow-y-auto">
                    {selected.mappings.map((m, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2">
                        <div className="grid grid-cols-3 gap-3 flex-1">
                          {/* Source ID */}
                          {sourceIds.length > 0 ? (
                            <select value={m.sourceId} onChange={e => updateMapping(i, 'sourceId', e.target.value)}
                              className="bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500">
                              <option value="">— select —</option>
                              {sourceIds.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                            </select>
                          ) : (
                            <input type="text" value={m.sourceId} onChange={e => updateMapping(i, 'sourceId', e.target.value)}
                              placeholder="source ID"
                              className="bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 font-mono placeholder:text-slate-600" />
                          )}
                          {/* Target ID */}
                          {targetIds.length > 0 ? (
                            <select value={m.targetId} onChange={e => updateMapping(i, 'targetId', e.target.value)}
                              className="bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500">
                              <option value="">— select —</option>
                              {targetIds.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                            </select>
                          ) : (
                            <input type="text" value={m.targetId} onChange={e => updateMapping(i, 'targetId', e.target.value)}
                              placeholder="target ID"
                              className="bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 font-mono placeholder:text-slate-600" />
                          )}
                          <input type="text" value={m.label ?? ''} onChange={e => updateMapping(i, 'label', e.target.value)}
                            placeholder="e.g. Paris → Berlin"
                            className="bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
                        </div>
                        <button onClick={() => removeMapping(i)} className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="px-4 py-3 border-t border-slate-700">
                  <button onClick={addMapping} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">+ Add mapping row</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New table modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h2 className="text-white font-semibold">New conversion table</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Table name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Locations FR → DE"
                  className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Source environment</label>
                  <select value={form.sourceEnvId} onChange={e => setForm({ ...form, sourceEnvId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500">
                    <option value="">— select —</option>
                    {envs.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Target environment</label>
                  <select value={form.targetEnvId} onChange={e => setForm({ ...form, targetEnvId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500">
                    <option value="">— select —</option>
                    {envs.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Field path in JSON body</label>
                <input type="text" value={form.fieldPath} onChange={e => setForm({ ...form, fieldPath: e.target.value })}
                  placeholder="e.g. lastSeenLocation.id"
                  className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500 font-mono placeholder:text-slate-600" />
                <p className="text-xs text-slate-600 mt-1">Use dot-notation for nested fields</p>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={createTable}
                disabled={!form.name.trim() || !form.sourceEnvId || !form.targetEnvId || !form.fieldPath.trim()}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded transition-colors">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
