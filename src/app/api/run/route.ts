import { NextRequest, NextResponse } from 'next/server';
import { runDebateCycle } from '@/lib/debate-engine';
import type { DebateConfig } from '@/lib/types';

export const maxDuration = 90;

export async function POST(request: NextRequest) {
  let body: { prompt?: string; config?: DebateConfig };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { prompt, config } = body;

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }
  if (!config) {
    return NextResponse.json({ error: 'config is required' }, { status: 400 });
  }

  try {
    const cycle = await runDebateCycle(prompt.trim(), config);
    return NextResponse.json({ success: true, data: cycle });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal error';
    console.error('[POST /api/run]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
