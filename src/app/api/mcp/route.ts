import { NextRequest, NextResponse } from 'next/server';
import { runDebateCycle } from '@/lib/debate-engine';
import { extractClaims } from '@/lib/claim-extractor';
import { detectFrictions } from '@/lib/friction-detector';
import type { ProviderConfig, ProviderId } from '@/lib/types';

export const maxDuration = 90;

const TOOLS = [
  {
    name: 'run_reasoning_cycle',
    description:
      'Run a Resonance Logic Model (RLM) reasoning cycle on a claim or question. ' +
      'Three agents — Proposer (assert), Challenger (oppose), Explorer (synthesize) — ' +
      'generate atomic claims in parallel. A friction detector then classifies ' +
      'relationships between claims as contradiction, tension, refinement, or convergence. ' +
      'Returns structured reasoning geometry + synthesis + stability score.',
    inputSchema: {
      type: 'object',
      properties: {
        claim:    { type: 'string',  description: 'The claim, question, or hypothesis to analyze.' },
        provider: { type: 'string',  description: 'AI provider: anthropic | openai | google | openrouter | deepseek | groq | mistral | ollama. Default: anthropic.' },
        model:    { type: 'string',  description: 'Model name. Defaults to claude-sonnet-4-6 for Anthropic, gpt-4o for OpenAI.' },
        apiKey:   { type: 'string',  description: 'API key for the provider. Optional if the server has one configured.' },
        mode:     { type: 'string',  description: 'Reasoning mode: standard (default). strict and governance coming soon.' },
      },
      required: ['claim'],
    },
  },
  {
    name: 'extract_claims',
    description:
      'Extract atomic claims from a prompt using the three-agent system ' +
      '(Proposer, Challenger, Explorer) without running relationship detection. ' +
      'Useful when you want to inspect the raw claim layer before analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        claim:    { type: 'string' },
        provider: { type: 'string' },
        model:    { type: 'string' },
        apiKey:   { type: 'string' },
      },
      required: ['claim'],
    },
  },
  {
    name: 'detect_relationships',
    description:
      'Detect relationships between a provided set of claims without running ' +
      'the full agent pipeline. Classify pairs as contradiction, tension, ' +
      'refinement, or convergence. Pass claims as an array of {text, agent} objects.',
    inputSchema: {
      type: 'object',
      properties: {
        claims: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text:  { type: 'string' },
              agent: { type: 'string', enum: ['proposer', 'challenger', 'explorer'] },
            },
            required: ['text', 'agent'],
          },
        },
        provider: { type: 'string' },
        model:    { type: 'string' },
        apiKey:   { type: 'string' },
      },
      required: ['claims'],
    },
  },
];

function makeProviderConfig(args: Record<string, unknown>): ProviderConfig {
  const provider = (args.provider as ProviderId | undefined) ?? 'anthropic';
  const defaultModel = provider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-6';
  return {
    provider,
    model:  (args.model  as string | undefined) ?? defaultModel,
    apiKey: (args.apiKey as string | undefined) ?? '',
  };
}

async function callTool(name: string, args: Record<string, unknown>) {
  const cfg = makeProviderConfig(args);
  const debateConfig = {
    proposerProvider:   cfg,
    challengerProvider: cfg,
    explorerProvider:   cfg,
    graphProvider:      cfg,
  };

  if (name === 'run_reasoning_cycle') {
    const result = await runDebateCycle(args.claim as string, debateConfig);
    return {
      proposer:        result.claims.filter(c => c.agent === 'proposer').map(c => c.text),
      challenger:      result.claims.filter(c => c.agent === 'challenger').map(c => c.text),
      explorer:        result.claims.filter(c => c.agent === 'explorer').map(c => c.text),
      relationships:   result.frictions.map(f => ({
        type:   f.frictionType,
        reason: f.reason,
        claimA: f.claim1Text,
        claimB: f.claim2Text,
      })),
      synthesis:       result.synthesis,
      stability_score: result.metrics.attractorStability,
      metrics:         result.metrics,
      cycle_id:        result.id,
    };
  }

  if (name === 'extract_claims') {
    const { claims } = await extractClaims(args.claim as string, cfg, cfg, cfg);
    return {
      proposer:   claims.filter(c => c.agent === 'proposer').map(c => c.text),
      challenger: claims.filter(c => c.agent === 'challenger').map(c => c.text),
      explorer:   claims.filter(c => c.agent === 'explorer').map(c => c.text),
      total:      claims.length,
    };
  }

  if (name === 'detect_relationships') {
    const raw = args.claims as Array<{ text: string; agent: string }>;
    const claims = raw.map((c, i) => ({
      id:        `c${i}`,
      text:      c.text,
      agent:     c.agent as 'proposer' | 'challenger' | 'explorer',
      type:      'standard' as const,
      relations: [],
    }));
    const frictions = await detectFrictions(claims, cfg);
    return {
      relationships: frictions.map(f => ({
        type:   f.frictionType,
        reason: f.reason,
        claimA: f.claim1Text,
        claimB: f.claim2Text,
      })),
      count: frictions.length,
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SERVER_INFO = {
  protocolVersion: '2024-11-05',
  serverInfo: { name: 'RLMLite', version: '0.1.0' },
  capabilities: { tools: {} },
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  return NextResponse.json(
    { jsonrpc: '2.0', result: SERVER_INFO, id: null },
    { headers: CORS_HEADERS },
  );
}

export async function POST(req: NextRequest) {
  let body: { jsonrpc?: string; method?: string; params?: unknown; id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const { method, params, id } = body;

  if (method === 'initialize' || method === 'ping') {
    return NextResponse.json(
      { jsonrpc: '2.0', result: SERVER_INFO, id },
      { headers: CORS_HEADERS },
    );
  }

  if (method === 'tools/list') {
    return NextResponse.json(
      { jsonrpc: '2.0', result: { tools: TOOLS }, id },
      { headers: CORS_HEADERS },
    );
  }

  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params as { name: string; arguments?: Record<string, unknown> };
    try {
      const result = await callTool(name, args);
      return NextResponse.json({
        jsonrpc: '2.0',
        result:  { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
        id,
      }, { headers: CORS_HEADERS });
    } catch (e: unknown) {
      return NextResponse.json({
        jsonrpc: '2.0',
        error: { code: -32000, message: e instanceof Error ? e.message : 'Tool error' },
        id,
      }, { status: 500, headers: CORS_HEADERS });
    }
  }

  return NextResponse.json(
    { jsonrpc: '2.0', error: { code: -32601, message: `Method not found: ${method}` }, id },
    { status: 404, headers: CORS_HEADERS },
  );
}
