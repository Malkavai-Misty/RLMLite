import { callModel } from './providers';
import type { AgentRole, Claim, ProviderConfig } from './types';

const AGENT_SYSTEM_PROMPTS: Record<AgentRole, string> = {
  proposer: `You are a Proposer agent in a reasoning observability system. Your role is to generate new claims and hypotheses. Expand on the subject, assert positions clearly, and surface the strongest supporting arguments.

Extract 3–5 atomic, self-contained claims. Each claim must be:
- Atomic: a single, testable assertion
- Self-contained: understandable without external context  
- Assertive: takes a clear position

Return ONLY a JSON array of strings. No markdown, no explanation, no preamble.
Example: ["Claim one.", "Claim two."]`,

  challenger: `You are a Challenger agent in a reasoning observability system. Your role is to critically evaluate ideas, identify logical flaws, surface unsupported assumptions, and generate productive friction.

Extract 3–5 atomic claims that challenge, contradict, or complicate the subject. Each claim must:
- Identify a specific weakness, counter-position, or unsupported assumption
- Be atomic and self-contained
- Be substantive — not dismissive

Return ONLY a JSON array of strings. No markdown, no explanation, no preamble.`,

  explorer: `You are an Explorer agent in a reasoning observability system. Your role is to propose alternative interpretations, introduce adjacent concepts, and expand the possibility space.

Extract 3–5 atomic claims that explore different framings, analogies, or related domains. Each claim must:
- Introduce a genuinely alternative perspective
- Be atomic and self-contained
- Avoid restating either the Proposer or Challenger positions

Return ONLY a JSON array of strings. No markdown, no explanation, no preamble.`,
};

function randomId(): string {
  return Math.random().toString(36).slice(2, 9);
}

async function extractAgentClaims(
  role: AgentRole,
  prompt: string,
  config: ProviderConfig,
): Promise<Claim[]> {
  const userPrompt = `Analyze this and generate your claims:\n\n${prompt}`;
  const raw = await callModel(config, AGENT_SYSTEM_PROMPTS[role], userPrompt);

  let texts: string[] = [];
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) texts = JSON.parse(match[0]);
  } catch {
    // Fallback: parse bullet lines
    texts = raw
      .split('\n')
      .filter(l => /^[-•*]/.test(l.trim()))
      .map(l => l.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);
  }

  return texts.slice(0, 5).map(text => ({
    id: randomId(),
    text,
    agent: role,
    type: 'standard' as const,
    relations: [],
  }));
}

export async function extractClaims(
  prompt: string,
  proposerConfig: ProviderConfig,
  challengerConfig: ProviderConfig,
  explorerConfig: ProviderConfig,
): Promise<{
  claims: Claim[];
  agentOutputs: { proposer: string; challenger: string; explorer: string };
}> {
  const [proposerClaims, challengerClaims, explorerClaims] = await Promise.all([
    extractAgentClaims('proposer', prompt, proposerConfig),
    extractAgentClaims('challenger', prompt, challengerConfig),
    extractAgentClaims('explorer', prompt, explorerConfig),
  ]);

  return {
    claims: [...proposerClaims, ...challengerClaims, ...explorerClaims],
    agentOutputs: {
      proposer: proposerClaims.map(c => `- ${c.text}`).join('\n'),
      challenger: challengerClaims.map(c => `- ${c.text}`).join('\n'),
      explorer: explorerClaims.map(c => `- ${c.text}`).join('\n'),
    },
  };
}
