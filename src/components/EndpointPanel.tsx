'use client';

import { useState, useEffect } from 'react';
import { endpoints, type Endpoint } from '@/lib/endpoints';
import type { Config } from './ConfigBar';
import ResponsePanel, { type ApiResponse } from './ResponsePanel';
import { loadPersistedBody, savePersistedBody, getStoredToken, setStoredToken } from '@/lib/secure-storage';

interface Props {
  endpoint: Endpoint;
  config: Config;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-600',
  POST: 'bg-yellow-600',
  PUT: 'bg-blue-600',
  PATCH: 'bg-orange-600',
  DELETE: 'bg-red-600',
};

interface QueryParam {
  key: string;
  value: string;
  enabled: boolean;
}

export default function EndpointPanel({ endpoint, config }: Props) {
  const [body, setBody] = useState(endpoint.body);
  const [queryParams, setQueryParams] = useState<QueryParam[]>(() =>
    endpoint.queryParams.map(p => ({ ...p, enabled: true }))
  );
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [bodyError, setBodyError] = useState('');
  const [tokenAvailable, setTokenAvailable] = useState(false);

  const tokenSourceName = endpoint.tokenSourceId
    ? endpoints.find(e => e.id === endpoint.tokenSourceId)?.name ?? 'the token endpoint'
    : undefined;

  useEffect(() => {
    setBody(endpoint.body);
    setQueryParams(endpoint.queryParams.map(p => ({ ...p, enabled: true })));
    setResponse(null);
    setBodyError('');
    setTokenAvailable(endpoint.tokenSourceId ? !!getStoredToken(endpoint.tokenSourceId) : false);

    if (endpoint.persistBodyEncrypted) {
      let cancelled = false;
      loadPersistedBody(endpoint.id).then(saved => {
        if (!cancelled && saved !== null) setBody(saved);
      });
      return () => { cancelled = true; };
    }
  }, [endpoint.id]);

  useEffect(() => {
    const base = config.baseUrl.replace(/\/$/, '');
    let url = endpoint.url.replace('{{baseURL}}', base);

    const enabledParams = queryParams.filter(p => p.enabled && p.key);
    if (enabledParams.length > 0) {
      const qs = enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      const hasQuery = url.includes('?');
      url = hasQuery ? url.split('?')[0] + '?' + qs : url + '?' + qs;
    } else {
      url = url.split('?')[0];
    }
    setResolvedUrl(url);
  }, [endpoint.url, config.baseUrl, queryParams]);

  const validateBody = (val: string): boolean => {
    if (!val.trim()) return true;
    try {
      JSON.parse(val);
      setBodyError('');
      return true;
    } catch (e: unknown) {
      setBodyError(e instanceof Error ? e.message : 'Invalid JSON');
      return false;
    }
  };

  const execute = async () => {
    if (!config.baseUrl) {
      alert('Please configure the Base URL first.');
      return;
    }
    if (body && !validateBody(body)) return;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (endpoint.authType === 'bearer') {
      const stored = endpoint.tokenSourceId ? getStoredToken(endpoint.tokenSourceId) : null;
      if (!stored) {
        alert(`No bearer token available. Call "${tokenSourceName}" first.`);
        return;
      }
      headers['Authorization'] = 'Bearer ' + stored.token;
    } else if (endpoint.authType !== 'none' && config.username) {
      headers['Authorization'] = 'Basic ' + btoa(`${config.username}:${config.password}`);
    }

    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: resolvedUrl,
          method: endpoint.method,
          headers,
          body: body || undefined,
          endpointId: endpoint.id,
        }),
      });
      const data = await res.json();
      setResponse(data);

      if (
        data.status >= 200 && data.status < 300 &&
        data.body && typeof data.body === 'object' &&
        typeof (data.body as Record<string, unknown>).token === 'string'
      ) {
        const tokenBody = data.body as { token: string; generationDateUTC?: string; peremptionDateUTC?: string };
        setStoredToken(endpoint.id, tokenBody);
        setTokenAvailable(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setResponse({ status: 0, statusText: 'Error', headers: {}, body: message, elapsed: 0 });
    } finally {
      setLoading(false);
    }
  };

  const updateParam = (i: number, field: 'key' | 'value' | 'enabled', val: string | boolean) => {
    setQueryParams(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  };

  const addParam = () => setQueryParams(prev => [...prev, { key: '', value: '', enabled: true }]);
  const removeParam = (i: number) => setQueryParams(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700 bg-slate-850">
        <div className="flex items-start gap-3 mb-1">
          <span className={`${METHOD_COLORS[endpoint.method] ?? 'bg-slate-600'} text-white text-xs font-bold px-2.5 py-1 rounded shrink-0`}>
            {endpoint.method}
          </span>
          <div className="min-w-0">
            <h1 className="text-white font-semibold text-base leading-tight">{endpoint.name}</h1>
            <p className="text-slate-500 text-xs mt-0.5">{endpoint.group}{endpoint.subgroup ? ` › ${endpoint.subgroup}` : ''}</p>
          </div>
        </div>
      </div>

      {/* Bearer token status */}
      {endpoint.authType === 'bearer' && (
        <div className={`px-5 py-2 text-xs border-b border-slate-700 ${tokenAvailable ? 'text-emerald-400 bg-emerald-400/5' : 'text-amber-400 bg-amber-400/5'}`}>
          {tokenAvailable
            ? `Bearer token available (from "${tokenSourceName}").`
            : `No bearer token yet — call "${tokenSourceName}" first.`}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* URL Bar */}
        <div className="px-5 py-4 border-b border-slate-700">
          <label className="text-xs font-medium text-slate-400 block mb-1.5">Request URL</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 font-mono text-xs text-slate-300 break-all min-h-[2.25rem]">
              {resolvedUrl || <span className="text-slate-600">Configure base URL to preview</span>}
            </div>
            <button
              onClick={execute}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium px-5 py-2 rounded transition-colors shrink-0"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>

        {/* Query Params */}
        {(queryParams.length > 0 || true) && (
          <div className="px-5 py-4 border-b border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-400">Query Parameters</label>
              <button onClick={addParam} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">+ Add</button>
            </div>
            {queryParams.length === 0 ? (
              <p className="text-slate-600 text-xs italic">No query parameters. Click Add to include some.</p>
            ) : (
              <div className="space-y-2">
                {queryParams.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={e => updateParam(i, 'enabled', e.target.checked)}
                      className="accent-blue-500 shrink-0"
                    />
                    <input
                      type="text"
                      value={p.key}
                      onChange={e => updateParam(i, 'key', e.target.value)}
                      placeholder="key"
                      className="flex-1 bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 font-mono placeholder:text-slate-600"
                    />
                    <input
                      type="text"
                      value={p.value}
                      onChange={e => updateParam(i, 'value', e.target.value)}
                      placeholder="value"
                      className="flex-1 bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 font-mono placeholder:text-slate-600"
                    />
                    <button onClick={() => removeParam(i)} className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Body */}
        {endpoint.method !== 'GET' && endpoint.method !== 'HEAD' && (
          <div className="px-5 py-4 border-b border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-400">
                Request Body <span className="text-slate-600">(JSON)</span>
                {endpoint.persistBodyEncrypted && (
                  <span className="text-slate-600 ml-2 normal-case font-normal">🔒 saved locally, encrypted</span>
                )}
              </label>
              {body && (
                <button
                  onClick={() => { try { setBody(JSON.stringify(JSON.parse(body), null, 2)); setBodyError(''); } catch { /* skip */ } }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Format
                </button>
              )}
            </div>
            <textarea
              value={body}
              onChange={e => { setBody(e.target.value); if (bodyError) validateBody(e.target.value); }}
              onBlur={e => {
                validateBody(e.target.value);
                if (endpoint.persistBodyEncrypted) savePersistedBody(endpoint.id, e.target.value);
              }}
              rows={10}
              className={`w-full bg-slate-900 border rounded px-3 py-2 font-mono text-xs text-slate-300 focus:outline-none resize-y ${bodyError ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'}`}
              placeholder="Enter JSON body..."
            />
            {bodyError && <p className="text-red-400 text-xs mt-1">{bodyError}</p>}
          </div>
        )}

        {/* Description */}
        {endpoint.description && (
          <div className="px-5 py-4 border-b border-slate-700">
            <label className="text-xs font-medium text-slate-400 block mb-2">Description</label>
            <p className="text-slate-400 text-xs whitespace-pre-wrap leading-relaxed">{endpoint.description}</p>
          </div>
        )}

        {/* Response */}
        {(response || loading) && (
          <div className="px-5 py-4">
            <ResponsePanel response={response} loading={loading} />
          </div>
        )}
      </div>
    </div>
  );
}
