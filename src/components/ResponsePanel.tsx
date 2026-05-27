'use client';

import { useState } from 'react';

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  elapsed: number;
}

interface Props {
  response: ApiResponse | null;
  loading: boolean;
}

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return 'text-emerald-400 bg-emerald-400/10';
  if (status >= 300 && status < 400) return 'text-blue-400 bg-blue-400/10';
  if (status >= 400 && status < 500) return 'text-yellow-400 bg-yellow-400/10';
  if (status >= 500) return 'text-red-400 bg-red-400/10';
  return 'text-slate-400 bg-slate-700';
}

function syntaxHighlight(json: string): string {
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'text-purple-300';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'text-blue-300' : 'text-emerald-300';
      } else if (/true|false/.test(match)) {
        cls = 'text-yellow-300';
      } else if (/null/.test(match)) {
        cls = 'text-slate-500';
      } else {
        cls = 'text-orange-300';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

export default function ResponsePanel({ response, loading }: Props) {
  const [tab, setTab] = useState<'body' | 'headers'>('body');
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 flex items-center justify-center gap-3 text-slate-400">
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">Waiting for response...</span>
      </div>
    );
  }

  if (!response) return null;

  const bodyStr = typeof response.body === 'string'
    ? response.body
    : JSON.stringify(response.body, null, 2);

  const copy = async () => {
    await navigator.clipboard.writeText(bodyStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-slate-700 bg-slate-800/50">
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusColor(response.status)}`}>
          {response.status} {response.statusText}
        </span>
        <span className="text-xs text-slate-500">{response.elapsed}ms</span>
        <div className="flex gap-1 ml-auto">
          {(['body', 'headers'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs px-3 py-1 rounded transition-colors capitalize ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'body' && (
        <div className="relative">
          <button
            onClick={copy}
            className="absolute top-2 right-2 z-10 text-xs text-slate-500 hover:text-slate-300 bg-slate-800 px-2 py-1 rounded transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <pre
            className="text-xs p-4 overflow-x-auto max-h-96 leading-relaxed font-mono"
            dangerouslySetInnerHTML={{
              __html: syntaxHighlight(bodyStr.replace(/</g, '&lt;').replace(/>/g, '&gt;')),
            }}
          />
        </div>
      )}

      {tab === 'headers' && (
        <div className="p-4 space-y-1 max-h-96 overflow-y-auto">
          {Object.entries(response.headers).map(([key, value]) => (
            <div key={key} className="flex gap-3 text-xs font-mono">
              <span className="text-blue-300 shrink-0">{key}:</span>
              <span className="text-slate-300 break-all">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
