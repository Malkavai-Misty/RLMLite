import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const host     = req.headers.get('host') ?? 'rlm-lite.vercel.app';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const base     = `${protocol}://${host}`;

  return NextResponse.json({
    name:             'RLMLite',
    description:      'Resonance Logic Model — structured adversarial reasoning with claim-level instrumentation.',
    version:          '0.1.0',
    mcp_endpoint:     `${base}/api/mcp`,
    protocol_version: '2024-11-05',
    tools: [
      { name: 'run_reasoning_cycle', description: 'Run a full RLM debate cycle on a claim or question.' },
      { name: 'extract_claims',      description: 'Extract agent claims without relationship detection.' },
      { name: 'detect_relationships', description: 'Classify relationships between a set of claims.' },
    ],
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
}
