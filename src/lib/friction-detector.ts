import { callModel } from './providers';
import type { Claim, Friction, FrictionType, ProviderConfig } from './types';

const SYSTEM_PROMPT = `You are a Reasoning Relationship Detector. Your task is to surface meaningful relationships between claims in a multi-agent reasoning system — including subtle tensions and nuances that fall short of outright contradiction.

Classify every meaningful claim pair using one of four types:
- contradiction: direct logical impossibility — both claims cannot simultaneously be true. Rare.
- tension: meaningful opposition or competing emphasis that is not a full contradiction. The most common and valuable signal. When two claims pull in different directions, frame things differently, or imply conflicting priorities — that is tension.
- refinement: one claim qualifies, constrains, or adds nuance to another without contradicting it. Signals that the reasoning space is being sharpened.
- convergence: two claims that agree, reinforce each other, or arrive at the same conclusion from different angles. Signals attractor formation.

Rules:
- Lower your threshold — tension, refinement, and convergence are all valuable telemetry even when they are not dramatic
- "governance absence increases risk" vs "governance presence can also increase risk if misspecified" is tension, not nothing
- "contradiction" is rare — only for hard logical impossibilities
- Return [] only if a pair of claims is completely unrelated
- Do not skip subtle relationships — latent tension is exactly what this system exists to detect

Return ONLY a valid JSON array. No markdown, no explanation outside the array.
Format: [{"claim1Index": 0, "claim2Index": 1, "frictionType": "tension", "reason": "one sentence"}]`;

function randomId(): string {
  return Math.random().toString(36).slice(2, 9);
}

const VALID_TYPES: FrictionType[] = [
  'contradiction', 'tension', 'refinement', 'convergence',
];

export async function detectFrictions(
  claims: Claim[],
  config: ProviderConfig,
): Promise<Friction[]> {
  if (claims.length < 2) return [];

  const claimList = claims
    .map((c, i) => `[${i}] (${c.agent}): ${c.text}`)
    .join('\n');

  const userPrompt = `Analyze these claims for meaningful relationships:\n\n${claimList}\n\nReturn a JSON array of relationship objects. Include tensions and refinements — not just hard contradictions.`;

  let raw = '';
  try {
    raw = await callModel(config, SYSTEM_PROMPT, userPrompt);
  } catch {
    return [];
  }

  let parsed: Array<{
    claim1Index: number;
    claim2Index: number;
    frictionType: string;
    reason: string;
  }> = [];

  try {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) parsed = JSON.parse(match[0]);
  } catch {
    return [];
  }

  return parsed
    .filter(f => {
      const c1 = claims[f.claim1Index];
      const c2 = claims[f.claim2Index];
      return (
        c1 &&
        c2 &&
        f.claim1Index !== f.claim2Index &&
        VALID_TYPES.includes(f.frictionType as FrictionType)
      );
    })
    .map(f => ({
      id: randomId(),
      claim1Id: claims[f.claim1Index].id,
      claim2Id: claims[f.claim2Index].id,
      claim1Text: claims[f.claim1Index].text,
      claim2Text: claims[f.claim2Index].text,
      frictionType: f.frictionType as FrictionType,
      reason: f.reason ?? '',
    }));
}
