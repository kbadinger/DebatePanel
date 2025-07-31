import { PrismaClient } from '@prisma/client';
import { Model } from '@/types/debate';
import { MODEL_PRICING } from './models/pricing';

const prisma = new PrismaClient();

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export class UsageTracker {
  private debateId: string;
  private userId?: string;

  constructor(debateId: string, userId?: string) {
    this.debateId = debateId;
    this.userId = userId;
  }

  async trackModelUsage(
    model: Model,
    roundNumber: number,
    usage: TokenUsage
  ): Promise<void> {
    // Skip if no user (anonymous debates)
    if (!this.userId) return;

    const pricing = MODEL_PRICING[model.id];
    if (!pricing) {
      console.warn(`No pricing found for model ${model.id}`);
      return;
    }

    // Calculate costs
    const inputCost = (usage.inputTokens / 1000) * pricing.costPer1kTokens.input;
    const outputCost = (usage.outputTokens / 1000) * pricing.costPer1kTokens.output;
    const apiCost = inputCost + outputCost;
    const platformFee = apiCost * pricing.platformMarkup;
    const totalCost = apiCost + platformFee;

    try {
      // Record the usage
      await prisma.usageRecord.create({
        data: {
          userId: this.userId,
          debateId: this.debateId,
          roundNumber,
          modelId: model.id,
          modelProvider: model.provider,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          apiCost,
          platformFee,
          totalCost,
        },
      });

      console.log(`Tracked usage for ${model.displayName}:`, {
        tokens: usage,
        costs: { apiCost, platformFee, totalCost }
      });
    } catch (error) {
      console.error('Failed to track usage:', error);
      // Don't throw - we don't want usage tracking failures to break debates
    }
  }

  async getDebateTotalCost(): Promise<number> {
    if (!this.userId) return 0;

    const records = await prisma.usageRecord.findMany({
      where: { debateId: this.debateId },
    });

    return records.reduce((sum, record) => sum + record.totalCost, 0);
  }
}

// Helper to estimate token count from text
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 3 characters for English text
  return Math.ceil(text.length / 3);
}

// Get user's usage for current billing period
export async function getUserUsageForPeriod(userId: string): Promise<{
  totalCost: number;
  tokensByModel: Record<string, { input: number; output: number }>;
  debateCount: number;
}> {
  // Get user's subscription to find billing period
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const startDate = subscription?.currentPeriodStart || new Date(0);
  const endDate = subscription?.currentPeriodEnd || new Date();

  const records = await prisma.usageRecord.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Aggregate by model
  const tokensByModel: Record<string, { input: number; output: number }> = {};
  let totalCost = 0;
  const debateIds = new Set<string>();

  for (const record of records) {
    totalCost += record.totalCost;
    debateIds.add(record.debateId);

    if (!tokensByModel[record.modelId]) {
      tokensByModel[record.modelId] = { input: 0, output: 0 };
    }
    tokensByModel[record.modelId].input += record.inputTokens;
    tokensByModel[record.modelId].output += record.outputTokens;
  }

  return {
    totalCost,
    tokensByModel,
    debateCount: debateIds.size,
  };
}