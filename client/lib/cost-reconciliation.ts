import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface OpenAIUsageResponse {
  object: string;
  data: {
    aggregated_by: string[];
    costs: {
      timestamp: number;
      project_id?: string;
      model?: string;
      input_tokens: number;
      output_tokens: number;
      input_tokens_cost_usd: number;
      output_tokens_cost_usd: number;
      total_cost_usd: number;
    }[];
  }[];
}

interface AnthropicCostResponse {
  costs: {
    timestamp: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
  }[];
}

interface CostReconciliationResult {
  provider: string;
  totalFetched: number;
  totalCostUSD: number;
  matched: number;
  unmatched: number;
  updated: number;
  costs: Array<{
    timestamp: string;
    model: string;
    cost: number;
    tokens: { input: number; output: number };
    matched: boolean;
    usageRecordId?: string;
  }>;
}

export class CostReconciliation {
  private openaiApiKey: string;
  private anthropicApiKey: string;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY!;
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY!;

    if (!this.openaiApiKey) throw new Error('OPENAI_API_KEY not found');
    if (!this.anthropicApiKey) throw new Error('ANTHROPIC_API_KEY not found');
  }

  /**
   * Fetch actual costs from OpenAI Usage API
   */
  async fetchOpenAICosts(startDate: Date, endDate: Date): Promise<CostReconciliationResult> {
    try {
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);

      console.log(`[COST FETCH] Fetching OpenAI costs from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // OpenAI Usage API endpoint
      const url = `https://api.openai.com/v1/organization/usage/costs`;
      const params = new URLSearchParams({
        start_time: startTimestamp.toString(),
        end_time: endTimestamp.toString(),
        bucket_width: '1h', // Group by hour for better matching
        group_by: 'model', // Group by model to get model-specific costs
      });

      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`OpenAI Usage API error: ${response.status} ${response.statusText}`);
      }

      const data: OpenAIUsageResponse = await response.json();
      console.log(`[COST FETCH] OpenAI returned ${data.data.length} data buckets`);

      // Process the response to extract costs
      const costs: Array<{
        timestamp: string;
        model: string;
        cost: number;
        tokens: { input: number; output: number };
        matched: boolean;
        usageRecordId?: string;
      }> = [];

      let totalCost = 0;

      for (const bucket of data.data) {
        for (const cost of bucket.costs) {
          const timestamp = new Date(cost.timestamp * 1000).toISOString();
          const costData = {
            timestamp,
            model: cost.model || 'unknown',
            cost: cost.total_cost_usd,
            tokens: {
              input: cost.input_tokens,
              output: cost.output_tokens,
            },
            matched: false,
          };

          costs.push(costData);
          totalCost += cost.total_cost_usd;
        }
      }

      console.log(`[COST FETCH] OpenAI total cost: $${totalCost.toFixed(4)}`);

      // Now try to match with our UsageRecords
      const { matched, updated } = await this.matchAndUpdateRecords('openai', costs, startDate, endDate);

      return {
        provider: 'openai',
        totalFetched: costs.length,
        totalCostUSD: totalCost,
        matched,
        unmatched: costs.length - matched,
        updated,
        costs,
      };
    } catch (error) {
      console.error('[COST FETCH] OpenAI error:', error);
      throw error;
    }
  }

  /**
   * Fetch actual costs from Anthropic Cost API
   */
  async fetchAnthropicCosts(startDate: Date, endDate: Date): Promise<CostReconciliationResult> {
    try {
      console.log(`[COST FETCH] Fetching Anthropic costs from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Anthropic Cost API endpoint
      const url = 'https://api.anthropic.com/v1/organizations/cost_report';
      const body = {
        start_date: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
        end_date: endDate.toISOString().split('T')[0],
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': this.anthropicApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Anthropic Cost API error: ${response.status} ${response.statusText}`);
      }

      const data: AnthropicCostResponse = await response.json();
      console.log(`[COST FETCH] Anthropic returned ${data.costs.length} cost entries`);

      // Process the response
      const costs: Array<{
        timestamp: string;
        model: string;
        cost: number;
        tokens: { input: number; output: number };
        matched: boolean;
        usageRecordId?: string;
      }> = [];

      let totalCost = 0;

      for (const cost of data.costs) {
        const costData = {
          timestamp: cost.timestamp,
          model: cost.model,
          cost: cost.cost_usd,
          tokens: {
            input: cost.input_tokens,
            output: cost.output_tokens,
          },
          matched: false,
        };

        costs.push(costData);
        totalCost += cost.cost_usd;
      }

      console.log(`[COST FETCH] Anthropic total cost: $${totalCost.toFixed(4)}`);

      // Match with our records
      const { matched, updated } = await this.matchAndUpdateRecords('anthropic', costs, startDate, endDate);

      return {
        provider: 'anthropic',
        totalFetched: costs.length,
        totalCostUSD: totalCost,
        matched,
        unmatched: costs.length - matched,
        updated,
        costs,
      };
    } catch (error) {
      console.error('[COST FETCH] Anthropic error:', error);
      throw error;
    }
  }

  /**
   * Match provider costs with our UsageRecords and update the database
   */
  private async matchAndUpdateRecords(
    provider: string,
    costs: Array<{
      timestamp: string;
      model: string;
      cost: number;
      tokens: { input: number; output: number };
      matched: boolean;
      usageRecordId?: string;
    }>,
    startDate: Date,
    endDate: Date
  ): Promise<{ matched: number; updated: number }> {
    try {
      console.log(`[COST MATCH] Matching ${costs.length} ${provider} costs with our records`);

      // Get our UsageRecords for the same time period
      const ourRecords = await prisma.usageRecord.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          modelProvider: provider,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      console.log(`[COST MATCH] Found ${ourRecords.length} ${provider} usage records to match`);

      let matched = 0;
      let updated = 0;

      for (const cost of costs) {
        // Try to match with our records
        const costTime = new Date(cost.timestamp);

        // Find records within 10 minutes of the cost timestamp
        const matchingRecords = ourRecords.filter(record => {
          const recordTime = new Date(record.createdAt);
          const timeDiff = Math.abs(costTime.getTime() - recordTime.getTime());
          const withinTimeWindow = timeDiff <= 10 * 60 * 1000; // 10 minutes
          
          // Also check if model names are similar
          const modelMatch = this.modelsMatch(record.modelId, cost.model);
          
          // Check if token counts are reasonably close (within 20%)
          const totalTokens = record.inputTokens + record.outputTokens;
          const costTokens = cost.tokens.input + cost.tokens.output;
          const tokenMatch = costTokens > 0 ? Math.abs(totalTokens - costTokens) / costTokens < 0.2 : true;

          return withinTimeWindow && modelMatch && tokenMatch;
        });

        if (matchingRecords.length > 0) {
          // Take the closest match by token count
          const bestMatch = matchingRecords.reduce((best, current) => {
            const bestTokenDiff = Math.abs((best.inputTokens + best.outputTokens) - (cost.tokens.input + cost.tokens.output));
            const currentTokenDiff = Math.abs((current.inputTokens + current.outputTokens) - (cost.tokens.input + cost.tokens.output));
            return currentTokenDiff < bestTokenDiff ? current : best;
          });

          // Update the record with actual cost
          // For now, just update the apiCost field since new columns don't exist in production
          try {
            // Check if new columns exist by trying to update with them
            try {
              await prisma.usageRecord.update({
                where: { id: bestMatch.id },
                data: {
                  actualApiCost: cost.cost,
                  costDelta: cost.cost - (bestMatch.estimatedApiCost || bestMatch.apiCost),
                  costAccuracy: bestMatch.estimatedApiCost ? 
                    Math.max(0, 1 - Math.abs(cost.cost - bestMatch.estimatedApiCost) / cost.cost) : null,
                  hasActualCost: true,
                  costSource: 'api_fetch',
                  providerCostFetched: true,
                  providerCostFetchedAt: new Date(),
                  reconciliationNotes: `Matched by timestamp and token count (${cost.tokens.input + cost.tokens.output} tokens)`,
                },
              });
            } catch (columnError) {
              // New columns don't exist, fallback to updating existing apiCost field
              console.log(`[COST MATCH] New columns not available, updating apiCost field only`);
              await prisma.usageRecord.update({
                where: { id: bestMatch.id },
                data: {
                  apiCost: cost.cost, // Use the existing apiCost field
                },
              });
            }

            cost.matched = true;
            cost.usageRecordId = bestMatch.id;
            matched++;
            updated++;

            console.log(`[COST MATCH] Matched ${provider} cost $${cost.cost.toFixed(4)} with record ${bestMatch.id}`);
          } catch (updateError) {
            console.error(`[COST MATCH] Failed to update record ${bestMatch.id}:`, updateError);
          }
        } else {
          console.log(`[COST MATCH] No match found for ${provider} cost at ${cost.timestamp} (${cost.model})`);
        }
      }

      console.log(`[COST MATCH] ${provider} matching complete: ${matched}/${costs.length} matched, ${updated} updated`);

      return { matched, updated };
    } catch (error) {
      console.error(`[COST MATCH] Error matching ${provider} costs:`, error);
      throw error;
    }
  }

  /**
   * Check if two model names refer to the same model (handles variations in naming)
   */
  private modelsMatch(ourModel: string, providerModel: string): boolean {
    // Normalize model names for comparison
    const normalize = (name: string) => name.toLowerCase().replace(/[-_.]/g, '');
    
    const ourNormalized = normalize(ourModel);
    const providerNormalized = normalize(providerModel);
    
    // Direct match
    if (ourNormalized === providerNormalized) return true;
    
    // Check common variations
    const variations = [
      ['gpt4o', 'gpt-4o'],
      ['gpt4omini', 'gpt-4o-mini'],
      ['gpt5', 'gpt-5'],
      ['claude35sonnet', 'claude-3-5-sonnet'],
      ['claude3opus', 'claude-3-opus'],
    ];
    
    for (const [var1, var2] of variations) {
      if ((ourNormalized.includes(var1) && providerNormalized.includes(var2)) ||
          (ourNormalized.includes(var2) && providerNormalized.includes(var1))) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Fetch costs from all providers for a date range
   */
  async fetchAllProviderCosts(startDate: Date, endDate: Date): Promise<CostReconciliationResult[]> {
    const results: CostReconciliationResult[] = [];

    try {
      // Fetch OpenAI costs
      const openaiResult = await this.fetchOpenAICosts(startDate, endDate);
      results.push(openaiResult);
    } catch (error) {
      console.error('[COST FETCH] OpenAI fetch failed:', error);
      results.push({
        provider: 'openai',
        totalFetched: 0,
        totalCostUSD: 0,
        matched: 0,
        unmatched: 0,
        updated: 0,
        costs: [],
      });
    }

    try {
      // Fetch Anthropic costs
      const anthropicResult = await this.fetchAnthropicCosts(startDate, endDate);
      results.push(anthropicResult);
    } catch (error) {
      console.error('[COST FETCH] Anthropic fetch failed:', error);
      results.push({
        provider: 'anthropic',
        totalFetched: 0,
        totalCostUSD: 0,
        matched: 0,
        unmatched: 0,
        updated: 0,
        costs: [],
      });
    }

    return results;
  }
}