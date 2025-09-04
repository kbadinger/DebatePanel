import { PrismaClient } from '@prisma/client';
import { CloudBillingClient } from '@google-cloud/billing';

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
  private anthropicAdminKey: string;
  private googleProjectId: string;
  private billingClient: CloudBillingClient;

  constructor() {
    this.openaiAdminKey = process.env.OPENAI_ADMIN_API_KEY!;
    this.openaiProjectId = process.env.OPENAI_PROJECT_ID!;
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY!;
    this.anthropicAdminKey = process.env.ANTHROPIC_ADMIN_API_KEY!;
    this.googleProjectId = process.env.GOOGLE_CLOUD_PROJECT_ID!;

    if (!this.openaiAdminKey) throw new Error('OPENAI_ADMIN_API_KEY not found');
    if (!this.openaiProjectId) throw new Error('OPENAI_PROJECT_ID not found');
    if (!this.anthropicAdminKey) throw new Error('ANTHROPIC_ADMIN_API_KEY not found');
    if (!this.googleProjectId) throw new Error('GOOGLE_CLOUD_PROJECT_ID not found');

    // Initialize Google Cloud Billing client
    this.billingClient = new CloudBillingClient();
  }

  /**
   * Fetch usage data from OpenAI Usage API and calculate costs using pricing
   */
  async fetchOpenAICosts(startDate: Date, endDate: Date, force = false): Promise<CostReconciliationResult> {
    try {
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);

      console.log(`[COST FETCH] Fetching OpenAI usage data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Duplicate prevention temporarily disabled - requires new database columns
      // Will be re-enabled after production database migration
      console.log(`[COST FETCH] Database columns for duplicate prevention don't exist yet - proceeding with fetch`);

      // OpenAI Usage API endpoint - for detailed usage with model breakdown
      const url = `https://api.openai.com/v1/organization/usage/completions`;
      const params = new URLSearchParams({
        start_time: startTimestamp.toString(),
        end_time: endTimestamp.toString(),
        bucket_width: '1h', // Hourly buckets for better matching
        group_by: 'model', // Group by model to get model-specific data
        // project_ids: this.openaiProjectId, // TEMPORARILY DISABLED - get all organization usage
      });

      // Fetch all pages of usage data
      let allBuckets: OpenAIUsageResponse[] = [];
      let nextPage: string | null = null;
      let pageCount = 0;
      
      do {
        pageCount++;
        console.log(`[COST FETCH] Fetching page ${pageCount}${nextPage ? ` (cursor: ${nextPage.substring(0, 20)}...)` : ''}`);
        
        const requestParams = new URLSearchParams(params);
        if (nextPage) {
          requestParams.set('page', nextPage);
        }

        const response = await fetch(`${url}?${requestParams}`, {
          headers: {
            'Authorization': `Bearer ${this.openaiAdminKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`OpenAI Usage API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Log detailed structure only for first page
        if (pageCount === 1) {
          console.log(`[COST FETCH] OpenAI response structure:`, JSON.stringify(data, null, 2));
        }

        // Handle pagination response format
        if (data.data && Array.isArray(data.data)) {
          allBuckets.push(...data.data);
          nextPage = data.has_more ? data.next_page : null;
          console.log(`[COST FETCH] Page ${pageCount}: ${data.data.length} buckets, has_more: ${data.has_more}`);
        } else {
          console.error('[COST FETCH] Unexpected OpenAI response format:', data);
          throw new Error('Unexpected OpenAI API response format');
        }
        
        // Safety limit to prevent infinite loops
        if (pageCount > 100) {
          console.warn(`[COST FETCH] Reached page limit (${pageCount}), stopping pagination`);
          break;
        }
        
      } while (nextPage);

      const buckets = allBuckets;
      console.log(`[COST FETCH] OpenAI returned ${buckets.length} total usage buckets across ${pageCount} pages`);
      
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
        // GPT-4o family
        'gpt-4o': { input: 0.005, output: 0.015 },
        'gpt-4o-2024-11-20': { input: 0.005, output: 0.015 },
        'gpt-4o-2024-08-06': { input: 0.005, output: 0.015 },
        'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
        'gpt-4o-mini-2024-07-18': { input: 0.00015, output: 0.0006 },
        
        // GPT-4 legacy
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 },
        'gpt-4-turbo-2024-04-09': { input: 0.01, output: 0.03 },
        'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
        'gpt-3.5-turbo-0125': { input: 0.0015, output: 0.002 },
        
        // GPT-5 family (estimated pricing - adjust based on actual OpenAI pricing)
        'gpt-5-2025-08-07': { input: 0.01, output: 0.03 },
        'gpt-5-mini-2025-08-07': { input: 0.0005, output: 0.002 },
        'gpt-5-nano-2025-08-07': { input: 0.0002, output: 0.001 },
        
        // GPT-4.1 family (estimated pricing)
        'gpt-4.1-2025-04-14': { input: 0.008, output: 0.025 },
        'gpt-4.1-mini-2025-04-14': { input: 0.0003, output: 0.0012 },
        'gpt-4.1-nano-2025-04-14': { input: 0.0001, output: 0.0005 },
        
        // O1 family
        'o1-preview': { input: 0.015, output: 0.06 },
        'o1-preview-2024-09-12': { input: 0.015, output: 0.06 },
        'o1-mini': { input: 0.003, output: 0.012 },
        'o1-mini-2024-09-12': { input: 0.003, output: 0.012 },
        'o1-2024-12-17': { input: 0.02, output: 0.08 },
        
        // O3 family (estimated pricing)
        'o3-2025-04-16': { input: 0.025, output: 0.1 },
        'o3-mini': { input: 0.01, output: 0.04 },
        'o3-mini-2025-01-31': { input: 0.01, output: 0.04 },
        
        // O4 family (estimated pricing)
        'o4-mini-2025-04-16': { input: 0.012, output: 0.05 },
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
  async fetchAnthropicCosts(startDate: Date, endDate: Date, force = false): Promise<CostReconciliationResult> {
    try {
      console.log(`[COST FETCH] Fetching Anthropic costs from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      console.log(`[COST FETCH] Using Anthropic admin key: ${this.anthropicAdminKey?.substring(0, 20) || 'KEY_MISSING'}...`);
      console.log(`[COST FETCH] Admin key full length: ${this.anthropicAdminKey?.length || 0}`);
      console.log(`[COST FETCH] Admin key ends with: ...${this.anthropicAdminKey?.slice(-10) || 'MISSING'}`);
      
      // Will be defined later - just debug for now
      console.log(`[COST FETCH] Request headers:`, {
        'x-api-key': `${this.anthropicAdminKey?.substring(0, 10)}...${this.anthropicAdminKey?.slice(-10)}`,
        'anthropic-version': '2023-06-01'
      });

      // Duplicate prevention temporarily disabled - requires new database columns
      // Will be re-enabled after production database migration
      console.log(`[COST FETCH] Database columns for duplicate prevention don't exist yet - proceeding with fetch`);

      // Anthropic Cost API endpoint - GET request with query parameters
      const url = 'https://api.anthropic.com/v1/organizations/cost_report';
      const params = new URLSearchParams({
        starting_at: startDate.toISOString(), // ISO 8601 format with timezone
        ending_at: endDate.toISOString(),
      });

      // Fetch all pages of cost data
      let allData: any[] = [];
      let nextPage: string | null = null;
      let pageCount = 0;
      
      do {
        pageCount++;
        console.log(`[COST FETCH] Fetching Anthropic page ${pageCount}${nextPage ? ` (cursor: ${nextPage.substring(0, 20)}...)` : ''}`);
        
        const requestParams = new URLSearchParams(params);
        if (nextPage) {
          requestParams.set('page', nextPage);
        }

        const response = await fetch(`${url}?${requestParams}`, {
          method: 'GET',
          headers: {
            'x-api-key': this.anthropicAdminKey,
            'anthropic-version': '2023-06-01',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[COST FETCH] Anthropic API error details:`, {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
            headers: Object.fromEntries(response.headers.entries())
          });
          throw new Error(`Anthropic Cost API error: ${response.status} ${response.statusText}. Body: ${errorText}`);
        }

        const data: AnthropicCostResponse = await response.json();
        
        // Log detailed structure only for first page
        if (pageCount === 1) {
          console.log(`[COST FETCH] Anthropic response structure:`, JSON.stringify(data, null, 2));
        }
        
        allData.push(...data.data);
        nextPage = data.has_more ? data.next_page : null;
        console.log(`[COST FETCH] Page ${pageCount}: ${data.data.length} buckets, has_more: ${data.has_more}`);
        
        // Safety limit to prevent infinite loops
        if (pageCount > 100) {
          console.warn(`[COST FETCH] Reached page limit (${pageCount}), stopping pagination`);
          break;
        }
        
      } while (nextPage);

      console.log(`[COST FETCH] Anthropic returned ${allData.length} total cost buckets across ${pageCount} pages`);

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

      for (const bucket of allData) {
        for (const result of bucket.results) {
          // Parse cost - API returns values in cents, convert to dollars
          const costInDollars = parseFloat(result.amount) / 100;
          
          // Extract model from model field or description
          let model = result.model || 'anthropic-aggregate';
          if (!result.model && result.description) {
            // Try to extract model from description like "Claude Sonnet 4 Usage - Input Tokens"
            const modelMatch = result.description.match(/(claude|sonnet|haiku|opus)[^-]*/i);
            if (modelMatch) {
              model = modelMatch[0].toLowerCase().replace(/\s+/g, '-');
            }
          }
          
          // Ensure we have a valid model ID for database
          if (!model || model === 'unknown') {
            model = 'anthropic-aggregate';
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
   * Fetch actual costs from Google Cloud Billing API
   */
  async fetchGoogleCosts(startDate: Date, endDate: Date, force = false): Promise<CostReconciliationResult> {
    try {
      console.log(`[COST FETCH] Fetching Google Cloud costs from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      console.log(`[COST FETCH] Using Google Cloud project: ${this.googleProjectId}`);
      
      // Duplicate prevention temporarily disabled - requires new database columns
      console.log(`[COST FETCH] Database columns for duplicate prevention don't exist yet - proceeding with fetch`);

      // Get billing account for the project
      const projectId = `projects/${this.googleProjectId}`;
      const [projectBillingInfo] = await this.billingClient.getProjectBillingInfo({
        name: projectId,
      });

      if (!projectBillingInfo.billingEnabled) {
        throw new Error(`Billing is not enabled for project ${this.googleProjectId}`);
      }

      const billingAccountName = projectBillingInfo.billingAccountName;
      if (!billingAccountName) {
        throw new Error(`No billing account found for project ${this.googleProjectId}`);
      }

      console.log(`[COST FETCH] Found billing account: ${billingAccountName}`);

      // Query the Cloud Billing API for usage data
      // Note: Google Cloud Billing API doesn't provide detailed usage like OpenAI
      // We'll use the billing export data or estimate from our own usage tracking
      
      // For now, we'll create a simplified implementation that tracks costs
      // from our own usage records and applies Google's pricing
      const costs: Array<{
        timestamp: string;
        model: string;
        cost: number;
        tokens: { input: number; output: number };
        matched: boolean;
        usageRecordId?: string;
      }> = [];

      // Google Gemini pricing (as of January 2025)
      const googlePricing: { [model: string]: { input: number; output: number } } = {
        // Gemini 2.5 Pro
        'gemini-2.5-pro': { input: 0.0075, output: 0.03 }, // Per 1K tokens
        'gemini-2.5-flash': { input: 0.0003, output: 0.0012 }, // Per 1K tokens
        'gemini-2.5-flash-lite': { input: 0.00015, output: 0.0006 }, // Per 1K tokens
        
        // Gemini 1.5 Pro (legacy)
        'gemini-1.5-pro': { input: 0.00375, output: 0.015 }, // Per 1K tokens
        'gemini-1.5-flash': { input: 0.000375, output: 0.0015 }, // Per 1K tokens
        'gemini-1.5-flash-8b': { input: 0.0001875, output: 0.00075 }, // Per 1K tokens
      };

      // Get our usage records for Google models in this period
      const googleUsageRecords = await prisma.usageRecord.findMany({
        where: {
          modelProvider: 'google',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          roundNumber: { not: 0 }, // Exclude reconciliation records
        },
        orderBy: { createdAt: 'desc' },
      });

      console.log(`[COST FETCH] Found ${googleUsageRecords.length} Google usage records in period`);

      let totalCost = 0;

      for (const record of googleUsageRecords) {
        const modelPricing = googlePricing[record.modelId];
        
        if (!modelPricing) {
          console.warn(`[COST FETCH] No pricing found for Google model: ${record.modelId}`);
          // Use average pricing for unknown models
          const avgPricing = { input: 0.005, output: 0.02 };
          const inputCost = (record.inputTokens / 1000) * avgPricing.input;
          const outputCost = (record.outputTokens / 1000) * avgPricing.output;
          const recordCost = inputCost + outputCost;

          costs.push({
            timestamp: record.createdAt.toISOString(),
            model: record.modelId,
            cost: recordCost,
            tokens: {
              input: record.inputTokens,
              output: record.outputTokens,
            },
            matched: true,
            usageRecordId: record.id,
          });

          totalCost += recordCost;
          continue;
        }

        // Calculate cost based on our usage and Google's pricing
        const inputCost = (record.inputTokens / 1000) * modelPricing.input;
        const outputCost = (record.outputTokens / 1000) * modelPricing.output;
        const recordCost = inputCost + outputCost;

        costs.push({
          timestamp: record.createdAt.toISOString(),
          model: record.modelId,
          cost: recordCost,
          tokens: {
            input: record.inputTokens,
            output: record.outputTokens,
          },
          matched: true,
          usageRecordId: record.id,
        });

        totalCost += recordCost;
      }

      console.log(`[COST FETCH] Google Cloud total cost: $${totalCost.toFixed(4)}`);

      // Save the reconciliation data
      const { matched, updated } = await this.matchAndUpdateRecords('google', costs, startDate, endDate);

      return {
        provider: 'google',
        totalFetched: costs.length,
        totalCostUSD: totalCost,
        matched,
        unmatched: costs.length - matched,
        updated,
        costs,
      };

    } catch (error) {
      console.error('[COST FETCH] Google Cloud error:', error);
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

      // Skip matching if there are no costs to process
      if (costs.length === 0) {
        console.log(`[COST MATCH] No costs to match, skipping database queries`);
        return { matched: 0, updated: 0 };
      }

      // ALWAYS save cost data to database (main logic)
      console.log(`[COST MATCH] Found ${costs.length} ${provider} costs totaling $${costs.reduce((sum, c) => sum + c.cost, 0).toFixed(4)}`);
      console.log(`[COST MATCH] Starting database save process for ${provider}`);
      
      // First, ensure we have system user and debate for cost tracking
      let systemUserId: string;
      let systemDebateId: string;
      
      try {
        // Try to find or create system user
        let systemUser = await prisma.user.findFirst({
          where: { email: 'system@cost-reconciliation.internal' }
        });
        
        if (!systemUser) {
          systemUser = await prisma.user.create({
            data: {
              email: 'system@cost-reconciliation.internal',
              name: 'Cost Reconciliation System',
              isAdmin: true
            }
          });
          console.log(`[COST MATCH] Created system user: ${systemUser.id}`);
        } else {
          console.log(`[COST MATCH] Using existing system user: ${systemUser.id}`);
        }
        systemUserId = systemUser.id;
        
        // Try to find or create system debate
        let systemDebate = await prisma.debate.findFirst({
          where: { 
            topic: 'Cost Reconciliation Data',
            userId: systemUserId 
          }
        });
        
        if (!systemDebate) {
          systemDebate = await prisma.debate.create({
            data: {
              topic: 'Cost Reconciliation Data',
              description: 'System-generated debate for storing API cost reconciliation data',
              rounds: 1,
              status: 'completed',
              userId: systemUserId,
              completedAt: new Date()
            }
          });
          console.log(`[COST MATCH] Created system debate: ${systemDebate.id}`);
        } else {
          console.log(`[COST MATCH] Using existing system debate: ${systemDebate.id}`);
        }
        systemDebateId = systemDebate.id;
        
      } catch (systemSetupError) {
        console.error(`[COST MATCH] Failed to set up system records:`, systemSetupError);
        return { matched: 0, updated: 0 };
      }
      
      // Create records for cost data using existing schema 
      let created = 0;
      const costsToProcess = costs.slice(0, 20); // Increased limit
      
      console.log(`[COST MATCH] Attempting to create ${costsToProcess.length} records for ${provider}`);
      
      for (const cost of costsToProcess) {
        try {
          // First try with basic schema only (backward compatible)
          const record = await prisma.usageRecord.create({
            data: {
              userId: systemUserId,
              debateId: systemDebateId,
              roundNumber: 0, // Special marker for cost reconciliation data
              modelId: cost.model,
              modelProvider: provider,
              inputTokens: cost.tokens.input,
              outputTokens: cost.tokens.output,
              apiCost: cost.cost, // Store real API cost here
              platformFee: 0,
              totalCost: cost.cost,
              createdAt: new Date(cost.timestamp),
            },
          });
          console.log(`[COST MATCH] ✅ Created record ${record.id} for ${cost.model}: $${cost.cost.toFixed(4)}`);
          created++;
        } catch (createError: any) {
          if (createError.code === 'P2022') {
            console.log(`[COST MATCH] Database schema mismatch for ${cost.model}, this should not happen with basic fields`);
            console.error(`[COST MATCH] Schema error details:`, {
              code: createError.code,
              message: createError.message?.substring(0, 200)
            });
          } else {
            console.error(`[COST MATCH] ❌ Failed to create record for ${cost.model}:`, createError);
            console.error(`[COST MATCH] Error details:`, {
              code: createError.code,
              message: createError.message?.substring(0, 200) // Truncate long messages
            });
          }
        }
      }
      
      console.log(`[COST MATCH] 🎯 Successfully created ${created}/${costsToProcess.length} summary records for ${provider} costs`);
      return { matched: created, updated: 0 };
      
    } catch (error) {
      console.error(`[COST MATCH] Error saving ${provider} costs to database:`, error);
      return { matched: 0, updated: 0 };
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
  async fetchAllProviderCosts(startDate: Date, endDate: Date, force = false): Promise<CostReconciliationResult[]> {
    const results: CostReconciliationResult[] = [];

    try {
      // Fetch OpenAI costs
      const openaiResult = await this.fetchOpenAICosts(startDate, endDate, force);
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
      const anthropicResult = await this.fetchAnthropicCosts(startDate, endDate, force);
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

    try {
      // Fetch Google Cloud costs
      const googleResult = await this.fetchGoogleCosts(startDate, endDate, force);
      results.push(googleResult);
    } catch (error) {
      console.error('[COST FETCH] Google Cloud fetch failed:', error);
      results.push({
        provider: 'google',
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