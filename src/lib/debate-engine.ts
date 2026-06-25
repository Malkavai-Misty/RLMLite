import { extractClaims } from './claim-extractor';
import { detectFrictions } from './friction-detector';
import { callModel } from './providers';
import type { Claim, Friction, CycleMetrics, DebateCycle, DebateConfig } from './types';

function generateCycleId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `cycle-${ts}-${rand}`;
}

function computeMetrics(claims: Claim[], frictions: Friction[]): CycleMetrics {
  const totalRelations = claims.reduce((s, c) => s + c.relations.length, 0);
  const supportingRelations = claims.reduce(
    (s, c) => s + c.relations.filter(r => r.type === 'supports').length,
    0,
  );

  const contradictionDensity =
    claims.length > 0 ? frictions.length / claims.length : 0;
  const agreementRate =
    totalRelations > 0 ? supportingRelations / totalRelations : 0;
  const contradictionCount = frictions.filter(f => f.frictionType === 'contradiction').length;
  const attractorStability = Math.max(
    0,
    1 - contradictionCount * 0.25 - contradictionDensity * 0.25,
  );

  return {
    contradictionDensity: Math.round(contradictionDensity * 100) / 100,
    agreementRate: Math.round(agreementRate * 100) / 100,
    attractorStability: Math.round(Math.min(1, attractorStability) * 100) / 100,
    claimCount: claims.length,
    frictionCount: frictions.length,
  };
}

const SYNTHESIS_PROMPT = `You are a Synthesis agent. You have observed a structured three-agent debate. Your task is to produce a single synthesizing statement that:

1. Acknowledges the central tension identified by the Challenger
2. Integrates the most defensible positions across all three agents
3. Is honest about what remains unresolved
4. Is concise: one to three sentences

Return ONLY the synthesis as plain text. No preamble, no labels, no explanation.`;

async function synthesize(
  prompt: string,
  agentOutputs: { proposer: string; challenger: string; explorer: string },
  config: DebateConfig,
): Promise<string> {
  const userPrompt = `Original question: ${prompt}

Proposer claims:
${agentOutputs.proposer}

Challenger claims:
${agentOutputs.challenger}

Explorer claims:
${agentOutputs.explorer}

Produce a synthesis.`;

  try {
    return await callModel(config.graphProvider, SYNTHESIS_PROMPT, userPrompt);
  } catch {
    return 'Synthesis unavailable — check provider configuration.';
  }
}

export async function runDebateCycle(
  prompt: string,
  config: DebateConfig,
): Promise<DebateCycle> {
  const { claims, agentOutputs } = await extractClaims(
    prompt,
    config.proposerProvider,
    config.challengerProvider,
    config.explorerProvider,
  );

  const [frictions, synthesis] = await Promise.all([
    detectFrictions(claims, config.graphProvider),
    synthesize(prompt, agentOutputs, config),
  ]);

  return {
    id: generateCycleId(),
    prompt,
    claims,
    frictions,
    synthesis,
    metrics: computeMetrics(claims, frictions),
    timestamp: new Date().toISOString(),
    agentOutputs,
  };
}
