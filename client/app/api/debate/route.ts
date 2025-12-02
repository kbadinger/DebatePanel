import { NextRequest, NextResponse } from 'next/server';
import { ModelOrchestrator } from '@/lib/models/orchestrator';
import { Debate, DebateConfig, DebateStreamUpdate } from '@/types/debate';
import { PrismaClient } from '@prisma/client';
import { DebateLogger } from '@/lib/logger';
import { UsageTracker } from '@/lib/usage-tracking';
import { RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

const prisma = new PrismaClient();

// Background debate execution - runs after response is sent
async function executeDebateAsync(
  debateId: string,
  config: DebateConfig,
  userId: string | null
) {
  const logger = new DebateLogger();
  const orchestrator = new ModelOrchestrator(logger);

  try {
    // Set up usage tracking if user is authenticated
    if (userId) {
      const usageTracker = new UsageTracker(debateId, userId);
      orchestrator.setUsageTracker(usageTracker);
    }

    const debate: Debate = {
      id: debateId,
      config,
      rounds: [],
      currentRound: 0,
      status: 'running',
      createdAt: new Date(),
    };

    // Start logging
    logger.startDebate(
      debateId,
      config.topic,
      config.models.map((m: { displayName?: string; id: string }) => m.displayName || m.id)
    );

    // Update status to running
    await prisma.debate.update({
      where: { id: debateId },
      data: {
        status: 'running',
        startedAt: new Date(),
      }
    });

    console.log(`[Async] Starting debate ${debateId} with ${config.rounds} rounds`);

    for (let i = 1; i <= config.rounds; i++) {
      // Update current round in DB for polling
      await prisma.debate.update({
        where: { id: debateId },
        data: { currentRound: i }
      });

      console.log(`[Async] Beginning round ${i} of ${config.rounds}`);
      const round = await orchestrator.runDebateRound(config, i, debate.rounds, debateId);
      debate.rounds.push(round);

      // If interactive mode, wait for human input after first round
      if (config.isInteractive && i === 1 && userId) {
        await prisma.participant.create({
          data: {
            debateId: debateId,
            userId,
            role: 'participant'
          }
        });

        await prisma.debate.update({
          where: { id: debateId },
          data: { status: 'waiting-for-human' }
        });

        console.log(`[Async] Debate ${debateId} waiting for human input`);
        return; // Stop execution - human input will continue via separate endpoint
      }

      // Check for convergence
      if (round.consensus && config.convergenceThreshold && i >= Math.min(3, config.rounds)) {
        const agreeCount = round.responses.filter(r =>
          r.position === 'agree' || r.position === 'strongly-agree'
        ).length;
        const agreementRate = agreeCount / round.responses.length;

        if (agreementRate >= config.convergenceThreshold) {
          console.log(`[Async] Debate ${debateId} converged at round ${i}`);
          debate.status = 'converged';
          break;
        }
      }

      console.log(`[Async] Completed round ${i} of ${config.rounds}`);
    }

    // Generate final synthesis
    debate.status = debate.status === 'converged' ? 'converged' : 'completed';
    debate.completedAt = new Date();

    console.log(`[Async] Generating synthesis for debate ${debateId}`);

    // Generate judge analysis if 2+ rounds
    if (debate.rounds.length >= 2) {
      const judgeModel = config.judge?.model || {
        id: 'claude-3-5-sonnet',
        provider: 'anthropic' as const,
        name: 'claude-3-5-sonnet-20241022',
        displayName: 'Claude 3.5 Sonnet'
      };

      try {
        // Fetch full debate data for judge
        const fullDebateData = await prisma.debate.findUnique({
          where: { id: debateId },
          include: {
            debateRounds: {
              include: { responses: true },
              orderBy: { roundNumber: 'asc' }
            }
          }
        });

        if (fullDebateData) {
          const transformedRounds = fullDebateData.debateRounds.map(dbRound => ({
            roundNumber: dbRound.roundNumber,
            responses: dbRound.responses.map(dbResponse => ({
              modelId: dbResponse.modelId,
              round: dbRound.roundNumber,
              content: dbResponse.content,
              position: dbResponse.position as any,
              confidence: dbResponse.confidence,
              timestamp: dbResponse.createdAt,
              isHuman: dbResponse.isHuman,
              stance: dbResponse.position
            })),
            consensus: dbRound.consensus ?? undefined,
            keyDisagreements: dbRound.keyDisagreements,
          }));

          const judgeResult = await orchestrator.generateJudgeAnalysis(
            transformedRounds,
            config.topic,
            judgeModel,
            config.style === 'consensus-seeking',
            (config.analysisDepth || 'thorough') as 'practical' | 'thorough' | 'excellence'
          );

          debate.judgeAnalysis = judgeResult.analysis;

          // Store winner and scores
          if (judgeResult.winner) {
            await prisma.debate.update({
              where: { id: debateId },
              data: {
                winnerId: judgeResult.winner.id,
                winnerName: judgeResult.winner.name,
                winnerType: judgeResult.winner.type,
                victoryReason: judgeResult.winner.reason,
              }
            });
          }

          if (judgeResult.scores && judgeResult.scores.length > 0) {
            for (const score of judgeResult.scores) {
              await prisma.debateScore.upsert({
                where: {
                  debateId_participantId: {
                    debateId: debateId,
                    participantId: score.id,
                  }
                },
                update: {
                  participantName: score.name,
                  totalScore: score.score,
                },
                create: {
                  debateId: debateId,
                  participantId: score.id,
                  participantName: score.name,
                  participantType: 'model',
                  totalScore: score.score,
                }
              });
            }
          }
        }
      } catch (error) {
        console.error(`[Async] Failed to generate judge analysis:`, error);
        debate.judgeAnalysis = 'Failed to generate judge analysis';
      }
    }

    // Generate statistical synthesis
    debate.finalSynthesis = generateSynthesis(debate);

    // Log and update database
    logger.logFinalSynthesis(debate.finalSynthesis, debate.status);

    await prisma.debate.update({
      where: { id: debateId },
      data: {
        status: debate.status,
        completedAt: debate.completedAt,
        finalSynthesis: debate.finalSynthesis,
        judgeAnalysis: debate.judgeAnalysis,
      }
    });

    // Deduct credits if user is authenticated and not admin
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (user && !user.isAdmin) {
        const totalCost = await prisma.usageRecord.aggregate({
          where: { debateId: debateId },
          _sum: { totalCost: true },
        });

        const costToDeduct = totalCost._sum.totalCost || 0;

        if (costToDeduct > 0) {
          await prisma.subscription.update({
            where: { userId },
            data: {
              currentBalance: { decrement: costToDeduct },
            },
          });
          console.log(`[Async] Deducted ${costToDeduct} credits from user ${userId}`);
        }
      }
    }

    console.log(`[Async] Debate ${debateId} completed successfully`);

  } catch (error) {
    console.error(`[Async] Debate ${debateId} failed:`, error);
    logger.logError(error);

    // Update debate status to failed
    await prisma.debate.update({
      where: { id: debateId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    });
  } finally {
    logger.endDebate();
  }
}

// Helper function to safely encode JSON for SSE
function safeSSEEncode(data: any, isStreamingUpdate: boolean = false): string {
  try {
    // Log what we're trying to encode
    console.log(`Encoding SSE data of type: ${data.type}, streaming: ${isStreamingUpdate}`);
    
    // Different limits for streaming vs final completion
    const MAX_RESPONSE_LENGTH = isStreamingUpdate ? 8000 : 10000; // Streaming: 8KB, Final: 10KB (increased)
    const MAX_TOTAL_LENGTH = isStreamingUpdate ? 50000 : 100000; // Streaming: 50KB, Final: 100KB (increased)
    
    // Deep clone and truncate if needed
    const processedData = JSON.parse(JSON.stringify(data, (key, value) => {
      if (typeof value === 'string') {
        // Clean up control characters (JSON.stringify will handle quote escaping)
        let cleanValue = value
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control characters

        // Then truncate if too long (but only for streaming, not storage)
        if (cleanValue.length > MAX_RESPONSE_LENGTH && key === 'content') {
          const truncationMessage = isStreamingUpdate
            ? `... [Response continues - see full version in download]`
            : `... [Truncated for streaming - full response available after debate completes]`;
          console.warn(`Truncating large ${key} field from ${cleanValue.length} to ${MAX_RESPONSE_LENGTH} chars for ${isStreamingUpdate ? 'streaming update' : 'final completion'}`);
          return cleanValue.substring(0, MAX_RESPONSE_LENGTH) + truncationMessage;
        }
        return cleanValue;
      }
      return value;
    }));
    
    // First stringify to handle any special characters
    let jsonString = JSON.stringify(processedData);
    
    // If still too large, truncate the whole thing
    if (jsonString.length > MAX_TOTAL_LENGTH) {
      console.warn(`Total JSON too large (${jsonString.length} chars), sending summary only`);
      // Send a minimal version but DON'T truncate finalSynthesis or judgeAnalysis - user needs full results
      const minimalData = {
        type: data.type,
        data: {
          id: data.data?.id,
          status: data.data?.status || 'completed',
          message: 'Full debate data transmitted.',
          finalSynthesis: data.data?.finalSynthesis, // Keep full synthesis
          judgeAnalysis: data.data?.judgeAnalysis    // Keep full judge analysis
        }
      };
      jsonString = JSON.stringify(minimalData);
    }
    
    // Extra safety: ensure no raw newlines that could break SSE format
    jsonString = jsonString.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    
    return `data: ${jsonString}\n\n`;
  } catch (error) {
    console.error('Failed to encode SSE data:', error);
    // Return a safe error message
    return `data: ${JSON.stringify({ type: 'error', message: 'Encoding error' })}\n\n`;
  }
}

export async function POST(req: NextRequest) {
  // Apply rate limiting for debates
  const rateLimitResult = RATE_LIMITS.debate(req);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(
      rateLimitResult.limit,
      rateLimitResult.remaining,
      rateLimitResult.reset,
      'Too many debates requested. Please wait before starting another debate.'
    );
  }

  try {
    const { config } = await req.json();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;
    
    console.log('Received debate config:', JSON.stringify(config, null, 2));
    
    // Validate model count to prevent system overload
    const maxModels = 6; // Focused limit for optimal performance
    const maxPerProvider = 2; // Prevent rate limiting from single provider
    
    if (config.models && config.models.length > maxModels) {
      return new Response(JSON.stringify({
        error: `Too many models selected. Maximum allowed: ${maxModels}, selected: ${config.models.length}`,
        details: 'Focus on 4-6 diverse models for best performance. Too many models cause rate limiting, timeouts, and excessive costs.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check per-provider limits to prevent rate limiting
    if (config.models) {
      const providerCounts = config.models.reduce((acc: Record<string, number>, model: { provider: string }) => {
        acc[model.provider] = (acc[model.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const overLimitProviders = Object.entries(providerCounts)
        .filter(([_, count]) => (count as number) > maxPerProvider)
        .map(([provider, count]) => `${provider} (${count})`);
        
      if (overLimitProviders.length > 0) {
        return new Response(JSON.stringify({
          error: `Too many models from same provider(s): ${overLimitProviders.join(', ')}`,
          details: `Maximum ${maxPerProvider} models per provider to avoid rate limiting. Diversify across providers for better perspectives.`
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Check user's balance if authenticated
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true }
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      }

      // Check email verification (except for admin users)
      if (!user.isAdmin && !user.emailVerified) {
        return NextResponse.json({
          error: 'Please verify your email address before creating debates.',
          requiresEmailVerification: true
        }, { status: 403 });
      }

      // Skip balance check for admin users
      if (!user.isAdmin) {
        if (!user.subscription) {
          return NextResponse.json({
            error: 'No subscription found. Please sign up for a plan.'
          }, { status: 402 });
        }

        // Calculate estimated cost
        const { models, rounds = 3 } = config;
        const estimatedCost = models.reduce((total: number, model: { costInfo?: { estimatedCostPerResponse?: number } }) => {
          const costPerResponse = model.costInfo?.estimatedCostPerResponse || 0.50;
          return total + (costPerResponse * rounds);
        }, 0) * 1.3; // Add 30% platform fee

        if (user.subscription.currentBalance < estimatedCost) {
          return NextResponse.json({
            error: `Insufficient credits. Estimated cost: $${estimatedCost.toFixed(2)}, Available: $${user.subscription.currentBalance.toFixed(2)}`
          }, { status: 402 });
        }
      }
    }

    console.log('Creating debate in database...');

    // Create debate in database with pending status
    const dbDebate = await prisma.debate.create({
      data: {
        topic: config.topic,
        description: config.description,
        format: config.format,
        rounds: config.rounds,
        currentRound: 0,
        status: 'pending',
        style: config.style || 'consensus-seeking',
        analysisDepth: config.analysisDepth || 'standard',
        convergenceThreshold: config.convergenceThreshold,
        userId,
        isInteractive: config.isInteractive || false,
        modelSelections: {
          create: config.models.map((model: { id: string; provider: string; name: string; displayName?: string }) => ({
            modelId: model.id,
            provider: model.provider,
            name: model.name,
            displayName: model.displayName || model.name,
          }))
        }
      }
    });

    console.log('Created debate with ID:', dbDebate.id);

    // Fire async execution - don't await, returns immediately
    // This prevents network timeouts on long debates
    executeDebateAsync(dbDebate.id, config, userId).catch(err => {
      console.error('Background debate execution failed:', err);
    });

    // Return immediately with debate ID for polling
    return NextResponse.json({
      debateId: dbDebate.id,
      status: 'running',
      message: 'Debate started. Poll /api/debate/[id]/status for updates.'
    });
  } catch (error) {
    console.error('Debate API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to start debate', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const debateId = searchParams.get('debateId');
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  if (debateId) {
    const debate = await prisma.debate.findUnique({
      where: { id: debateId },
      include: {
        modelSelections: true,
        debateRounds: {
          include: {
            responses: true
          },
          orderBy: {
            roundNumber: 'asc'
          }
        }
      }
    });

    return Response.json(debate);
  }

  const whereClause = {
    ...(userId ? { userId } : {}),
    // Exclude cleared test debates
    NOT: {
      topic: {
        startsWith: '[Test Debate - Cleared]'
      }
    }
  };

  // Get total count for pagination metadata
  const total = await prisma.debate.count({ where: whereClause });

  const debates = await prisma.debate.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      topic: true,
      status: true,
      createdAt: true,
      rounds: true,
      modelSelections: {
        select: {
          modelId: true
        }
      }
    }
  });

  // Return with pagination metadata
  return Response.json({
    debates,
    total,
    hasMore: offset + debates.length < total,
    offset,
    limit
  });
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { debateId, debateIds } = body;

    // Support both single and bulk delete
    const idsToDelete = debateIds || [debateId];

    if (!idsToDelete || idsToDelete.length === 0) {
      return Response.json(
        { error: 'No debate IDs provided' },
        { status: 400 }
      );
    }

    console.log('[DELETE] Request to delete:', idsToDelete.length, 'debates');
    console.log('[DELETE] User ID from session:', session.user.id);

    // Verify user owns all debates before deleting
    const debates = await prisma.debate.findMany({
      where: {
        id: { in: idsToDelete },
        userId: session.user.id
      },
      select: { id: true, userId: true }
    });

    console.log('[DELETE] Found', debates.length, 'debates owned by user');

    if (debates.length !== idsToDelete.length) {
      // Check which debates exist but aren't owned by user
      const allDebates = await prisma.debate.findMany({
        where: { id: { in: idsToDelete } },
        select: { id: true, userId: true }
      });
      console.log('[DELETE] Total debates found:', allDebates.length);
      console.log('[DELETE] Debate ownership:', allDebates.map(d => ({ id: d.id, userId: d.userId })));

      return Response.json(
        { error: 'One or more debates not found or unauthorized' },
        { status: 403 }
      );
    }

    // Delete debates (cascade will handle related records)
    const result = await prisma.debate.deleteMany({
      where: {
        id: { in: idsToDelete },
        userId: session.user.id
      }
    });

    return Response.json({
      success: true,
      deletedCount: result.count
    });
  } catch (error) {
    console.error('Error deleting debate(s):', error);
    return Response.json(
      { error: 'Failed to delete debate(s)' },
      { status: 500 }
    );
  }
}

function extractKeyArguments(response: any): string[] {
  const content = response.content || '';
  const keyPoints: string[] = [];
  
  // Extract bullet points or key statements
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.match(/^[•\-\*]\s+/)) {
      keyPoints.push(line.replace(/^[•\-\*]\s+/, '').trim());
    }
  }
  
  // If no bullet points, extract first few substantive sentences
  if (keyPoints.length === 0) {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    keyPoints.push(...sentences.slice(0, 3).map((s: string) => s.trim()));
  }
  
  return keyPoints.slice(0, 3); // Return top 3 arguments
}

function generateSynthesis(debate: Debate): string {
  // Focus on FINAL ROUND for position determination
  const finalRound = debate.rounds[debate.rounds.length - 1];
  const finalResponses = finalRound.responses;
  
  // Separate valid responses from failed ones
  const validResponses = finalResponses.filter(r => 
    !r.content.includes('⚠️ Context limit exceeded') && 
    !r.content.includes('❌ Error:') &&
    !r.content.includes('❌ Complete failure')
  );
  
  const failedResponses = finalResponses.filter(r => 
    r.content.includes('⚠️ Context limit exceeded') || 
    r.content.includes('❌ Error:') ||
    r.content.includes('❌ Complete failure')
  );
  
  const positionCounts: Record<string, number> = {};
  const modelPositions: Record<string, string[]> = {};
  
  // Analyze only valid final round positions
  validResponses.forEach(response => {
    // Count positions
    positionCounts[response.position] = (positionCounts[response.position] || 0) + 1;
    
    // Track which models took which positions
    if (!modelPositions[response.position]) {
      modelPositions[response.position] = [];
    }
    modelPositions[response.position].push(response.modelId);
  });
  
  // Calculate percentages for final round (based on valid responses only)
  const totalValidResponses = validResponses.length;
  const totalFinalResponses = finalResponses.length;
  const positionPercentages = Object.entries(positionCounts)
    .map(([position, count]) => ({
      position,
      count,
      percentage: totalValidResponses > 0 ? Math.round((count / totalValidResponses) * 100) : 0,
      models: modelPositions[position]
    }))
    .sort((a, b) => b.count - a.count);
  
  // Determine final consensus (based on valid responses)
  const topPosition = positionPercentages[0];
  const hasConsensus = topPosition && totalValidResponses > 0 && topPosition.percentage >= 60;
  
  // Journey context (for reference only)
  const allResponses = debate.rounds?.flatMap(r => r.responses) || [];
  const initialRound = debate.rounds[0];
  const initialPositions = new Set(initialRound.responses.map(r => r.position));
  const keyPoints = debate.rounds
    .filter(r => r.consensus)
    .map(r => r.consensus)
    .filter(Boolean);
  
  // Extract key themes and arguments
  const modelArguments: Record<string, string[]> = {};
  debate.rounds.forEach(round => {
    round.responses.forEach(response => {
      if (!response.content.includes('❌') && !response.content.includes('⚠️')) {
        if (!modelArguments[response.modelId]) {
          modelArguments[response.modelId] = [];
        }
        // Extract first meaningful sentence or stance (full first line, no truncation)
        const lines = response.content.split('\n').filter(l => l.trim().length > 20);
        if (lines.length > 0) {
          modelArguments[response.modelId].push(lines[0]); // Keep full first line
        }
      }
    });
  });

  // Add judge's definitive answer if available
  const judgeConclusion = debate.judgeAnalysis ? `
## 🏆 THE ANSWER:
${debate.judgeAnalysis.split('\n').slice(0, 5).join('\n')}
` : '';

  return `## 📊 Debate Analysis: "${debate.config.topic}"

${debate.config.description ? `**Context:** ${debate.config.description}\n\n` : ''}${judgeConclusion}### 🎯 Final Positions (Round ${finalRound.roundNumber}):
${positionPercentages.map(p => 
  `• **${p.position.replace('-', ' ').toUpperCase()}**: ${p.percentage}% (${p.count}/${totalValidResponses} participating models)`
).join('\n')}
${failedResponses.length > 0 ? `\n⚠️ **${failedResponses.length} model${failedResponses.length > 1 ? 's' : ''} could not participate** due to context limits or errors` : ''}

### Final Consensus:
${hasConsensus && totalValidResponses > 0
  ? topPosition.position === 'neutral' 
    ? `⚠️ Models failed to reach a decisive position - ${topPosition.percentage}% remained undecided. The debate needs stronger positions.`
    : `The participating models reached a ${topPosition.percentage}% consensus on **"${topPosition.position.replace('-', ' ')}"** in the final round`
  : totalValidResponses === 0
    ? '❌ No models could complete the debate due to technical issues'
    : 'No clear consensus emerged - the participating models remain divided on this topic'}

### Final Model Positions:
${totalValidResponses > 0 
  ? positionPercentages.map(p => 
      `• **${p.position.replace('-', ' ')}**: ${p.models.join(', ')}`
    ).join('\n')
  : '• No valid positions due to technical failures'}
${failedResponses.length > 0 
  ? `\n• **Unable to participate**: ${failedResponses.map(r => r.modelId).join(', ')} (context/error limits)`
  : ''}

### Journey Summary:
• Started with ${initialPositions.size} different positions in Round 1
• Converged to ${Object.keys(positionCounts).length} positions by Round ${finalRound.roundNumber}
• ${debate.status === 'converged' ? `Debate converged early at ${Math.round((finalResponses.filter(r => r.position === topPosition.position).length / totalFinalResponses) * 100)}% agreement` : `Completed ${debate.rounds.length} of ${debate.config.rounds} rounds`}

### Confidence Evolution:
• Initial confidence: ${Math.round(initialRound.responses.reduce((sum, r) => sum + r.confidence, 0) / initialRound.responses.length)}%
• Final confidence: ${Math.round(finalResponses.reduce((sum, r) => sum + r.confidence, 0) / totalFinalResponses)}%

### Key Turning Points:
${keyPoints.length > 0 
  ? keyPoints.slice(-3).map((point, i) => `${i + 1}. ${point}`).join('\n')
  : 'The debate evolved gradually without dramatic shifts in consensus.'}

### 💭 Model Perspectives:
${Object.entries(modelArguments).slice(0, 3).map(([modelId, args]) => 
  `**${modelId}:** "${args[0] || 'No clear stance recorded'}..."`
).join('\n')}

---
*Analysis generated on ${new Date().toLocaleString()}*`;
}