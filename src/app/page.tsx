'use client';

import { useState, useCallback } from 'react';
import type { DebateCycle, DebateConfig, FrictionType, AgentRole } from '@/lib/types';

// ── Styling maps ──────────────────────────────────────────────────────────────

const FRICTION_STYLE: Record<FrictionType, string> = {
  blocking:    'border-red-700    bg-red-950/30    text-red-300',
  structural:  'border-orange-700 bg-orange-950/30 text-orange-300',
  exploratory: 'border-blue-700   bg-blue-950/30   text-blue-300',
  deferred:    'border-zinc-700   bg-zinc-900/30   text-zinc-400',
  resolved:    'border-green-700  bg-green-950/30  text-green-300',
};

const AGENT_STYLE: Record<AgentRole, { border: string; bg: string; label: string; dot: string }> = {
  proposer:   { border: 'border-violet-700', bg: 'bg-violet-950/20', label: 'Proposer',   dot: 'bg-violet-500' },
  challenger: { border: 'border-rose-700',   bg: 'bg-rose-950/20',   label: 'Challenger', dot: 'bg-rose-500'   },
  explorer:   { border: 'border-cyan-700',   bg: 'bg-cyan-950/20',   label: 'Explorer',   dot: 'bg-cyan-500'   },
};

const AGENT_TEXT: Record<AgentRole, string> = {
  proposer:   'text-violet-300',
  challenger: 'text-rose-300',
  explorer:   'text-cyan-300',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const [prompt, setPrompt]       = useState('');
  const [apiKey, setApiKey]       = useState('');
  const [model, setModel]         = useState('claude-sonnet-4-6');
  const [provider, setProvider]   = useState<'anthropic' | 'openai'>('anthropic');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [cycle, setCycle]         = useState<DebateCycle | null>(null);
  const [history, setHistory]     = useState<DebateCycle[]>([]);
  const [configOpen, setConfigOpen] = useState(true);

  const run = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    const providerConfig = { provider, apiKey, model };
    const config: DebateConfig = {
      proposerProvider:   providerConfig,
      challengerProvider: providerConfig,
      explorerProvider:   providerConfig,
      graphProvider:      providerConfig,
    };

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, config }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setCycle(json.data);
      setHistory(prev => [json.data, ...prev].slice(0, 10));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [prompt, apiKey, model, provider]);

  const exportCycle = useCallback(() => {
    if (!cycle) return;
    const blob = new Blob([JSON.stringify(cycle, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${cycle.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [cycle]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: 'ui-monospace, monospace' }}>

      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold tracking-tight">
            <span className="text-violet-400">RLM</span>
            <span className="text-zinc-400"> Lite</span>
            <span className="ml-2 text-xs font-normal text-zinc-600">v0.1.0</span>
          </h1>
          <p className="text-xs text-zinc-600 mt-0.5">reasoning observability · claim-level instrumentation</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <a href="https://zenodo.org/doi/10.5281/zenodo.20799847"
             target="_blank" rel="noreferrer"
             className="hover:text-zinc-300 transition-colors">URRP Paper (I₂)</a>
          <span className="text-zinc-700">·</span>
          <a href="https://zenodo.org/doi/10.5281/zenodo.20822051"
             target="_blank" rel="noreferrer"
             className="hover:text-zinc-300 transition-colors">CSA Paper</a>
        </div>
      </header>

      <div className="flex h-[calc(100vh-49px)]">

        {/* Sidebar */}
        <aside className="w-72 border-r border-zinc-800 flex flex-col overflow-y-auto">

          {/* Config panel */}
          <div className="border-b border-zinc-800">
            <button
              onClick={() => setConfigOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest hover:text-zinc-200 transition-colors"
            >
              Configuration
              <span className="text-zinc-600 text-[10px]">{configOpen ? '▲' : '▼'}</span>
            </button>
            {configOpen && (
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Provider</label>
                  <select
                    value={provider}
                    onChange={e => setProvider(e.target.value as 'anthropic' | 'openai')}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
                  >
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="openai">OpenAI</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500 placeholder:text-zinc-700"
                  />
                  <p className="text-[10px] text-zinc-700 mt-1">Stays local. Sent only to your Next.js server.</p>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Model</label>
                  <input
                    type="text"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pipeline diagram */}
          <div className="border-b border-zinc-800 px-4 py-3">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">Pipeline</p>
            <div className="space-y-1 text-xs">
              {[
                { color: 'bg-zinc-500',   label: 'Input prompt',       sub: null },
                { color: 'bg-violet-500', label: 'Proposer',           sub: 'assert' },
                { color: 'bg-rose-500',   label: 'Challenger',         sub: 'challenge' },
                { color: 'bg-cyan-500',   label: 'Explorer',           sub: 'explore' },
                { color: 'bg-zinc-500',   label: 'Friction detection', sub: null },
                { color: 'bg-amber-500',  label: 'Synthesis',          sub: null },
                { color: 'bg-zinc-600',   label: 'JSON export',        sub: null },
              ].map((step, i, arr) => (
                <div key={step.label}>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${step.color}`} />
                    <span className="text-zinc-400">{step.label}</span>
                    {step.sub && <span className="text-zinc-600 text-[10px]">({step.sub})</span>}
                  </div>
                  {i < arr.length - 1 && (
                    <div className="ml-[2px] pl-[5px] border-l border-zinc-800 h-1" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="px-4 py-3 flex-1">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">History</p>
              <div className="space-y-1">
                {history.map((h, i) => (
                  <button
                    key={h.id}
                    onClick={() => setCycle(h)}
                    className={`w-full text-left text-[11px] px-2 py-1.5 rounded transition-colors ${
                      cycle?.id === h.id
                        ? 'bg-violet-900/30 text-violet-300 border border-violet-800'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    <span className="text-zinc-700">{i + 1}. </span>
                    {h.prompt.slice(0, 40)}{h.prompt.length > 40 ? '…' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Input */}
          <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Enter a claim, question, or hypothesis to analyze…"
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500 placeholder:text-zinc-600 resize-none h-24 leading-relaxed"
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run(); }}
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-zinc-600">⌘ + Enter to run</p>
              <button
                onClick={run}
                disabled={loading || !prompt.trim()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold rounded transition-colors"
              >
                {loading ? 'Running…' : 'Run Cycle'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="border border-red-800 bg-red-950/30 rounded-lg p-3 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Loading shimmer */}
          {loading && (
            <div className="border border-zinc-800 border-dashed rounded-lg p-10 text-center">
              <p className="text-zinc-500 text-sm animate-pulse">Running debate cycle…</p>
              <p className="text-xs text-zinc-600 mt-1">Proposer · Challenger · Explorer running in parallel</p>
            </div>
          )}

          {/* Results */}
          {cycle && !loading && (
            <div className="space-y-4">

              {/* Metrics */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Claims',          value: cycle.metrics.claimCount,                      color: 'text-zinc-100' },
                  { label: 'Frictions',       value: cycle.metrics.frictionCount,                   color: 'text-orange-400' },
                  { label: 'Contradiction ρ', value: cycle.metrics.contradictionDensity.toFixed(2), color: cycle.metrics.contradictionDensity > 0.5 ? 'text-red-400' : 'text-yellow-400' },
                  { label: 'Agreement',       value: cycle.metrics.agreementRate.toFixed(2),        color: cycle.metrics.agreementRate > 0.5 ? 'text-green-400' : 'text-zinc-400' },
                  { label: 'Stability',       value: cycle.metrics.attractorStability.toFixed(2),   color: cycle.metrics.attractorStability > 0.6 ? 'text-green-400' : 'text-orange-400' },
                ].map(m => (
                  <div key={m.label} className="border border-zinc-800 rounded-lg p-3">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{m.label}</p>
                    <p className={`text-2xl font-bold tabular-nums ${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Claims by agent */}
              <div className="grid grid-cols-3 gap-3">
                {(['proposer', 'challenger', 'explorer'] as AgentRole[]).map(role => {
                  const agentClaims = cycle.claims.filter(c => c.agent === role);
                  const style = AGENT_STYLE[role];
                  return (
                    <div key={role} className={`border ${style.border} ${style.bg} rounded-lg p-3`}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        <p className={`text-[10px] font-semibold uppercase tracking-widest ${AGENT_TEXT[role]}`}>
                          {style.label}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {agentClaims.map(claim => (
                          <p key={claim.id} className="text-[11px] text-zinc-300 leading-relaxed border-l border-zinc-700 pl-2">
                            {claim.text}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Friction table */}
              {cycle.frictions.length > 0 ? (
                <div className="border border-zinc-800 rounded-lg p-4">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                    Friction Map — {cycle.frictions.length} detected
                  </p>
                  <div className="space-y-2">
                    {cycle.frictions.map(f => (
                      <div key={f.id} className={`border rounded-lg p-3 ${FRICTION_STYLE[f.frictionType]}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest">
                            {f.frictionType}
                          </span>
                          <span className="text-zinc-600">·</span>
                          <span className="text-[11px] text-zinc-400">{f.reason}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <p className="text-[11px] bg-black/20 rounded p-1.5 text-zinc-400">
                            <span className="text-zinc-600 text-[9px] uppercase">A </span>{f.claim1Text}
                          </p>
                          <p className="text-[11px] bg-black/20 rounded p-1.5 text-zinc-400">
                            <span className="text-zinc-600 text-[9px] uppercase">B </span>{f.claim2Text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border border-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-xs text-zinc-600">No friction detected in this cycle.</p>
                </div>
              )}

              {/* Synthesis */}
              <div className="border border-amber-800/40 bg-amber-950/10 rounded-lg p-4">
                <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest mb-2">Synthesis</p>
                <p className="text-sm text-zinc-200 leading-relaxed">{cycle.synthesis}</p>
              </div>

              {/* Footer: ID + export */}
              <div className="flex items-center justify-between border border-zinc-800 rounded-lg px-4 py-2.5">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-zinc-600">
                    id: <span className="text-zinc-400">{cycle.id}</span>
                  </p>
                  <p className="text-[10px] text-zinc-700">
                    {new Date(cycle.timestamp).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={exportCycle}
                  className="text-xs px-3 py-1.5 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 rounded transition-colors"
                >
                  Export JSON
                </button>
              </div>

            </div>
          )}

          {/* Empty state */}
          {!cycle && !loading && !error && (
            <div className="border border-zinc-800 border-dashed rounded-lg p-16 text-center space-y-2">
              <p className="text-zinc-500 text-sm">No cycle run yet.</p>
              <p className="text-zinc-700 text-xs">
                Configure a provider above, enter a prompt, and run a cycle.
              </p>
              <div className="mt-6 text-[11px] text-zinc-700 space-y-1">
                <p>Try: "Large language models are not capable of genuine reasoning"</p>
                <p>Try: "Attention mechanisms are sufficient for world models"</p>
                <p>Try: "Alignment and capability are fundamentally in tension"</p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
