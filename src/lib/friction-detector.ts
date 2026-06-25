import { callModel } from './providers';
import type { Claim, Friction, FrictionType, ProviderConfig } from './types';

const SYSTEM_PROMPT = `You are a Reasoning Relationship Detector in a three-agent debate system.

The three agents have structurally defined roles:
- Proposer: makes confident, positive assertions about the topic.
- Challenger: specifically designed to oppose, complicate, or contradict the Proposer. Any Proposer-Challenger pair should be presumed to have tension unless you can prove otherwise.
- Explorer: synthesizes or adds nuance; may agree with either, bridge both, or introduce new angles.

Your primary job is to surface the Proposer-Challenger opposition. These pairs are structurally set up to conflict. Even when the conflict is subtle — competing emphasis, different risk framing, asymmetric scope — that is tension and you must capture it.

Classify every meaningful claim pair using one of four types:
- contradiction: direct logical impossibility — both claims cannot simultaneously be true.
- tension: meaningful opposition or competing emphasis that is not a full contradiction. THE MOST EXPECTED TYPE for Proposer↔Challenger pairs. Different framings, competing priorities, or asymmetric risk emphasis all qualify.
- refinement: one claim qualifies, constrains, or adds nuance to another without contradicting it.
- convergence: two claims that agree, reinforce each other, or arrive at the same conclusion from different angles.

Critical rules:
- For every Proposer↔Challenger pair: default to tension unless you find convergence evidence. Prove it is NOT tension before skipping it.
- For every Proposer↔Explorer and Challenger↔Explorer pair: look for refinement or convergence; tension is also possible.
- Do not skip subtle relationships. Latent tension is exactly what this system exists to detect.
- Return [] ONLY if two claims are completely unrelated in topic.
- "contradiction" is rare — reserve for hard logical impossibilities.
- "tension" is common and valuable — most Proposer↔Challenger pairs will be tension.

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

  const proposerClaims   = claims.filter(c => c.agent === 'proposer');
  const challengerClaims = claims.filter(c => c.agent === 'challenger');
  const pCCount = proposerClaims.length * challengerClaims.length;

  const labeled = claims
    .map((c, i) => `[${i}] [${c.agent.toUpperCase()}]: ${c.text}`)
    .join('\n');

  const userPrompt = `Analyze these claims for relationships. Claims are labeled by agent role.

${labeled}

IMPORTANT: There are ${pCCount} Proposer↔Challenger pairs. The Proposer asserts; the Challenger is specifically designed to oppose the Proposer. Examine every Proposer↔Challenger pair and classify the relationship — default to "tension" unless the claims clearly converge.

Also examine Proposer↔Explorer and Challenger↔Explorer pairs for refinement or convergence.

Return a JSON array covering all meaningful pairs.`;

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
      claim1Id:     claims[f.claim1Index].id,
      claim2Id:     claims[f.claim2Index].id,
      claim1Text:   claims[f.claim1Index].text,
      claim2Text:   claims[f.claim2Index].text,
      frictionType: f.frictionType as FrictionType,
      reason:       f.reason ?? '',
    }));
}
