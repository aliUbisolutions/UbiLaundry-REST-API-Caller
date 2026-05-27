'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  loadEnvironments, loadConversionTables, saveConversionTables,
  proxyGet, genId,
  ENTITY_TYPES,
  type Environment, type ConversionTable, type ConversionMapping, type FallbackStrategy,
} from '@/lib/storage';
import { APP_VERSION } from '@/lib/version';

interface IdOption { id: string; label: string; }

function AddPathInline({ onAdd }: { onAdd: (p: string) => void }) {
  const [val, setVal] = useState('');
  const commit = () => { if (val.trim()) { onAdd(val.trim()); setVal(''); } };
  return (
    <span className="flex items-center gap-1">
      <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && commit()}
        placeholder="add field path…"
        className="bg-slate-800 border border-slate-600 text-white text-xs rounded px-2 py-0.5 w-40 font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
      <button onClick={commit} className="text-blue-400 hover:text-blue-300 text-xs transition-colors">+</button>
    </span>
  );
}

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
  const [form, setForm] = useState({ name: '', sourceEnvId: '', targetEnvId: '' });
  const [formPaths, setFormPaths] = useState<string[]>(['']);

  // Inline name editing
  const [editingName, setEditingName] = useState<string | null>(null);

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
    const validPaths = formPaths.map(p => p.trim()).filter(Boolean);
    if (!form.name.trim() || !form.sourceEnvId || !form.targetEnvId || validPaths.length === 0) return;
    const t: ConversionTable = { id: genId(), ...form, fieldPaths: validPaths, mappings: [], fallback: 'error' };
    persist([...tables, t]);
    setSelected(t);
    setShowForm(false);
    setForm({ name: '', sourceEnvId: '', targetEnvId: '' });
    setFormPaths(['']);
  };

  const addFormPath    = () => setFormPaths(p => [...p, '']);
  const removeFormPath = (i: number) => setFormPaths(p => p.filter((_, idx) => idx !== i));
  const updateFormPath = (i: number, v: string) => setFormPaths(p => p.map((x, idx) => idx === i ? v : x));

  const addTablePath = (path: string) => {
    if (!selected || !path.trim()) return;
    const updated = { ...selected, fieldPaths: [...selected.fieldPaths, path.trim()] };
    persist(tables.map(t => t.id === selected.id ? updated : t));
    setSelected(updated);
  };

  const removeTablePath = (i: number) => {
    if (!selected) return;
    const updated = { ...selected, fieldPaths: selected.fieldPaths.filter((_, idx) => idx !== i) };
    persist(tables.map(t => t.id === selected.id ? updated : t));
    setSelected(updated);
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

  const commitName = () => {
    if (!selected || editingName === null) return;
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== selected.name) {
      const updated = { ...selected, name: trimmed };
      persist(tables.map(t => t.id === selected.id ? updated : t));
      setSelected(updated);
    }
    setEditingName(null);
  };

  // Group tables by source→target pair
  const grouped = tables.reduce<Record<string, ConversionTable[]>>((acc, t) => {
    const key = `${t.sourceEnvId}__${t.targetEnvId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const openNewForPair = (sourceEnvId: string, targetEnvId: string) => {
    setForm({ name: '', sourceEnvId, targetEnvId });
    setFormPaths(['']);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="bg-slate-800 border-b border-slate-700 px-5 py-3 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          Back
        </Link>
        <div className="w-px h-4 bg-slate-700" />
        <h1 className="text-white font-semibold text-sm">Conversion Tables</h1>
        <span className="text-slate-600 text-xs font-mono">v{APP_VERSION}</span>
        <div className="flex-1" />
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          New table
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Table list — grouped by env pair */}
        <div className="w-80 shrink-0 border-r border-slate-700 overflow-y-auto">
          {tables.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-slate-500 text-sm mb-3">No conversion tables yet.</p>
              <button onClick={() => setShowForm(true)} className="text-blue-400 hover:text-blue-300 text-xs transition-colors">Create one →</button>
            </div>
          ) : (
            <div className="p-3 space-y-4">
              {Object.entries(grouped).map(([pairKey, pairTables]) => {
                const [srcId, tgtId] = pairKey.split('__');
                return (
                  <div key={pairKey}>
                    {/* Pair header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-blue-300 text-xs font-medium truncate">{envName(srcId)}</span>
                        <svg className="w-3 h-3 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        <span className="text-emerald-300 text-xs font-medium truncate">{envName(tgtId)}</span>
                      </div>
                      <button
                        onClick={() => openNewForPair(srcId, tgtId)}
                        title="Add table for this pair"
                        className="text-slate-500 hover:text-blue-400 transition-colors shrink-0 ml-2"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>

                    {/* Table cards */}
                    <div className="space-y-1.5 pl-1">
                      {pairTables.map(t => (
                        <button
                          key={t.id}
                          onClick={() => { setSelected(t); setSourceIds([]); setTargetIds([]); setLoadError(''); setEditingName(null); }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                            selected?.id === t.id
                              ? 'bg-slate-700 border-slate-600'
                              : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <p className="text-white text-sm font-medium truncate">{t.name}</p>
                          <p className="text-slate-500 text-xs font-mono mt-1 truncate">{t.fieldPaths.join(', ')}</p>
                          <p className="text-slate-600 text-xs mt-0.5">{t.mappings.length} mapping{t.mappings.length !== 1 ? 's' : ''}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
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
                <div className="min-w-0">
                  {editingName !== null ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={commitName}
                      onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(null); }}
                      className="text-white text-lg font-semibold bg-slate-700 border border-blue-500 rounded px-2 py-0.5 focus:outline-none w-full max-w-sm"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingName(selected.name)}
                      className="group flex items-center gap-1.5 text-white text-lg font-semibold hover:text-blue-300 transition-colors"
                    >
                      {selected.name}
                      <svg className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2.414a2 2 0 01.586-1.414z" />
                      </svg>
                    </button>
                  )}
                  <p className="text-slate-400 text-sm mt-0.5">
                    <span className="text-blue-300">{envName(selected.sourceEnvId)}</span>
                    {' → '}
                    <span className="text-emerald-300">{envName(selected.targetEnvId)}</span>
                  </p>
                  {/* Field paths */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selected.fieldPaths.map((fp, i) => (
                      <span key={i} className="flex items-center gap-1 bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded font-mono">
                        {fp}
                        <button onClick={() => removeTablePath(i)} className="text-slate-500 hover:text-red-400 transition-colors ml-0.5">✕</button>
                      </span>
                    ))}
                    <AddPathInline onAdd={addTablePath} />
                  </div>
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

              {/* Fallback strategy */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-slate-300">When no mapping matches…</p>
                <div className="space-y-2">
                  {([
                    { value: 'error',       label: 'Return an error for the row',  desc: 'Row is skipped and logged. Other rows continue.' },
                    { value: 'default',     label: 'Use a default target value',   desc: 'Apply a fixed target ID when the source ID is unknown.' },
                    { value: 'keep-source', label: 'Keep the source value as-is',  desc: 'The original ID from the file is sent unchanged.' },
                  ] as { value: FallbackStrategy; label: string; desc: string }[]).map(opt => (
                    <label key={opt.value} className="flex items-start gap-3 cursor-pointer group">
                      <input type="radio" name="fallback" value={opt.value}
                        checked={selected.fallback === opt.value}
                        onChange={() => {
                          const updated = { ...selected, fallback: opt.value };
                          persist(tables.map(t => t.id === selected.id ? updated : t));
                          setSelected(updated);
                        }}
                        className="accent-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-sm text-slate-200">{opt.label}</span>
                        <p className="text-xs text-slate-500">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Default value picker */}
                {selected.fallback === 'default' && (
                  <div className="pt-2 border-t border-slate-700 space-y-2">
                    <p className="text-xs text-slate-400">Default target value to use:</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {targetIds.length > 0 ? (
                        <select
                          value={selected.fallbackDefaultId ?? ''}
                          onChange={e => {
                            const opt = targetIds.find(o => o.id === e.target.value);
                            const updated = { ...selected, fallbackDefaultId: e.target.value, fallbackDefaultLabel: opt?.label };
                            persist(tables.map(t => t.id === selected.id ? updated : t));
                            setSelected(updated);
                          }}
                          className="bg-slate-900 border border-slate-600 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 min-w-[220px]"
                        >
                          <option value="">— pick a target ID —</option>
                          {targetIds.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                      ) : (
                        <input type="text"
                          value={selected.fallbackDefaultId ?? ''}
                          onChange={e => {
                            const updated = { ...selected, fallbackDefaultId: e.target.value, fallbackDefaultLabel: undefined };
                            persist(tables.map(t => t.id === selected.id ? updated : t));
                            setSelected(updated);
                          }}
                          placeholder="type a target ID…"
                          className="bg-slate-900 border border-slate-600 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 font-mono w-48 placeholder:text-slate-600" />
                      )}
                      {selected.fallbackDefaultId && (
                        <span className="text-xs text-emerald-400">
                          → {selected.fallbackDefaultId}{selected.fallbackDefaultLabel ? ` (${selected.fallbackDefaultLabel})` : ''}
                        </span>
                      )}
                      {targetIds.length === 0 && (
                        <span className="text-xs text-slate-500">
                          or load target IDs above to pick from a list
                        </span>
                      )}
                    </div>
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
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Field paths in JSON body
                  <span className="text-slate-600 font-normal ml-1">— add all paths that share the same ID space</span>
                </label>
                <div className="space-y-1.5">
                  {formPaths.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" value={p} onChange={e => updateFormPath(i, e.target.value)}
                        placeholder="e.g. lastSeenLocation.id"
                        className="flex-1 bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500 font-mono placeholder:text-slate-600" />
                      {formPaths.length > 1 && (
                        <button onClick={() => removeFormPath(i)} className="text-slate-500 hover:text-red-400 transition-colors px-2">✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addFormPath} className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1.5">+ Add another path</button>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={createTable}
                disabled={!form.name.trim() || !form.sourceEnvId || !form.targetEnvId || !formPaths.some(p => p.trim())}
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
