export type AgentRole = 'proposer' | 'challenger' | 'explorer';

export type ProviderId =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'openrouter'
  | 'deepseek'
  | 'groq'
  | 'mistral'
  | 'ollama';

export type ClaimRelation = {
  type: 'supports' | 'contradicts' | 'depends_on' | 'extends';
  targetId: string;
  weight: number;
};

export type Claim = {
  id: string;
  text: string;
  agent: AgentRole;
  type: 'standard' | 'synthesis';
  relations: ClaimRelation[];
};

export type FrictionType =
  | 'contradiction'
  | 'tension'
  | 'refinement'
  | 'convergence';

export type Friction = {
  id: string;
  claim1Id: string;
  claim2Id: string;
  claim1Text: string;
  claim2Text: string;
  frictionType: FrictionType;
  reason: string;
};

export type CycleMetrics = {
  contradictionDensity: number;
  agreementRate: number;
  attractorStability: number;
  claimCount: number;
  frictionCount: number;
};

export type DebateCycle = {
  id: string;
  prompt: string;
  claims: Claim[];
  frictions: Friction[];
  synthesis: string;
  metrics: CycleMetrics;
  timestamp: string;
  agentOutputs: {
    proposer: string;
    challenger: string;
    explorer: string;
  };
};

export type ProviderConfig = {
  provider: ProviderId;
  apiKey: string;
  model: string;
  baseURL?: string;
};

export type DebateConfig = {
  proposerProvider:   ProviderConfig;
  challengerProvider: ProviderConfig;
  explorerProvider:   ProviderConfig;
  graphProvider:      ProviderConfig;
};
