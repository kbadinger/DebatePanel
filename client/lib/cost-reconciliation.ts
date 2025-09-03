import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface OpenAICostsResponse {
  object: string;
  start_time: number;
  end_time: number;
  results: {
    object: string;
    amount: {
      value: number;
      currency: string;
    };
    line_item?: string | null;
    project_id?: string | null;
    organization_id: string;
  }[];
}[]

interface OpenAIUsageResponse {
  object: string;
  start_time: number;
  end_time: number;
  results: {
    object: string;
    input_tokens: number;
    output_tokens: number;
    num_model_requests: number;
    project_id?: string;
    user_id?: string;
    api_key_id?: string;
    model?: string;
    batch?: boolean;
    input_cached_tokens: number;
    input_audio_tokens: number;
    output_audio_tokens: number;
  }[];
}

interface OpenAIModelPricing {
  [model: string]: {
    input: number; // cost per 1K tokens
    output: number; // cost per 1K tokens
  };
}

interface AnthropicCostResponse {
  data: {
    starting_at: string;
    ending_at: string;
    results: {
      currency: string;
      amount: string; // Cost in cents as string
      workspace_id?: string | null;
      description?: string | null;
      cost_type?: string;
      model?: string | null;
      token_type?: string;
      context_window?: string;
      service_tier?: string;
    }[];
  }[];
  has_more: boolean;
  next_page?: string;
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
  private openaiAdminKey: string;
  private openaiProjectId: string;
  private anthropicApiKey: string;

  constructor() {
    this.openaiAdminKey = process.env.OPENAI_ADMIN_API_KEY!;
    this.openaiProjectId = process.env.OPENAI_PROJECT_ID!;
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY!;

    if (!this.openaiAdminKey) throw new Error('OPENAI_ADMIN_API_KEY not found');
    if (!this.openaiProjectId) throw new Error('OPENAI_PROJECT_ID not found');
    if (!this.anthropicApiKey) throw new Error('ANTHROPIC_API_KEY not found');
  }

  /**
   * Fetch usage data from OpenAI Usage API and calculate costs using pricing
   */
  async fetchOpenAICosts(startDate: Date, endDate: Date): Promise<CostReconciliationResult> {
    try {
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);

      console.log(`[COST FETCH] Fetching OpenAI usage data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // OpenAI Usage API endpoint - for detailed usage with model breakdown
      const url = `https://api.openai.com/v1/organization/usage/completions`;
      const params = new URLSearchParams({
        start_time: startTimestamp.toString(),
        end_time: endTimestamp.toString(),
        bucket_width: '1h', // Hourly buckets for better matching
        group_by: 'model', // Group by model to get model-specific data
        // project_ids: this.openaiProjectId, // TEMPORARILY DISABLED - get all organization usage
      });

      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.openaiAdminKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`OpenAI Usage API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[COST FETCH] OpenAI response structure:`, JSON.stringify(data, null, 2));

      // Handle different possible response formats
      let buckets: OpenAIUsageResponse[] = [];
      if (Array.isArray(data)) {
        buckets = data;
      } else if (data.data && Array.isArray(data.data)) {
        buckets = data.data;
      } else if (data.object && data.results) {
        // Single bucket response
        buckets = [data];
      } else {
        console.error('[COST FETCH] Unexpected OpenAI response format:', data);
        throw new Error('Unexpected OpenAI API response format');
      }

      console.log(`[COST FETCH] OpenAI returned ${buckets.length} usage buckets`);
      
      // Debug: Check if buckets have results
      const bucketsWithResults = buckets.filter(bucket => bucket.results && bucket.results.length > 0);
      console.log(`[COST FETCH] ${bucketsWithResults.length} buckets have results`);
      
      if (bucketsWithResults.length === 0) {
        console.log(`[COST FETCH] No usage data found for organization in time range ${startDate.toISOString()} to ${endDate.toISOString()}`);
        console.log(`[COST FETCH] This might mean: 1) No API usage in this period, or 2) Different time zone/date range needed`);
        console.log(`[COST FETCH] Try a more recent date range (last 1-2 days) or check when you last used OpenAI API`);
      }

      // OpenAI model pricing (as of Jan 2025) - cost per 1K tokens
      const pricing: OpenAIModelPricing = {
        'gpt-4o': { input: 0.005, output: 0.015 },
        'gpt-4o-2024-11-20': { input: 0.005, output: 0.015 },
        'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
        'gpt-4o-mini-2024-07-18': { input: 0.00015, output: 0.0006 },
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 },
        'gpt-4-turbo-2024-04-09': { input: 0.01, output: 0.03 },
        'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
        'gpt-3.5-turbo-0125': { input: 0.0015, output: 0.002 },
        'o1-preview': { input: 0.015, output: 0.06 },
        'o1-preview-2024-09-12': { input: 0.015, output: 0.06 },
        'o1-mini': { input: 0.003, output: 0.012 },
        'o1-mini-2024-09-12': { input: 0.003, output: 0.012 },
        'o3-mini': { input: 0.01, output: 0.04 },
        // Add more models as needed
      };

      // Process the response to calculate costs from usage data
      const costs: Array<{
        timestamp: string;
        model: string;
        cost: number;
        tokens: { input: number; output: number };
        matched: boolean;
        usageRecordId?: string;
      }> = [];

      let totalCost = 0;

      for (const bucket of buckets) {
        for (const result of bucket.results) {
          const model = result.model || 'unknown';
          const modelPricing = pricing[model];
          
          if (!modelPricing) {
            console.warn(`[COST FETCH] No pricing found for model: ${model}`);
            // Use average pricing for unknown models
            const avgPricing = { input: 0.01, output: 0.03 };
            const inputCost = (result.input_tokens / 1000) * avgPricing.input;
            const outputCost = (result.output_tokens / 1000) * avgPricing.output;
            const totalCostForResult = inputCost + outputCost;

            const timestamp = new Date(bucket.start_time * 1000).toISOString();
            const costData = {
              timestamp,
              model,
              cost: totalCostForResult,
              tokens: {
                input: result.input_tokens,
                output: result.output_tokens,
              },
              matched: false,
            };

            costs.push(costData);
            totalCost += totalCostForResult;
            continue;
          }

          // Calculate cost based on token usage and pricing
          const inputCost = (result.input_tokens / 1000) * modelPricing.input;
          const outputCost = (result.output_tokens / 1000) * modelPricing.output;
          const totalCostForResult = inputCost + outputCost;

          const timestamp = new Date(bucket.start_time * 1000).toISOString();
          const costData = {
            timestamp,
            model,
            cost: totalCostForResult,
            tokens: {
              input: result.input_tokens,
              output: result.output_tokens,
            },
            matched: false,
          };

          costs.push(costData);
          totalCost += totalCostForResult;
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

      // Anthropic Cost API endpoint - GET request with query parameters
      const url = 'https://api.anthropic.com/v1/organizations/cost_report';
      const params = new URLSearchParams({
        starting_at: startDate.toISOString(), // ISO 8601 format with timezone
        ending_at: endDate.toISOString(),
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
      });

      if (!response.ok) {
        throw new Error(`Anthropic Cost API error: ${response.status} ${response.statusText}`);
      }

      const data: AnthropicCostResponse = await response.json();
      console.log(`[COST FETCH] Anthropic returned ${data.data.length} cost buckets`);

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

      for (const bucket of data.data) {
        for (const result of bucket.results) {
          // Parse cost from cents string to dollars
          const costInDollars = parseFloat(result.amount) / 100;
          
          // Extract model from model field or description
          let model = result.model || 'unknown';
          if (!result.model && result.description) {
            // Try to extract model from description like "Claude Sonnet 4 Usage - Input Tokens"
            const modelMatch = result.description.match(/(claude|sonnet|haiku|opus)[^-]*/i);
            if (modelMatch) {
              model = modelMatch[0].toLowerCase().replace(/\s+/g, '-');
            }
          }

          const costData = {
            timestamp: bucket.starting_at,
            model,
            cost: costInDollars,
            tokens: {
              input: 0, // Anthropic Cost API doesn't provide token breakdown
              output: 0,
            },
            matched: false,
          };

          costs.push(costData);
          totalCost += costInDollars;
        }
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
          // Use only existing columns since production DB doesn't have new columns yet
          try {
            await prisma.usageRecord.update({
              where: { id: bestMatch.id },
              data: {
                apiCost: cost.cost, // Update existing apiCost field with actual cost
                // Add reconciliation notes to existing fields if available
                providerCostFetched: true,
                providerCostFetchedAt: new Date(),
                reconciliationNotes: `Matched actual cost $${cost.cost.toFixed(4)} by timestamp and model (${cost.model})`,
              },
            });
            console.log(`[COST MATCH] Updated record ${bestMatch.id} with actual cost $${cost.cost.toFixed(4)}`);

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