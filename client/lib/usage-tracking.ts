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
    usage: TokenUsage,
    providerUsage?: any // Raw usage data from AI provider
  ): Promise<void> {
    // Skip if no user (anonymous debates)
    if (!this.userId) return;

    const pricing = MODEL_PRICING[model.id];
    if (!pricing) {
      console.warn(`No pricing found for model ${model.id}`);
      return;
    }

    // Always calculate estimated cost
    const inputCost = (usage.inputTokens / 1000) * pricing.costPer1kTokens.input;
    const outputCost = (usage.outputTokens / 1000) * pricing.costPer1kTokens.output;
    const estimatedApiCost = inputCost + outputCost;

    // Try to extract actual cost from provider response
    let actualApiCost: number | null = null;
    let hasActualCost = false;
    let costSource = 'estimated';
    
    if (providerUsage) {
      console.log(`[COST DEBUG] Checking for real cost data in provider usage:`, providerUsage);
      
      // Check for real cost data from different providers
      const realCost = this.extractActualCost(providerUsage);
      
      if (realCost && typeof realCost === 'number' && realCost > 0) {
        actualApiCost = realCost;
        hasActualCost = true;
        costSource = 'actual';
        console.log(`[COST DEBUG] ✅ Found REAL API cost: $${actualApiCost} for ${model.displayName}`);
      } else {
        console.log(`[COST DEBUG] ⚠️ No real cost found, using estimated cost: $${estimatedApiCost} for ${model.displayName}`);
      }
    } else {
      console.log(`[COST DEBUG] ⚠️ No provider usage data, using estimated cost: $${estimatedApiCost} for ${model.displayName}`);
    }

    // Calculate accuracy metrics if we have actual cost
    let costDelta: number | null = null;
    let costAccuracy: number | null = null;
    
    if (hasActualCost && actualApiCost) {
      costDelta = actualApiCost - estimatedApiCost;
      // Accuracy = 1 - (|delta| / actual), capped at 0
      costAccuracy = Math.max(0, 1 - (Math.abs(costDelta) / actualApiCost));
    }

    // Use actual cost if available, otherwise use estimated for billing
    const billingApiCost = actualApiCost || estimatedApiCost;
    const platformFee = billingApiCost * pricing.platformMarkup;
    const totalCost = billingApiCost + platformFee;

    try {
      // Extract provider-reported token counts if available
      let providerInputTokens: number | null = null;
      let providerOutputTokens: number | null = null;
      let providerReportedCost: number | null = null;
      let importSource = 'api_response';

      if (providerUsage) {
        // Extract provider-reported tokens (different from our estimated tokens)
        if (providerUsage.usage?.prompt_tokens) providerInputTokens = providerUsage.usage.prompt_tokens;
        if (providerUsage.usage?.completion_tokens) providerOutputTokens = providerUsage.usage.completion_tokens;
        if (providerUsage.usage?.input_tokens) providerInputTokens = providerUsage.usage.input_tokens;
        if (providerUsage.usage?.output_tokens) providerOutputTokens = providerUsage.usage.output_tokens;
        
        // Perplexity specific token fields
        if (providerUsage.usage?.prompt_tokens && !providerInputTokens) providerInputTokens = providerUsage.usage.prompt_tokens;
        if (providerUsage.usage?.completion_tokens && !providerOutputTokens) providerOutputTokens = providerUsage.usage.completion_tokens;
        
        // DeepSeek specific token fields
        if (providerUsage.usage?.total_tokens && providerUsage.usage?.prompt_tokens) {
          providerInputTokens = providerUsage.usage.prompt_tokens;
          providerOutputTokens = providerUsage.usage.total_tokens - providerUsage.usage.prompt_tokens;
        }

        // Store provider-reported cost if available
        if (actualApiCost) providerReportedCost = actualApiCost;
      }

      // Record the usage - now with provider token tracking
      try {
        await prisma.usageRecord.create({
          data: {
            userId: this.userId,
            debateId: this.debateId,
            roundNumber,
            modelId: model.id,
            modelProvider: model.provider,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            apiCost: billingApiCost, // Legacy field - use actual if available
            platformFee,
            totalCost,
            // Provider reconciliation data
            providerInputTokens,
            providerOutputTokens,
            providerReportedCost,
            importSource,
            providerCostFetched: hasActualCost,
            providerCostFetchedAt: hasActualCost ? new Date() : null,
            reconciliationNotes: hasActualCost ? `Real cost from ${model.provider} API: $${actualApiCost}` : null,
          },
        });
      } catch (schemaError: any) {
        // Fallback for production schema without new columns
        if (schemaError.code === 'P2022') {
          console.log(`[COST DEBUG] New columns not available, using basic schema`);
          await prisma.usageRecord.create({
            data: {
              userId: this.userId,
              debateId: this.debateId,
              roundNumber,
              modelId: model.id,
              modelProvider: model.provider,
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              apiCost: billingApiCost,
              platformFee,
              totalCost,
            },
          });
        } else {
          throw schemaError;
        }
      }

      console.log(`[COST DEBUG] ✅ Tracked usage for ${model.displayName}:`, {
        tokens: usage,
        costs: { 
          estimated: estimatedApiCost, 
          actual: actualApiCost,
          delta: costDelta,
          accuracy: costAccuracy ? `${(costAccuracy * 100).toFixed(1)}%` : 'N/A',
          billing: billingApiCost,
          platformFee, 
          totalCost 
        },
        costSource
      });
    } catch (error) {
      console.error('Failed to track usage:', error);
      // Don't throw - we don't want usage tracking failures to break debates
    }
  }

  private extractActualCost(providerUsage: any): number | null {
    // Perplexity format - REAL COSTS! (check first since it has actual costs)
    if (providerUsage.usage?.total_cost) return providerUsage.usage.total_cost;
    if (providerUsage.usage?.request_cost) return providerUsage.usage.request_cost;
    if (providerUsage.usage?.input_tokens_cost && providerUsage.usage?.output_tokens_cost) {
      return providerUsage.usage.input_tokens_cost + providerUsage.usage.output_tokens_cost;
    }
    
    // OpenAI format variations
    if (providerUsage.total_cost) return providerUsage.total_cost;
    if (providerUsage.cost) return providerUsage.cost;
    if (providerUsage.totalCost) return providerUsage.totalCost;
    
    // Anthropic format variations
    if (providerUsage.usage?.cost) return providerUsage.usage.cost;
    if (providerUsage.billing?.cost) return providerUsage.billing.cost;
    
    // Google/Gemini format variations
    if (providerUsage.usage_metadata?.total_cost) return providerUsage.usage_metadata.total_cost;
    if (providerUsage.usageMetadata?.totalCost) return providerUsage.usageMetadata.totalCost;
    
    // Other provider formats
    if (providerUsage.usage_cost) return providerUsage.usage_cost;
    if (providerUsage.totalTokenCost) return providerUsage.totalTokenCost;
    
    // DeepSeek and other providers might use different formats
    if (providerUsage.cost_info?.total_cost) return providerUsage.cost_info.total_cost;
    
    return null;
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