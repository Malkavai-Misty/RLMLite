import type { ProviderConfig } from './types';

// Server-only: imported exclusively from API routes, never from client components.

const BASE_URLS: Partial<Record<string, string>> = {
  google:     'https://generativelanguage.googleapis.com/v1beta/openai/',
  openrouter: 'https://openrouter.ai/api/v1',
  deepseek:   'https://api.deepseek.com/v1',
  groq:       'https://api.groq.com/openai/v1',
  mistral:    'https://api.mistral.ai/v1',
  ollama:     'http://localhost:11434/v1',
};

const ENV_KEYS: Partial<Record<string, string>> = {
  anthropic:  'ANTHROPIC_API_KEY',
  openai:     'OPENAI_API_KEY',
  google:     'GOOGLE_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  deepseek:   'DEEPSEEK_API_KEY',
  groq:       'GROQ_API_KEY',
  mistral:    'MISTRAL_API_KEY',
};

export async function callModel(
  config: ProviderConfig,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
): Promise<string> {
  const envKeyName = ENV_KEYS[config.provider];
  const apiKey =
    config.apiKey ||
    (envKeyName ? (process.env[envKeyName] ?? '') : '') ||
    (config.provider === 'ollama' ? 'ollama' : '');

  if (!apiKey && config.provider !== 'ollama') {
    throw new Error(
      `No API key provided for "${config.provider}". ` +
      'Enter one in the API Keys modal or set the corresponding environment variable.',
    );
  }

  // Anthropic uses its own SDK
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

  // All other providers are OpenAI-compatible
  const { default: OpenAI } = await import('openai');
  const baseURL = config.baseURL ?? BASE_URLS[config.provider];
  const client = new OpenAI({
    apiKey: apiKey || 'ollama',
    ...(baseURL ? { baseURL } : {}),
  });
  const completion = await client.chat.completions.create({
    model: config.model || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt   },
    ],
    max_tokens: maxTokens,
  });
  return completion.choices[0]?.message.content ?? '';
}
