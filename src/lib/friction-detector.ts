import { callModel } from './providers';
import type { Claim, Friction, FrictionType, ProviderConfig } from './types';

const SYSTEM_PROMPT = `You are a Reasoning Friction Detector. Your task is to identify contradictions, tensions, and conflicts between claims in a multi-agent reasoning system.

For each pair of claims where genuine friction exists, classify the friction:
- blocking: direct logical contradiction — both claims cannot simultaneously be true. Use sparingly.
- structural: conceptual tension revealing a framing or design-level issue
- exploratory: productive disagreement opening new investigation paths (most common)
- deferred: valid tension but not central to the current focus
- resolved: the contradiction is already addressed by context

Rules:
- Default to "exploratory" when uncertain
- "blocking" is rare — only for hard logical impossibilities
- Only return pairs where genuine friction exists
- Return [] if no friction is detected

Return ONLY a valid JSON array. No markdown, no explanation outside the array.
Format: [{"claim1Index": 0, "claim2Index": 1, "frictionType": "exploratory", "reason": "one sentence"}]`;

function randomId(): string {
  return Math.random().toString(36).slice(2, 9);
}

const VALID_TYPES: FrictionType[] = [
  'blocking', 'structural', 'exploratory', 'deferred', 'resolved',
];

export async function detectFrictions(
  claims: Claim[],
  config: ProviderConfig,
): Promise<Friction[]> {
  if (claims.length < 2) return [];

  const claimList = claims
    .map((c, i) => `[${i}] (${c.agent}): ${c.text}`)
    .join('\n');

  const userPrompt = `Analyze these claims for friction:\n\n${claimList}\n\nReturn a JSON array of friction objects.`;

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
