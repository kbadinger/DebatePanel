import { NextRequest } from 'next/server';
import { ModelOrchestrator } from '@/lib/models/orchestrator';
import { Debate, DebateStreamUpdate } from '@/types/debate';
import { PrismaClient } from '@prisma/client';
import { DebateLogger } from '@/lib/logger';
import { UsageTracker } from '@/lib/usage-tracking';
import { RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit';
import { authenticateMcpRequest, hasPermission, createMcpErrorResponse, logMcpRequest } from '@/lib/mcp-auth';

const prisma = new PrismaClient();

// Helper function to safely encode JSON for SSE (reused from main debate endpoint)
function safeSSEEncode(data: any, isStreamingUpdate: boolean = false): string {
  try {
    const MAX_RESPONSE_LENGTH = isStreamingUpdate ? 8000 : 10000;
    const MAX_TOTAL_LENGTH = isStreamingUpdate ? 50000 : 100000;
    
    const processedData = JSON.parse(JSON.stringify(data, (key, value) => {
      if (typeof value === 'string') {
        let cleanValue = value
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"');
        
        if (cleanValue.length > MAX_RESPONSE_LENGTH && key === 'content') {
          const truncationMessage = isStreamingUpdate 
            ? `... [Response continues - see full version in download]`
            : `... [Truncated for streaming - full response available after debate completes]`;
          return cleanValue.substring(0, MAX_RESPONSE_LENGTH) + truncationMessage;
        }
        return cleanValue;
      }
      return value;
    }));
    
    let jsonString = JSON.stringify(processedData);
    
    if (jsonString.length > MAX_TOTAL_LENGTH) {
      const minimalData = {
        type: data.type,
        data: {
          id: data.data?.id,
          status: data.data?.status || 'completed',
          message: 'Full debate data too large for transmission. Please check the debate history.',
          finalSynthesis: data.data?.finalSynthesis?.substring(0, 5000),
          judgeAnalysis: data.data?.judgeAnalysis?.substring(0, 5000)
        }
      };
      jsonString = JSON.stringify(minimalData);
    }
    
    jsonString = jsonString.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    return `data: ${jsonString}\n\n`;
  } catch (error) {
    console.error('Failed to encode SSE data:', error);
    return `data: ${JSON.stringify({ type: 'error', message: 'Encoding error' })}\n\n`;
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let authResult;
  
  try {
    // Apply MCP-specific rate limiting for debate creation
    const rateLimitResult = RATE_LIMITS.mcpDebate(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(
        rateLimitResult.limit,
        rateLimitResult.remaining,
        rateLimitResult.reset,
        'Too many MCP debate requests. Please wait before starting another debate.'
      );
    }

    // Authenticate MCP request
    authResult = await authenticateMcpRequest(req);
    if (!authResult.success) {
      await logMcpRequest('unknown', 'unknown', '/api/mcp/debate', 'POST', false, authResult.error);
      return createMcpErrorResponse(authResult.error || 'Authentication failed', 401);
    }

    // Check permissions
    if (!hasPermission(authResult.apiKey!, 'debate_create')) {
      await logMcpRequest(authResult.user!.id, authResult.apiKey!.id, '/api/mcp/debate', 'POST', false, 'Insufficient permissions');
      return createMcpErrorResponse('Permission denied: debate_create required', 403);
    }

    const { config } = await req.json();
    const userId = authResult.user!.id;
    
    console.log('MCP Debate request:', JSON.stringify(config, null, 2));
    
    // Validate model count to prevent system overload (same limits as web interface)
    const maxModels = 6;
    const maxPerProvider = 2;
    
    if (config.models && config.models.length > maxModels) {
      await logMcpRequest(userId, authResult.apiKey!.id, '/api/mcp/debate', 'POST', false, 'Too many models');
      return createMcpErrorResponse(`Too many models selected. Maximum ${maxModels} allowed.`, 400);
    }

    // Check for provider concentration
    const providerCounts = config.models.reduce((acc: any, model: any) => {
      acc[model.provider] = (acc[model.provider] || 0) + 1;
      return acc;
    }, {});

    const overLimitProviders = Object.entries(providerCounts)
      .filter(([provider, count]) => (count as number) > maxPerProvider)
      .map(([provider]) => provider);

    if (overLimitProviders.length > 0) {
      await logMcpRequest(userId, authResult.apiKey!.id, '/api/mcp/debate', 'POST', false, 'Provider concentration limit');
      return createMcpErrorResponse(
        `Too many models from providers: ${overLimitProviders.join(', ')}. Maximum ${maxPerProvider} per provider.`,
        400
      );
    }

    // Check subscription and credit balance (same as web interface)
    if (!authResult.user!.isAdmin) {
      const subscription = await prisma.subscription.findUnique({
        where: { userId }
      });

      if (!subscription) {
        await logMcpRequest(userId, authResult.apiKey!.id, '/api/mcp/debate', 'POST', false, 'No subscription');
        return createMcpErrorResponse('No subscription found. Please set up a subscription first.', 402);
      }

      const estimatedCost = (config.models?.length || 1) * (config.rounds || 3) * 0.10;
      
      if (subscription.currentBalance < estimatedCost) {
        await logMcpRequest(userId, authResult.apiKey!.id, '/api/mcp/debate', 'POST', false, 'Insufficient credits');
        return createMcpErrorResponse(
          `Insufficient credits. Need $${estimatedCost.toFixed(2)}, have $${subscription.currentBalance.toFixed(2)}.`,
          402
        );
      }
    }

    // Initialize orchestrator and start debate
    const orchestrator = new ModelOrchestrator();
    
    // Create debate record
    const debate: Debate = {
      id: `debate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      topic: config.topic,
      description: config.description || '',
      participants: config.models.map((model: any, index: number) => ({
        id: `participant-${index}`,
        name: model.displayName || model.modelId,
        modelId: model.modelId,
        provider: model.provider,
        role: model.role || 'participant',
        isHuman: false
      })),
      rounds: [],
      status: 'in_progress',
      createdAt: new Date(),
      config: {
        ...config,
        participationMode: 'observer' // MCP requests are always observer mode
      }
    };

    // Store debate in database
    const dbDebate = await prisma.debate.create({
      data: {
        id: debate.id,
        topic: debate.topic,
        description: debate.description,
        status: debate.status,
        userId: userId,
        participants: JSON.stringify(debate.participants),
        rounds: JSON.stringify([]),
        config: JSON.stringify(debate.config),
        createdAt: debate.createdAt
      }
    });

    // Set up Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const sendUpdate = (update: DebateStreamUpdate) => {
          const encoded = safeSSEEncode(update, true);
          controller.enqueue(encoder.encode(encoded));
        };

        // Start the debate
        orchestrator.startDebate(debate, sendUpdate)
          .then(async (finalDebate) => {
            try {
              // Save final debate state
              await prisma.debate.update({
                where: { id: debate.id },
                data: {
                  status: finalDebate.status,
                  rounds: JSON.stringify(finalDebate.rounds),
                  finalSynthesis: finalDebate.finalSynthesis,
                  judgeAnalysis: finalDebate.judgeAnalysis,
                  winner: finalDebate.winner || null,
                  completedAt: new Date()
                }
              });

              // Track usage and costs
              if (!authResult.user!.isAdmin) {
                const usageTracker = new UsageTracker();
                await usageTracker.recordDebateUsage(userId, finalDebate);
              }

              // Send completion
              const completionUpdate: DebateStreamUpdate = {
                type: 'debate_complete',
                data: finalDebate
              };
              
              const encoded = safeSSEEncode(completionUpdate, false);
              controller.enqueue(encoder.encode(encoded));
              controller.close();

              // Log successful completion
              await logMcpRequest(userId, authResult.apiKey!.id, '/api/mcp/debate', 'POST', true);
              
              console.log(`MCP debate completed successfully: ${debate.id}`);
            } catch (error) {
              console.error('Error finalizing MCP debate:', error);
              const errorUpdate: DebateStreamUpdate = {
                type: 'error',
                data: { message: 'Failed to finalize debate' }
              };
              controller.enqueue(encoder.encode(safeSSEEncode(errorUpdate)));
              controller.close();
              
              await logMcpRequest(userId, authResult.apiKey!.id, '/api/mcp/debate', 'POST', false, 'Finalization error');
            }
          })
          .catch(async (error) => {
            console.error('MCP debate orchestration error:', error);
            const errorUpdate: DebateStreamUpdate = {
              type: 'error',
              data: { message: error.message || 'Debate failed' }
            };
            controller.enqueue(encoder.encode(safeSSEEncode(errorUpdate)));
            controller.close();
            
            await logMcpRequest(userId, authResult.apiKey!.id, '/api/mcp/debate', 'POST', false, error.message);
          });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-MCP-API-Key',
        'X-MCP-Debate-ID': debate.id
      }
    });

  } catch (error) {
    console.error('MCP debate error:', error);
    
    if (authResult?.success) {
      await logMcpRequest(
        authResult.user!.id, 
        authResult.apiKey!.id, 
        '/api/mcp/debate', 
        'POST', 
        false, 
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
    
    return createMcpErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

// GET endpoint to retrieve debate status/results
export async function GET(req: NextRequest) {
  try {
    // Apply general MCP rate limiting
    const rateLimitResult = RATE_LIMITS.mcp(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(
        rateLimitResult.limit,
        rateLimitResult.remaining,
        rateLimitResult.reset,
        'Too many MCP requests'
      );
    }

    // Authenticate MCP request
    const authResult = await authenticateMcpRequest(req);
    if (!authResult.success) {
      return createMcpErrorResponse(authResult.error || 'Authentication failed', 401);
    }

    // Check read permission
    if (!hasPermission(authResult.apiKey!, 'read')) {
      return createMcpErrorResponse('Permission denied: read access required', 403);
    }

    const url = new URL(req.url);
    const debateId = url.searchParams.get('id');
    
    if (!debateId) {
      return createMcpErrorResponse('Debate ID is required', 400);
    }

    // Fetch debate (only user's own debates unless admin)
    const whereClause = authResult.user!.isAdmin 
      ? { id: debateId }
      : { id: debateId, userId: authResult.user!.id };
    
    const debate = await prisma.debate.findUnique({
      where: whereClause
    });

    if (!debate) {
      return createMcpErrorResponse('Debate not found', 404);
    }

    // Parse JSON fields
    const debateData = {
      ...debate,
      participants: JSON.parse(debate.participants as string),
      rounds: JSON.parse(debate.rounds as string),
      config: JSON.parse(debate.config as string)
    };

    await logMcpRequest(authResult.user!.id, authResult.apiKey!.id, '/api/mcp/debate', 'GET', true);

    return new Response(
      JSON.stringify({
        success: true,
        debate: debateData
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error fetching MCP debate:', error);
    return createMcpErrorResponse('Failed to fetch debate', 500);
  }
}