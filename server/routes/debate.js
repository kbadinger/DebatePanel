const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { Orchestrator } = require('../lib/orchestrator');
const { DebateLogger } = require('../lib/logger');
const { calculateDebateCost } = require('../lib/pricing');
const { trackUsage } = require('../lib/usage-tracking');
const sentryModule = require('../lib/sentry');

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to safely encode JSON for SSE
function safeSSEEncode(data, isStreamingUpdate = false) {
  try {
    console.log(`Encoding SSE data of type: ${data.type}, streaming: ${isStreamingUpdate}`);
    
    // Different limits for streaming vs final completion
    const MAX_RESPONSE_LENGTH = isStreamingUpdate ? 8000 : 10000;
    const MAX_TOTAL_LENGTH = isStreamingUpdate ? 50000 : 100000;
    
    // Clean the data object
    const cleanData = JSON.parse(JSON.stringify(data, (key, value) => {
      if (typeof value === 'string') {
        // Clean up control characters (JSON.stringify will handle quote escaping)
        let cleanValue = value
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control characters

        // Then truncate if too long (but only for streaming, not storage)
        if (cleanValue.length > MAX_RESPONSE_LENGTH && key === 'content') {
          const truncationMessage = isStreamingUpdate
            ? `... [Response continues - see full version in download]`
            : `... [Truncated for streaming - full response available after debate completes]`;
          console.warn(`Truncating large ${key} field from ${cleanValue.length} to ${MAX_RESPONSE_LENGTH} chars`);
          return cleanValue.substring(0, MAX_RESPONSE_LENGTH) + truncationMessage;
        }
        return cleanValue;
      }
      return value;
    }));
    
    let jsonString = JSON.stringify(cleanData);
    
    // Check total size and send minimal version if necessary
    if (jsonString.length > MAX_TOTAL_LENGTH) {
      console.warn(`Total JSON too large (${jsonString.length} chars), sending minimal update with full synthesis`);
      // Send minimal data but preserve finalSynthesis and judgeAnalysis - users need complete results
      jsonString = JSON.stringify({
        type: data.type,
        data: {
          id: data.data?.id,
          status: data.data?.status || 'completed',
          message: 'Full debate data transmitted.',
          finalSynthesis: data.data?.finalSynthesis, // Keep full synthesis
          judgeAnalysis: data.data?.judgeAnalysis    // Keep full judge analysis
        }
      });
    }
    
    // Extra safety: ensure no raw newlines that could break SSE format
    jsonString = jsonString.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    
    return `data: ${jsonString}\n\n`;
  } catch (error) {
    console.error('Failed to encode SSE data:', error);
    return `data: ${JSON.stringify({ type: 'error', message: 'Encoding error' })}\n\n`;
  }
}

// Main debate endpoint
router.post('/', async (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable nginx buffering
  });

  const { config, userId } = req.body;
  
  if (!userId) {
    console.log('No userId provided in request - authentication required');
    res.write(safeSSEEncode({
      type: 'error',
      data: {
        message: 'Authentication required. Please log in to start a debate.',
        error: 'UNAUTHENTICATED'
      }
    }));
    return res.end();
  }

  let logger = null;
  let debateTimeout = null;

  try {
    logger = new DebateLogger();
    
    // Get user and check permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });

    if (!user) {
      console.log('User not found for userId:', userId);
      res.write(safeSSEEncode({
        type: 'error',
        data: {
          message: 'User not found. Please log in again.',
          error: 'USER_NOT_FOUND'
        }
      }));
      return res.end();
    }

    // Check email verification
    if (!user.isAdmin && !user.emailVerified) {
      res.write(safeSSEEncode({
        type: 'error',
        data: {
          message: 'Please verify your email address before creating debates',
          error: 'EMAIL_NOT_VERIFIED',
          requiresEmailVerification: true
        }
      }));
      return res.end();
    }

    // Check subscription and balance
    if (!user.isAdmin) {
      if (!user.subscription) {
        res.write(safeSSEEncode({
          type: 'error',
          data: {
            message: 'No subscription found. Please sign up for a plan.',
            error: 'NO_SUBSCRIPTION'
          }
        }));
        return res.end();
      }

      const estimatedCost = calculateDebateCost(config);
      
      if (user.subscription.currentBalance < estimatedCost) {
        res.write(safeSSEEncode({
          type: 'error',
          data: {
            message: `Insufficient credits. Estimated cost: $${estimatedCost.toFixed(2)}, Available: $${user.subscription.currentBalance.toFixed(2)}`,
            error: 'INSUFFICIENT_CREDITS',
            estimatedCost,
            availableBalance: user.subscription.currentBalance
          }
        }));
        return res.end();
      }
    }

    // Create debate in database
    const debate = await prisma.debate.create({
      data: {
        userId: user.id,
        topic: config.topic,
        description: config.description,
        rounds: config.rounds || 3,
        format: config.format || 'structured',
        convergenceThreshold: config.convergenceThreshold || null,
        isInteractive: config.includeHuman || false,
        status: 'running',
        modelSelections: {
          create: config.models.map(model => ({
            modelId: model.id,
            provider: model.provider,
            name: model.displayName || model.name || model.id
          }))
        }
      },
      include: {
        modelSelections: true
      }
    });

    // Store the full config for use in the orchestrator
    const fullDebateConfig = {
      ...config,
      debateId: debate.id,
      userId: user.id
    };
    
    logger.startDebate(debate.id, config);

    // Set up debate timeout (10 minutes per round)
    debateTimeout = setTimeout(() => {
      console.error('Debate timeout - taking too long');
      res.write(safeSSEEncode({
        type: 'error',
        data: { message: 'Debate timeout - the debate took too long to complete' }
      }));
      res.end();
    }, config.rounds * 10 * 60 * 1000);

    console.log(`Starting debate ${debate.id} with ${config.rounds} rounds`);

    // Initialize orchestrator
    const orchestrator = new Orchestrator(config.models);

    // Run debate rounds
    for (let i = 1; i <= config.rounds; i++) {
      console.log(`Starting round ${i}`);
      
      const roundData = await orchestrator.runRound(
        i,
        config.topic,
        config.description,
        config.style === 'consensus-seeking'
      );

      // Save round to database
      const savedRound = await prisma.debateRound.create({
        data: {
          debateId: debate.id,
          roundNumber: i,
          responses: {
            create: roundData.responses.map(response => {
              // Find the model's provider from the config
              const model = config.models.find(m => m.id === response.modelId);
              return {
                modelId: response.modelId,
                modelProvider: model?.provider || response.provider || 'unknown',
                content: response.content,
                position: response.position,
                confidence: response.confidence,
                isHuman: false
              };
            })
          }
        },
        include: {
          responses: true
        }
      });

      // Stream each response
      for (const response of savedRound.responses) {
        const update = {
          type: 'response',
          data: {
            ...response,
            round: i
          }
        };
        res.write(safeSSEEncode(update, true));
        console.log(`Streamed response from ${response.modelId}`);
      }

      // Stream round completion
      const roundUpdate = {
        type: 'round-complete',
        data: savedRound
      };
      res.write(safeSSEEncode(roundUpdate, true));
      console.log(`Completed round ${i}`);
    }

    // Clear timeout
    clearTimeout(debateTimeout);

    // Generate synthesis
    let synthesis = null;
    try {
      synthesis = await orchestrator.generateSynthesis(debate.id);
      await prisma.debate.update({
        where: { id: debate.id },
        data: { finalSynthesis: synthesis }
      });
    } catch (error) {
      console.error('Failed to generate synthesis:', error);
      synthesis = 'Unable to generate synthesis due to an error.';
    }

    // Generate judge analysis
    let judgeAnalysis = null;
    if (config.judge?.enabled !== false) {
      try {
        const judgeResult = await orchestrator.generateJudgeAnalysis(
          debate.id,
          config.judge?.model || 'claude-3-5-sonnet',
          config.style === 'consensus-seeking'
        );
        
        judgeAnalysis = judgeResult.analysis;
        
        // Store winner info using proper schema fields
        const updateData = {
          judgeAnalysis,
          status: 'completed'
        };

        if (judgeResult.winner) {
          updateData.winnerId = judgeResult.winner.id || judgeResult.winner;
          updateData.winnerName = judgeResult.winner.name || judgeResult.winner;
          updateData.winnerType = judgeResult.winner.type || 'model';
          updateData.victoryReason = judgeResult.winner.reason || 'Highest quality contributions';
        }

        await prisma.debate.update({
          where: { id: debate.id },
          data: updateData
        });

        // Store scores in DebateScore table if available
        if (judgeResult.scores && typeof judgeResult.scores === 'object') {
          for (const [participantId, score] of Object.entries(judgeResult.scores)) {
            await prisma.debateScore.upsert({
              where: {
                debateId_participantId: {
                  debateId: debate.id,
                  participantId: participantId
                }
              },
              update: {
                totalScore: score,
                argumentQuality: score * 0.9,
                persuasiveness: score * 0.85
              },
              create: {
                debateId: debate.id,
                participantId: participantId,
                participantName: participantId,
                participantType: 'model',
                totalScore: score,
                argumentQuality: score * 0.9,
                persuasiveness: score * 0.85
              }
            });
          }
        }
      } catch (error) {
        console.error('Failed to generate judge analysis:', error);
      }
    }

    // Track usage
    if (!user.isAdmin) {
      await trackUsage(user.id, debate.id, config);
    }

    // Send final update
    const finalDebate = await prisma.debate.findUnique({
      where: { id: debate.id },
      include: {
        debateRounds: {
          include: { responses: true },
          orderBy: { roundNumber: 'asc' }
        },
        modelSelections: true
      }
    });

    const finalUpdate = {
      type: 'debate-complete',
      data: finalDebate
    };
    res.write(safeSSEEncode(finalUpdate));
    console.log('Debate completed successfully');

  } catch (error) {
    console.error('Debate error:', error);
    logger?.logError(error);

    // Capture error in Sentry with debate context (if Sentry is enabled)
    if (sentryModule.isSentryEnabled) {
      sentryModule.Sentry.captureException(error, {
        tags: {
          debateId: debate?.id,
          userId: userId
        },
        contexts: {
          debate: {
            topic: config?.topic,
            rounds: config?.rounds,
            models: config?.models?.map(m => m.id).join(', ')
          }
        }
      });
    }

    res.write(safeSSEEncode({
      type: 'error',
      data: {
        message: error.message || 'An error occurred during the debate'
      }
    }));
  } finally {
    logger?.endDebate();
    if (debateTimeout) clearTimeout(debateTimeout);
    res.end();
  }
});

module.exports = router;





