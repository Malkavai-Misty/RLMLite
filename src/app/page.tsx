'use client';

import { useState, useCallback, useEffect } from 'react';
import type { DebateCycle, DebateConfig, FrictionType, AgentRole, ProviderId, ProviderConfig } from '@/lib/types';

// ── Provider registry ───────────────────────────────────────────────────────────

type ProviderMeta = {
  id: ProviderId;
  label: string;
  dot: string;
  placeholder: string | null;
  defaultModel: string;
  noKey: boolean;
};

const PROVIDER_LIST: ProviderMeta[] = [
  { id: 'anthropic',  label: 'Anthropic',  dot: 'bg-orange-500', placeholder: 'sk-ant-...',   defaultModel: 'claude-sonnet-4-6',           noKey: false },
  { id: 'openai',     label: 'OpenAI',     dot: 'bg-green-500',  placeholder: 'sk-...',        defaultModel: 'gpt-4o',                      noKey: false },
  { id: 'google',     label: 'Google',     dot: 'bg-blue-500',   placeholder: 'AIza...',       defaultModel: 'gemini-2.0-flash',            noKey: false },
  { id: 'openrouter', label: 'OpenRouter', dot: 'bg-purple-500', placeholder: 'sk-or-v1-...', defaultModel: 'anthropic/claude-sonnet-4-5', noKey: false },
  { id: 'deepseek',   label: 'DeepSeek',   dot: 'bg-sky-500',    placeholder: 'sk-...',        defaultModel: 'deepseek-chat',               noKey: false },
  { id: 'groq',       label: 'Groq',       dot: 'bg-red-500',    placeholder: 'gsk_...',       defaultModel: 'llama-3.3-70b-versatile',     noKey: false },
  { id: 'mistral',    label: 'Mistral',    dot: 'bg-amber-500',  placeholder: 'sk-...',        defaultModel: 'mistral-large-latest',        noKey: false },
  { id: 'ollama',     label: 'Ollama',     dot: 'bg-zinc-400',   placeholder: null,            defaultModel: 'llama3.2',                    noKey: true  },
];

// ── Styling maps ──────────────────────────────────────────────────────────────

const FRICTION_STYLE: Record<FrictionType, string> = {
  contradiction: 'border-red-700    bg-red-950/30    text-red-300',
  tension:       'border-orange-700 bg-orange-950/30 text-orange-300',
  refinement:    'border-blue-700   bg-blue-950/30   text-blue-300',
  convergence:   'border-green-700  bg-green-950/30  text-green-300',
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

// ── WebMCP status type ────────────────────────────────────────────────────────

type WebMcpStatus = {
  supported:      boolean;
  registered:     'pending' | 'registered' | 'failed' | 'unavailable';
  apiLocation:    string;
  lastInvocation: string;
  raw:            Record<string, string>;
};

// ── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const [prompt, setPrompt]             = useState('');
  const [apiKeys, setApiKeys]           = useState<Record<string, string>>({});
  const [model, setModel]               = useState('claude-sonnet-4-6');
  const [provider, setProvider]         = useState<ProviderId>('anthropic');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [cycle, setCycle]               = useState<DebateCycle | null>(null);
  const [history, setHistory]           = useState<DebateCycle[]>([]);
  const [configOpen, setConfigOpen]     = useState(true);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [webmcpOpen, setWebmcpOpen]     = useState(false);
  const [webmcpStatus, setWebmcpStatus] = useState<WebMcpStatus | null>(null);

  // Load persisted config
  useEffect(() => {
    const keys: Record<string, string> = {};
    PROVIDER_LIST.forEach(p => {
      const saved = localStorage.getItem(`rlm_api_key_${p.id}`);
      if (saved) keys[p.id] = saved;
    });
    setApiKeys(keys);
    const sp = localStorage.getItem('rlm_provider') as ProviderId | null;
    const sm = localStorage.getItem('rlm_model');
    if (sp && PROVIDER_LIST.some(p => p.id === sp)) setProvider(sp);
    if (sm) setModel(sm);
  }, []);

  useEffect(() => { localStorage.setItem('rlm_provider', provider); }, [provider]);
  useEffect(() => { localStorage.setItem('rlm_model',    model);    }, [model]);

  // Probe WebMCP APIs
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    const n = navigator as unknown as Record<string, unknown>;

    const windowMcpKeys = Object.keys(w)
      .filter(k => k.toLowerCase().includes('mcp') || k.startsWith('__webmcp'))
      .join(', ') || '(none)';
    const navigatorMcpKeys = Object.keys(n)
      .filter(k => k.toLowerCase().includes('mcp'))
      .join(', ') || '(none)';

    const hasWindowAi      = typeof w.ai      !== 'undefined';
    const hasWindowWebMcp  = typeof w.WebMCP  !== 'undefined';
    const hasWindowMcp     = typeof w.mcp     !== 'undefined';
    const hasNavigatorMcp  = typeof n.mcp     !== 'undefined';
    const supported = hasWindowAi || hasWindowWebMcp || hasWindowMcp || hasNavigatorMcp;

    let apiLocation = 'not found';
    if (hasWindowAi)     apiLocation = 'window.ai';
    else if (hasWindowWebMcp) apiLocation = 'window.WebMCP';
    else if (hasWindowMcp)    apiLocation = 'window.mcp';
    else if (hasNavigatorMcp) apiLocation = 'navigator.mcp';

    const status: WebMcpStatus = {
      supported,
      registered:     supported ? 'pending' : 'unavailable',
      apiLocation,
      lastInvocation: 'none',
      raw: {
        'typeof window.ai':      String(typeof w.ai),
        'typeof window.WebMCP':  String(typeof w.WebMCP),
        'typeof window.mcp':     String(typeof w.mcp),
        'typeof navigator.mcp':  String(typeof n.mcp),
        'window mcp keys':       windowMcpKeys,
        'navigator mcp keys':    navigatorMcpKeys,
      },
    };
    setWebmcpStatus(status);

    // Attempt registration if API is present
    if (hasNavigatorMcp) {
      const mcpApi = n.mcp as Record<string, unknown>;
      const registerFn = (mcpApi.register ?? mcpApi.setClientId) as
        ((opts: unknown) => Promise<void>) | undefined;
      if (typeof registerFn === 'function') {
        registerFn({ name: 'rlm_reason', url: `${window.location.origin}/api/mcp` })
          .then(() => setWebmcpStatus(s => s ? { ...s, registered: 'registered' } : s))
          .catch(() => setWebmcpStatus(s => s ? { ...s, registered: 'failed' } : s));
      }
    }
  }, []);

  const handleKeyChange = useCallback((providerId: string, val: string) => {
    setApiKeys(prev => ({ ...prev, [providerId]: val }));
    if (val) localStorage.setItem(`rlm_api_key_${providerId}`, val);
    else     localStorage.removeItem(`rlm_api_key_${providerId}`);
  }, []);

  const handleProviderChange = useCallback((newProvider: ProviderId) => {
    const meta = PROVIDER_LIST.find(p => p.id === newProvider);
    setProvider(newProvider);
    if (meta) setModel(meta.defaultModel);
  }, []);

  const activeMeta    = PROVIDER_LIST.find(p => p.id === provider);
  const hasCurrentKey = activeMeta?.noKey || !!apiKeys[provider];

  const run = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    const apiKey = activeMeta?.noKey ? '' : (apiKeys[provider] || '');
    const providerConfig: ProviderConfig = { provider, apiKey, model };
    const config: DebateConfig = {
      proposerProvider:   providerConfig,
      challengerProvider: providerConfig,
      explorerProvider:   providerConfig,
      graphProvider:      providerConfig,
    };
    try {
      const res  = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, config }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setCycle(json.data);
      setHistory(prev => [json.data, ...prev].slice(0, 10));
      // update last invocation in webmcp debug
      setWebmcpStatus(s => s ? { ...s, lastInvocation: new Date().toLocaleTimeString() } : s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [prompt, apiKeys, model, provider, activeMeta]);

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

      {/* API Key Modal */}
      {keyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={e => { if (e.target === e.currentTarget) setKeyModalOpen(false); }}
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md mx-4 p-6 space-y-1 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-sm font-bold text-zinc-100 tracking-tight">API Keys</h2>
              <button onClick={() => setKeyModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 text-xl leading-none transition-colors">&times;</button>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed pb-3 border-b border-zinc-800">
              Keys are stored in your browser only. They are sent to this app&apos;s API endpoint solely
              to forward your requests to providers — never logged or retained server-side.
            </p>
            <div className="space-y-3 pt-2">
              {PROVIDER_LIST.map(p => (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.dot}`} />
                    <span className="text-xs font-semibold text-zinc-300">{p.label}</span>
                    {!p.noKey && apiKeys[p.id] && (
                      <span className="ml-auto text-[10px] text-green-500">&#x2713; configured</span>
                    )}
                  </div>
                  {p.noKey ? (
                    <p className="text-[10px] text-zinc-600 pl-4">Local — no key needed</p>
                  ) : (
                    <input type="password" value={apiKeys[p.id] || ''}
                      onChange={e => handleKeyChange(p.id, e.target.value)}
                      placeholder={p.placeholder ?? ''}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500 placeholder:text-zinc-600" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-700 pt-3 border-t border-zinc-800 mt-3">
              Your own keys use your credits directly. Keys entered here override any host-configured keys.
            </p>
          </div>
        </div>
      )}

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
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <a href="https://zenodo.org/doi/10.5281/zenodo.20799847" target="_blank" rel="noreferrer"
             className="hover:text-zinc-300 transition-colors">URRP Paper (I₂)</a>
          <span className="text-zinc-700">·</span>
          <a href="https://zenodo.org/doi/10.5281/zenodo.20822051" target="_blank" rel="noreferrer"
             className="hover:text-zinc-300 transition-colors">CSA Paper</a>
          <span className="text-zinc-700">·</span>
          <button onClick={() => setKeyModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border transition-colors ${
              hasCurrentKey
                ? 'border-violet-800 bg-violet-950/30 text-violet-400 hover:bg-violet-900/40'
                : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
            }`} title="Configure API keys">
            <span>&#x1F511;</span>
            <span className="text-[10px]">{hasCurrentKey ? 'key set' : 'add key'}</span>
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-49px)]">

        {/* Sidebar */}
        <aside className="w-72 border-r border-zinc-800 flex flex-col overflow-y-auto">

          {/* Config */}
          <div className="border-b border-zinc-800">
            <button onClick={() => setConfigOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest hover:text-zinc-200 transition-colors">
              Configuration
              <span className="text-zinc-600 text-[10px]">{configOpen ? '▲' : '▼'}</span>
            </button>
            {configOpen && (
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Provider</label>
                  <select value={provider} onChange={e => handleProviderChange(e.target.value as ProviderId)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500">
                    {PROVIDER_LIST.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Model</label>
                  <input type="text" value={model} onChange={e => setModel(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500" />
                </div>
                {!hasCurrentKey && (
                  <button onClick={() => setKeyModalOpen(true)}
                    className="w-full text-[10px] text-zinc-500 hover:text-violet-400 border border-zinc-800 hover:border-violet-800 rounded py-1.5 transition-colors">
                    Set API key →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pipeline */}
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
                  {i < arr.length - 1 && <div className="ml-[2px] pl-[5px] border-l border-zinc-800 h-1" />}
                </div>
              ))}
            </div>
          </div>

          {/* Relationship legend */}
          <div className="border-b border-zinc-800 px-4 py-3">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Relationship Types</p>
            <div className="space-y-1.5">
              {[
                { type: 'contradiction', color: 'bg-red-500',    desc: 'logical impossibility' },
                { type: 'tension',       color: 'bg-orange-500', desc: 'competing emphasis'     },
                { type: 'refinement',    color: 'bg-blue-500',   desc: 'qualifies or constrains' },
                { type: 'convergence',   color: 'bg-green-500',  desc: 'agreement or support'   },
              ].map(r => (
                <div key={r.type} className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.color}`} />
                  <span className="text-[10px] text-zinc-400">{r.type}</span>
                  <span className="text-[10px] text-zinc-700">{r.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* WebMCP Debug */}
          <div className="border-b border-zinc-800">
            <button onClick={() => setWebmcpOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest hover:text-zinc-400 transition-colors">
              WebMCP Debug
              <span className="text-[8px]">{webmcpOpen ? '▲' : '▼'}</span>
            </button>
            {webmcpOpen && webmcpStatus && (
              <div className="px-4 pb-4 space-y-1.5">
                {[
                  {
                    label: 'WebMCP supported',
                    value: webmcpStatus.supported ? 'yes' : 'no',
                    dot:   webmcpStatus.supported ? 'bg-green-500' : 'bg-red-500',
                    color: webmcpStatus.supported ? 'text-green-500' : 'text-red-500',
                  },
                  {
                    label: 'Tool registered',
                    value: webmcpStatus.registered,
                    dot:   webmcpStatus.registered === 'registered' ? 'bg-green-500'
                         : webmcpStatus.registered === 'pending'    ? 'bg-yellow-500'
                         : webmcpStatus.registered === 'failed'     ? 'bg-red-500'
                         :                                            'bg-zinc-600',
                    color: webmcpStatus.registered === 'registered' ? 'text-green-500'
                         : webmcpStatus.registered === 'pending'    ? 'text-yellow-500'
                         : webmcpStatus.registered === 'failed'     ? 'text-red-500'
                         :                                            'text-zinc-600',
                  },
                  {
                    label: 'Tool name',
                    value: 'rlm_reason',
                    dot:   'bg-green-500',
                    color: 'text-zinc-400',
                  },
                  {
                    label: 'API location',
                    value: webmcpStatus.apiLocation,
                    dot:   webmcpStatus.apiLocation !== 'not found' ? 'bg-green-500' : 'bg-zinc-600',
                    color: webmcpStatus.apiLocation !== 'not found' ? 'text-zinc-300' : 'text-zinc-600',
                  },
                  {
                    label: 'Last invocation',
                    value: webmcpStatus.lastInvocation,
                    dot:   'bg-zinc-600',
                    color: 'text-zinc-600',
                  },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${row.dot}`} />
                      <span className="text-[10px] text-zinc-500">{row.label}</span>
                    </div>
                    <span className={`text-[10px] ${row.color}`}>{row.value}</span>
                  </div>
                ))}

                <div className="mt-2 pt-2 border-t border-zinc-800 space-y-1">
                  <p className="text-[9px] text-zinc-700 uppercase tracking-widest mb-1">Raw Diagnostics</p>
                  {Object.entries(webmcpStatus.raw).map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-2">
                      <span className="text-[9px] text-zinc-700 flex-shrink-0">{k}</span>
                      <span className="text-[9px] text-zinc-500 text-right break-all">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="px-4 py-3 flex-1">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">History</p>
              <div className="space-y-1">
                {history.map((h, i) => (
                  <button key={h.id} onClick={() => setCycle(h)}
                    className={`w-full text-left text-[11px] px-2 py-1.5 rounded transition-colors ${
                      cycle?.id === h.id
                        ? 'bg-violet-900/30 text-violet-300 border border-violet-800'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                    }`}>
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

          <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
              placeholder="Enter a claim, question, or hypothesis to analyze…"
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500 placeholder:text-zinc-600 resize-none h-24 leading-relaxed"
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run(); }} />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-zinc-600">&#x2318; + Enter to run</p>
              <button onClick={run} disabled={loading || !prompt.trim()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold rounded transition-colors">
                {loading ? 'Running…' : 'Run Cycle'}
              </button>
            </div>
          </div>

          {error && (
            <div className="border border-red-800 bg-red-950/30 rounded-lg p-3 text-xs text-red-400">{error}</div>
          )}

          {loading && (
            <div className="border border-zinc-800 border-dashed rounded-lg p-10 text-center">
              <p className="text-zinc-500 text-sm animate-pulse">Running debate cycle…</p>
              <p className="text-xs text-zinc-600 mt-1">Proposer · Challenger · Explorer running in parallel</p>
            </div>
          )}

          {cycle && !loading && (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Claims',          value: cycle.metrics.claimCount,                      color: 'text-zinc-100' },
                  { label: 'Relationships',   value: cycle.metrics.frictionCount,                   color: 'text-orange-400' },
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

              <div className="grid grid-cols-3 gap-3">
                {(['proposer', 'challenger', 'explorer'] as AgentRole[]).map(role => {
                  const agentClaims = cycle.claims.filter(c => c.agent === role);
                  const style = AGENT_STYLE[role];
                  return (
                    <div key={role} className={`border ${style.border} ${style.bg} rounded-lg p-3`}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        <p className={`text-[10px] font-semibold uppercase tracking-widest ${AGENT_TEXT[role]}`}>{style.label}</p>
                      </div>
                      <div className="space-y-2">
                        {agentClaims.map(claim => (
                          <p key={claim.id} className="text-[11px] text-zinc-300 leading-relaxed border-l border-zinc-700 pl-2">{claim.text}</p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {cycle.frictions.length > 0 ? (
                <div className="border border-zinc-800 rounded-lg p-4">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                    Relationship Map — {cycle.frictions.length} detected
                  </p>
                  <div className="space-y-2">
                    {cycle.frictions.map(f => (
                      <div key={f.id} className={`border rounded-lg p-3 ${FRICTION_STYLE[f.frictionType]}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest">{f.frictionType}</span>
                          <span className="text-zinc-600">·</span>
                          <span className="text-[11px] text-zinc-400">{f.reason}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <p className="text-[11px] bg-black/20 rounded p-1.5 text-zinc-400"><span className="text-zinc-600 text-[9px] uppercase">A </span>{f.claim1Text}</p>
                          <p className="text-[11px] bg-black/20 rounded p-1.5 text-zinc-400"><span className="text-zinc-600 text-[9px] uppercase">B </span>{f.claim2Text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border border-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-xs text-zinc-600">No relationships detected in this cycle.</p>
                </div>
              )}

              <div className="border border-amber-800/40 bg-amber-950/10 rounded-lg p-4">
                <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest mb-2">Synthesis</p>
                <p className="text-sm text-zinc-200 leading-relaxed">{cycle.synthesis}</p>
              </div>

              <div className="flex items-center justify-between border border-zinc-800 rounded-lg px-4 py-2.5">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-zinc-600">id: <span className="text-zinc-400">{cycle.id}</span></p>
                  <p className="text-[10px] text-zinc-700">{new Date(cycle.timestamp).toLocaleString()}</p>
                </div>
                <button onClick={exportCycle}
                  className="text-xs px-3 py-1.5 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 rounded transition-colors">
                  Export JSON
                </button>
              </div>
            </div>
          )}

          {!cycle && !loading && !error && (
            <div className="border border-zinc-800 border-dashed rounded-lg p-16 text-center space-y-2">
              <p className="text-zinc-500 text-sm">No cycle run yet.</p>
              <p className="text-zinc-700 text-xs">Configure a provider above, enter a prompt, and run a cycle.</p>
              <div className="mt-6 text-[11px] text-zinc-700 space-y-1">
                <p>Try: &ldquo;Large language models are not capable of genuine reasoning&rdquo;</p>
                <p>Try: &ldquo;Attention mechanisms are sufficient for world models&rdquo;</p>
                <p>Try: &ldquo;Alignment and capability are fundamentally in tension&rdquo;</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
