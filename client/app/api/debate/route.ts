import { NextRequest } from 'next/server';
import { ModelOrchestrator } from '@/lib/models/orchestrator';
import { Debate, DebateStreamUpdate } from '@/types/debate';
import { PrismaClient } from '@prisma/client';
import { DebateLogger } from '@/lib/logger';
import { UsageTracker } from '@/lib/usage-tracking';
import { RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

const prisma = new PrismaClient();

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
        // First, clean up any problematic characters
        let cleanValue = value
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
          .replace(/\\/g, '\\\\') // Escape backslashes
          .replace(/"/g, '\\"'); // Escape quotes
        
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
      // Send a minimal version
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
    
    const encoder = new TextEncoder();
    let logger: DebateLogger | null = null;
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          logger = new DebateLogger();
          const orchestrator = new ModelOrchestrator(logger);
          
          console.log('Creating debate in database...');
          
          // Check user's balance if authenticated
          if (userId) {
            const user = await prisma.user.findUnique({
              where: { id: userId },
              include: { subscription: true }
            });
            
            if (!user) {
              controller.enqueue(encoder.encode(safeSSEEncode({
                type: 'error',
                error: 'User not found.'
              })));
              controller.close();
              return;
            }
            
            // Skip balance check for admin users
            if (!user.isAdmin) {
              if (!user.subscription) {
                controller.enqueue(encoder.encode(safeSSEEncode({
                  type: 'error',
                  error: 'No subscription found. Please sign up for a plan.'
                })));
                controller.close();
                return;
              }
              
              // Calculate estimated cost
              const { models, rounds = 3 } = config;
              const estimatedCost = models.reduce((total: number, model: { costInfo?: { estimatedCostPerResponse?: number } }) => {
                const costPerResponse = model.costInfo?.estimatedCostPerResponse || 0.50;
                return total + (costPerResponse * rounds);
              }, 0) * 1.3; // Add 30% platform fee
              
              if (user.subscription.currentBalance < estimatedCost) {
                controller.enqueue(encoder.encode(safeSSEEncode({
                  type: 'error',
                  error: `Insufficient credits. Estimated cost: $${estimatedCost.toFixed(2)}, Available: $${user.subscription.currentBalance.toFixed(2)}`
                })));
                controller.close();
                return;
              }
            }
          }
          
          // Create debate in database
          const dbDebate = await prisma.debate.create({
            data: {
              topic: config.topic,
              description: config.description,
              format: config.format,
              rounds: config.rounds,
              convergenceThreshold: config.convergenceThreshold,
              userId,
              isInteractive: config.isInteractive || false,
              modelSelections: {
                create: config.models.map((model: { id: string; provider: string; name: string }) => ({
                  modelId: model.id,
                  provider: model.provider,
                  name: model.name,
                }))
              }
            }
          });
          
          console.log('Created debate with ID:', dbDebate.id);
          
          // Set up usage tracking if user is authenticated
          if (userId) {
            const usageTracker = new UsageTracker(dbDebate.id, userId);
            orchestrator.setUsageTracker(usageTracker);
          }
      
      const debate: Debate = {
        id: dbDebate.id,
        config,
        rounds: [],
        status: 'active',
        createdAt: dbDebate.createdAt,
      };
      
      // Start logging
      logger.startDebate(
        dbDebate.id,
        config.topic,
        config.models.map((m: { displayName?: string; id: string }) => m.displayName || m.id)
      );
      
      try {
        // Add a global timeout for the entire debate (10 minutes per round for safety)
        const debateTimeout = setTimeout(() => {
          console.error('Debate timeout - taking too long');
          controller.enqueue(encoder.encode(safeSSEEncode({
            type: 'error',
            data: { message: 'Debate timeout - the debate took too long to complete' }
          })));
          controller.close();
        }, config.rounds * 10 * 60 * 1000); // Increased to 10 minutes per round
        
        console.log(`Starting debate with ${config.rounds} rounds`);
        for (let i = 1; i <= config.rounds; i++) {
          console.log(`Beginning round ${i} of ${config.rounds}`);
          const round = await orchestrator.runDebateRound(config, i, debate.rounds, dbDebate.id);
          debate.rounds.push(round);
          
          // Stream each response
          console.log(`Streaming ${round.responses.length} responses for round ${i}`);
          for (const response of round.responses) {
            console.log(`Streaming response from ${response.modelId}, content length: ${response.content?.length || 0}`);
            const update: DebateStreamUpdate = {
              type: 'response',
              data: response,
            };
            try {
              const encoded = safeSSEEncode(update, true);
              console.log(`Encoded response size: ${encoded.length} chars`);
              controller.enqueue(encoder.encode(encoded));
              console.log(`Successfully streamed response from ${response.modelId}`);
            } catch (streamError) {
              console.error(`Failed to stream response from ${response.modelId}:`, streamError);
            }
          }
          
          // Stream round completion
          console.log(`Streaming round ${i} completion`);
          const roundUpdate: DebateStreamUpdate = {
            type: 'round-complete',
            data: round,
          };
          try {
            const encoded = safeSSEEncode(roundUpdate, true);
            console.log(`Round completion encoded size: ${encoded.length} chars`);
            controller.enqueue(encoder.encode(encoded));
            console.log(`Successfully streamed round ${i} completion`);
          } catch (streamError) {
            console.error(`Failed to stream round ${i} completion:`, streamError);
          }
          
          // If interactive mode, wait for human input after first round
          if (config.isInteractive && i === 1 && userId) {
            // Add user as participant
            await prisma.participant.create({
              data: {
                debateId: dbDebate.id,
                userId,
                role: 'participant'
              }
            });
            
            // Signal that we're waiting for human input
            controller.enqueue(encoder.encode(safeSSEEncode({
              type: 'waiting-for-human',
              data: {}
            })));
            
            // Close this stream - human input will continue via separate endpoint
            debate.status = 'waiting-for-human';
            await prisma.debate.update({
              where: { id: dbDebate.id },
              data: { status: 'waiting-for-human' }
            });
            
            controller.close();
            return;
          }
          
          // Check for convergence (only for agree/strongly-agree positions, not neutral)
          // But always complete at least the minimum rounds for a decisive answer
          if (round.consensus && config.convergenceThreshold && i >= Math.min(3, config.rounds)) {
            const agreeCount = round.responses.filter(r => 
              r.position === 'agree' || r.position === 'strongly-agree'
            ).length;
            const agreementRate = agreeCount / round.responses.length;
            
            console.log(`Round ${i} convergence check:`, {
              agreeCount,
              totalResponses: round.responses.length,
              agreementRate,
              threshold: config.convergenceThreshold,
              willConverge: agreementRate >= config.convergenceThreshold,
              minRoundsReached: i >= Math.min(3, config.rounds)
            });
            
            // Only converge if models actually agree AND we've done enough rounds
            if (agreementRate >= config.convergenceThreshold) {
              console.log('Debate converged after sufficient rounds!');
              debate.status = 'converged';
              break;
            }
          }
          
          console.log(`Completed round ${i} of ${config.rounds}. Continuing: ${i < config.rounds}`);
        }
        
        // Clear the timeout since we're done
        clearTimeout(debateTimeout);
        
        // Generate final synthesis (even if some models failed)
        console.log('Marking debate as completed. Total rounds:', debate.rounds.length, 'Expected:', config.rounds);
        debate.status = 'completed';
        debate.completedAt = new Date();
        
        // Check if any models failed due to context limits
        const allResponses = debate.rounds.flatMap(r => r.responses);
        const contextFailures = allResponses.filter(r => 
          r.content.includes('⚠️ Context limit exceeded') || 
          r.content.includes('❌ Error:') ||
          r.content.includes('❌ Complete failure')
        );
        
        if (contextFailures.length > 0) {
          console.log(`Debate completed with ${contextFailures.length} model failures across all rounds`);
        }
        
        console.log('Generating synthesis for debate:', {
          id: debate.id,
          rounds: debate.rounds.length,
          totalResponses: debate.rounds.flatMap(r => r.responses).length
        });
        
        // Generate judge analysis FIRST if enabled (always run for decisive answer)
        console.log('Judge check:', {
          judgeEnabled: debate.config.judge?.enabled,
          judgeModel: debate.config.judge?.model,
          roundsLength: debate.rounds.length,
          willRunJudge: debate.config.judge?.enabled && debate.rounds.length >= 2
        });
        
        // Always run judge for completed debates with 2+ rounds to get a decisive answer
        if (debate.rounds.length >= 2) {
          const judgeModel = debate.config.judge?.model || {
            id: 'claude-3-5-sonnet',
            provider: 'anthropic' as const,
            name: 'claude-3-5-sonnet-20241022',
            displayName: 'Claude 3.5 Sonnet'
          };
          
          console.log('Generating judge analysis with:', judgeModel.displayName);
          
          try {
            // CRITICAL FIX: Get FULL responses from database for judge analysis
            // instead of using truncated in-memory data
            console.log('Fetching full debate responses from database for judge analysis');
            const fullDebateData = await prisma.debate.findUnique({
              where: { id: dbDebate.id },
              include: {
                debateRounds: {
                  include: {
                    responses: true
                  },
                  orderBy: { roundNumber: 'asc' }
                }
              }
            });
            
            if (!fullDebateData) {
              throw new Error('Could not fetch full debate data for judge analysis');
            }
            
            console.log(`Judge will analyze ${fullDebateData.debateRounds.length} rounds with full content`);
            
            const judgeResult = await orchestrator.generateJudgeAnalysis(
              fullDebateData.debateRounds, // Use full database content
              debate.config.topic,
              judgeModel,
              debate.config.style === 'consensus-seeking'
            );
            
            debate.judgeAnalysis = judgeResult.analysis;
            
            // Store winner information if available
            if (judgeResult.winner) {
              await prisma.debate.update({
                where: { id: dbDebate.id },
                data: {
                  winnerId: judgeResult.winner.id,
                  winnerName: judgeResult.winner.name,
                  winnerType: judgeResult.winner.type,
                  victoryReason: judgeResult.winner.reason,
                }
              });
              
              // Store debate winner in the debate object for streaming
              (debate as { winner?: typeof judgeResult.winner }).winner = judgeResult.winner;
            }
            
            // Store scores if available
            if (judgeResult.scores && judgeResult.scores.length > 0) {
              // Calculate and store scores in database
              for (const score of judgeResult.scores) {
                await prisma.debateScore.create({
                  data: {
                    debateId: dbDebate.id,
                    participantId: score.id,
                    participantName: score.name,
                    participantType: 'model', // TODO: Handle human participants
                    totalScore: score.score,
                    argumentQuality: score.score * 0.9, // Weighted scores
                    persuasiveness: score.score * 0.85,
                    evidenceScore: score.score * 0.8,
                    logicalScore: score.score * 0.95,
                    influenceScore: score.score * 0.7,
                  }
                });
              }
              
              // Add scores to debate object for streaming
              (debate as { scores?: typeof judgeResult.scores }).scores = judgeResult.scores;
            }
            
            console.log('Generated judge analysis with winner:', judgeResult.winner?.name);
          } catch (error) {
            console.error('Failed to generate judge analysis:', error);
            debate.judgeAnalysis = 'Failed to generate judge analysis';
          }
        }
        
        // Then generate the statistical synthesis
        try {
          debate.finalSynthesis = generateSynthesis(debate);
          console.log('Generated synthesis length:', debate.finalSynthesis?.length || 0);
          console.log('First 500 chars of synthesis:', debate.finalSynthesis?.substring(0, 500));
        } catch (synthError) {
          console.error('Failed to generate synthesis:', synthError);
          debate.finalSynthesis = '## Error generating synthesis\n\nAn error occurred while generating the debate synthesis.';
        }
        
        // Log final synthesis
        logger.logFinalSynthesis(debate.finalSynthesis, debate.status);
        
        // Update database
        await prisma.debate.update({
          where: { id: dbDebate.id },
          data: {
            status: debate.status,
            completedAt: debate.completedAt,
            finalSynthesis: debate.finalSynthesis,
            judgeAnalysis: debate.judgeAnalysis,
          }
        });
        
        // Deduct credits if user is authenticated and not admin
        if (userId) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
          });
          
          // Skip credit deduction for admin users
          if (user && !user.isAdmin) {
            const totalCost = await prisma.usageRecord.aggregate({
              where: { debateId: dbDebate.id },
              _sum: { totalCost: true },
            });
            
            const costToDeduct = totalCost._sum.totalCost || 0;
            
            if (costToDeduct > 0) {
              await prisma.subscription.update({
                where: { userId },
                data: {
                  currentBalance: {
                    decrement: costToDeduct,
                  },
                },
              });
              
              console.log(`Deducted ${costToDeduct} credits from user ${userId}`);
            }
          } else if (user?.isAdmin) {
            console.log(`Admin user ${userId} - skipping credit deduction`);
          }
        }
        
        // Stream final debate - ensure this always happens
        try {
          console.log('Streaming final debate update with:', {
            status: debate.status,
            hasSynthesis: !!debate.finalSynthesis,
            hasJudgeAnalysis: !!debate.judgeAnalysis,
            synthesisLength: debate.finalSynthesis?.length,
            rounds: debate.rounds.length
          });
          
          // Ensure we have at least some synthesis
          if (!debate.finalSynthesis) {
            debate.finalSynthesis = `## Debate Complete\n\nDebate completed with ${debate.rounds.length} rounds.`;
          }
          
          // For very large debates, send summary first then full data
          const totalSize = JSON.stringify(debate).length;
          console.log(`Total debate size: ${totalSize} bytes`);
          
          if (totalSize > 25000) {
            // Send a summary first
            console.log('Large debate detected, sending summary first');
            const summaryUpdate: DebateStreamUpdate = {
              type: 'debate-summary',
              data: {
                id: debate.id,
                status: debate.status,
                config: debate.config,
                finalSynthesis: debate.finalSynthesis,
                judgeAnalysis: debate.judgeAnalysis,
                winner: (debate as any).winner,
                roundCount: debate.rounds.length,
                message: 'Full debate data follows...'
              }
            };
            controller.enqueue(encoder.encode(safeSSEEncode(summaryUpdate))); // false = final completion (default)
          }
          
          const finalUpdate: DebateStreamUpdate = {
            type: 'debate-complete',
            data: debate,
          };
          controller.enqueue(encoder.encode(safeSSEEncode(finalUpdate))); // false = final completion (default)
          console.log('Final update streamed successfully');
        } catch (streamError) {
          console.error('Failed to stream final update:', streamError);
          // Try to send at least a completion signal
          const minimalUpdate: DebateStreamUpdate = {
            type: 'debate-complete',
            data: {
              ...debate,
              finalSynthesis: debate.finalSynthesis || 'Debate completed.',
            },
          };
          controller.enqueue(encoder.encode(safeSSEEncode(minimalUpdate)));
        }
        
        } catch (error) {
          console.error('Debate stream error:', error);
          logger?.logError(error);
          
          // Send error message to client
          const errorUpdate = {
            type: 'error',
            data: {
              message: error instanceof Error ? error.message : 'An error occurred during the debate',
              code: error instanceof Error && 'code' in error ? (error as Error & { code?: string }).code : 'UNKNOWN_ERROR'
            }
          };
          controller.enqueue(encoder.encode(safeSSEEncode(errorUpdate)));
        } finally {
          logger?.endDebate();
          controller.close();
        }
      } catch (error) {
        console.error('Stream initialization error:', error);
        // Controller might not be properly initialized, so we don't try to use it
      }
    },
  });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
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
  
  const debates = await prisma.debate.findMany({
    where: userId ? { userId } : {},
    orderBy: { createdAt: 'desc' },
    take: 20,
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
  
  return Response.json(debates);
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
    keyPoints.push(...sentences.slice(0, 3).map(s => s.trim()));
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
  const allResponses = debate.rounds.flatMap(r => r.responses);
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
        // Extract first meaningful sentence or stance
        const lines = response.content.split('\n').filter(l => l.trim().length > 20);
        if (lines.length > 0) {
          modelArguments[response.modelId].push(lines[0].substring(0, 200));
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