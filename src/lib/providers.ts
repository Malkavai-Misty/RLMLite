import type { ProviderConfig } from './types';

// Server-only: imported exclusively from API routes, never from client components.

export async function callModel(
  config: ProviderConfig,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
): Promise<string> {
  const apiKey = config.apiKey
    || (config.provider === 'anthropic'
      ? process.env.ANTHROPIC_API_KEY
      : process.env.OPENAI_API_KEY)
    || '';

  if (!apiKey) {
    throw new Error(
      `No API key provided for provider "${config.provider}". ` +
      'Set it in the UI or via the ANTHROPIC_API_KEY / OPENAI_API_KEY environment variable.',
    );
  }

  if (config.provider === 'anthropic') {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: config.model || 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const block = message.content[0];
    if (!block || block.type !== 'text') {
      throw new Error('Unexpected response structure from Anthropic API');
    }
    return block.text;
  }

  // OpenAI or any OpenAI-compatible endpoint
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({
    apiKey,
    ...(config.baseURL ? { baseURL: config.baseURL } : {}),
  });
  const completion = await client.chat.completions.create({
    model: config.model || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
  });
  return completion.choices[0]?.message.content ?? '';
}
