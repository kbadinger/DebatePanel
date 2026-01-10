export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'xai' | 'perplexity' | 'deepseek' | 'mistral' | 'meta' | 'cohere' | 'ai21' | 'kimi' | 'qwen' | 'flux';

export type ModelStrength = 'analytical' | 'creative' | 'ethical' | 'technical' | 'business' | 'research' | 'general';

export type ResponseLength = 'concise' | 'standard' | 'detailed' | 'comprehensive';

export type AnalysisDepth = 'practical' | 'thorough' | 'excellence' | 'standard' | 'deep';

export type DebateStatus = 'pending' | 'running' | 'completed' | 'failed' | 'converged' | 'waiting-for-human';

export interface Model {
  id: string;
  provider: ModelProvider;
  name: string;
  displayName: string;
  routeVia?: 'direct' | 'openrouter'; // How to route inference requests (default: direct)
  costInfo?: {
    estimatedCostPerResponse: number;
    category: 'budget' | 'standard' | 'premium' | 'luxury';
    emoji: string;
  };
  contextInfo?: {
    maxTokens: number; // Maximum context window in tokens
    strengths: ModelStrength[]; // What this model is best at
    suggestedRole?: string; // Suggested role in debates
    isSlowThinking?: boolean; // Reasoning model (takes longer per response)
    avgTimePerRound?: number; // Estimated seconds per round
  };
}

export type DebateStyle = 'adversarial' | 'consensus-seeking' | 'ideation';

export const IDEATION_ROUND_NAMES: Record<number, string> = {
  1: 'Diverge',
  2: 'Cross-pollinate',
  3: 'Deathmatch Critique',
  4: 'Vote + Defend',
  5: 'Refine',
  6: 'Refine',
  7: 'Final Showdown'
};

export interface DebateConfig {
  topic: string;
  description?: string;
  models: Model[];
  rounds: number;
  format: 'free-form' | 'structured' | 'devils-advocate';
  style?: DebateStyle; // DEPRECATED: Kept for backward compatibility with old debates, new debates use unified truth-seeking mode
  analysisDepth?: AnalysisDepth; // NEW: Controls how deeply models analyze the topic
  convergenceThreshold?: number;
  responseLength?: ResponseLength; // NEW: Control response length and cost
  judge?: {
    enabled: boolean;
    model?: Model;
  };
  challenger?: {
    enabled: boolean;
    model?: Model;
  };
  isInteractive?: boolean;
  profileContext?: string; // Preprocessed user profile context to inject into prompts
  successCriteria?: string; // User's goal for ideation mode - gets converted to evaluation rubric
  ideaCount?: number; // Number of ideas each model generates in ideation mode (default: 4)
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
  currentRound: number;
  status: DebateStatus;
  errorMessage?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  finalSynthesis?: string;
  judgeAnalysis?: string;
  rubric?: string; // Generated evaluation rubric for ideation mode
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