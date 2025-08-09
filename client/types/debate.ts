export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'xai' | 'perplexity' | 'deepseek' | 'mistral' | 'meta' | 'cohere' | 'ai21' | 'kimi' | 'qwen' | 'flux';

export interface Model {
  id: string;
  provider: ModelProvider;
  name: string;
  displayName: string;
  costInfo?: {
    estimatedCostPerResponse: number;
    category: 'budget' | 'standard' | 'premium' | 'luxury';
    emoji: string;
  };
}

export interface DebateConfig {
  topic: string;
  description?: string;
  models: Model[];
  rounds: number;
  format: 'free-form' | 'structured' | 'devils-advocate';
  convergenceThreshold?: number;
  judge?: {
    enabled: boolean;
    model?: Model;
  };
  isInteractive?: boolean;
}

export interface ModelResponse {
  modelId: string;
  round: number;
  content: string;
  position: 'strongly-agree' | 'agree' | 'neutral' | 'disagree' | 'strongly-disagree';
  confidence: number;
  timestamp: Date;
  // New fields for better tracking
  stance?: string; // The actual recommendation (e.g., "Keyless", "BYOK", "Hybrid")
  consensusAlignment?: 'strong-consensus' | 'partial-consensus' | 'independent' | 'divergent' | 'strong-dissent';
  isHuman?: boolean;
  userId?: string;
  userName?: string;
}

export interface DebateRound {
  roundNumber: number;
  responses: ModelResponse[];
  consensus?: string;
  keyDisagreements?: string[];
}

export interface Debate {
  id: string;
  config: DebateConfig;
  rounds: DebateRound[];
  status: 'active' | 'completed' | 'converged' | 'waiting-for-human';
  createdAt: Date;
  completedAt?: Date;
  finalSynthesis?: string;
  judgeAnalysis?: string;
  participants?: Participant[];
  winner?: {
    id: string;
    name: string;
    type: 'model' | 'human';
    reason: string;
  };
  scores?: Array<{
    id: string;
    name: string;
    score: number;
  }>;
}

export interface DebateStreamUpdate {
  type: 'response' | 'round-complete' | 'debate-complete' | 'waiting-for-human' | 'human-joined';
  data: ModelResponse | DebateRound | Debate | { userId: string; userName: string };
}

export interface Participant {
  id: string;
  userId: string;
  userName: string;
  role: 'participant' | 'observer';
  status: 'active' | 'left' | 'kicked';
  joinedAt: Date;
}

export interface HumanInput {
  content: string;
  stance?: string;
  confidence?: number;
}