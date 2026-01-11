const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { Orchestrator } = require('../lib/orchestrator');
const { DebateLogger } = require('../lib/logger');
const { calculateDebateCost } = require('../lib/pricing');
const { trackUsage } = require('../lib/usage-tracking');
const sentryModule = require('../lib/sentry');

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to safely encode JSON for SSE with chunking for large messages
function safeSSEEncode(data, isStreamingUpdate = false) {
  try {
    console.log(`Encoding SSE data of type: ${data.type}, streaming: ${isStreamingUpdate}`);

    // Chunk size for extreme cases only (we have keepalive now, so timeout isn't the issue)
    // HTTP/2 will handle frame splitting automatically for most messages
    const MAX_CHUNK_SIZE = 150000; // 150KB - only chunk truly massive payloads

    // Clean the data object
    const cleanData = JSON.parse(JSON.stringify(data, (key, value) => {
      if (typeof value === 'string') {
        // Clean up control characters (JSON.stringify will handle quote escaping)
        return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      }
      return value;
    }));

    let jsonString = JSON.stringify(cleanData);

    // Extra safety: ensure no raw newlines that could break SSE format
    jsonString = jsonString.replace(/\n/g, '\\n').replace(/\r/g, '\\r');

    // If data is small enough, send as single message
    if (jsonString.length <= MAX_CHUNK_SIZE) {
      return [`data: ${jsonString}\n\n`];
    }

    // For large data, chunk it
    console.warn(`Large payload (${jsonString.length} chars), chunking into ${Math.ceil(jsonString.length / MAX_CHUNK_SIZE)} parts for HTTP/2 safety`);

    const chunks = [];
    const chunkId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const totalChunks = Math.ceil(jsonString.length / MAX_CHUNK_SIZE);

    // Send metadata first
    chunks.push(`data: ${JSON.stringify({
      type: 'chunk-start',
      chunkId,
      originalType: data.type,
      totalChunks
    }).replace(/\n/g, '\\n').replace(/\r/g, '\\r')}\n\n`);

    // Send data in chunks
    for (let i = 0; i < jsonString.length; i += MAX_CHUNK_SIZE) {
      const chunk = jsonString.slice(i, i + MAX_CHUNK_SIZE);
      const index = Math.floor(i / MAX_CHUNK_SIZE);
      chunks.push(`data: ${JSON.stringify({
        type: 'chunk-data',
        chunkId,
        index,
        data: chunk
      }).replace(/\n/g, '\\n').replace(/\r/g, '\\r')}\n\n`);
      console.log(`Prepared chunk ${index + 1}/${totalChunks} (${chunk.length} chars)`);
    }

    // Send completion marker
    chunks.push(`data: ${JSON.stringify({
      type: 'chunk-complete',
      chunkId
    }).replace(/\n/g, '\\n').replace(/\r/g, '\\r')}\n\n`);

    return chunks;

  } catch (error) {
    console.error('Failed to encode SSE data:', error);
    return [`data: ${JSON.stringify({ type: 'error', message: 'Encoding error' })}\n\n`];
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

  const { config, userId, debateId: existingDebateId } = req.body;
  const streamStartTime = Date.now();

  let streamClosed = false;

  // Handle stream errors
  res.on('error', (err) => {
    console.error('SSE stream error:', err);
    streamClosed = true;
  });

  res.on('close', () => {
    const duration = Date.now() - streamStartTime;
    console.log(`SSE stream closed by client after ${Math.round(duration / 1000)}s (${Math.round(duration / 60000)}m)`);
    streamClosed = true;
  });

  // Helper to safely write to stream with chunking support
  const safeWrite = (data, isStreamingUpdate = false) => {
    if (streamClosed) {
      console.warn('Attempted write to closed stream, skipping');
      return false;
    }
    try {
      const chunks = safeSSEEncode(data, isStreamingUpdate);
      for (const chunk of chunks) {
        if (streamClosed) {
          console.warn('Stream closed during chunk write');
          return false;
        }
        res.write(chunk);
      }
      return true;
    } catch (err) {
      console.error('Write error:', err);
      streamClosed = true;
      return false;
    }
  };

  if (!userId) {
    console.log('No userId provided in request - authentication required');
    safeWrite({
      type: 'error',
      data: {
        message: 'Authentication required. Please log in to start a debate.',
        error: 'UNAUTHENTICATED'
      }
    });
    return res.end();
  }

  let logger = null;
  let debateTimeout = null;
  let debate = null;
  let keepaliveInterval = null;

  try {
    logger = new DebateLogger();
    
    // Get user and check permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true }
    });

    if (!user) {
      console.log('User not found for userId:', userId);
      safeWrite({
        type: 'error',
        data: {
          message: 'User not found. Please log in again.',
          error: 'USER_NOT_FOUND'
        }
      });
      return res.end();
    }

    // Check email verification
    if (!user.isAdmin && !user.emailVerified) {
      safeWrite({
        type: 'error',
        data: {
          message: 'Please verify your email address before creating debates',
          error: 'EMAIL_NOT_VERIFIED',
          requiresEmailVerification: true
        }
      });
      return res.end();
    }

    // Check subscription and balance
    if (!user.isAdmin) {
      if (!user.subscription) {
        safeWrite({
          type: 'error',
          data: {
            message: 'No subscription found. Please sign up for a plan.',
            error: 'NO_SUBSCRIPTION'
          }
        });
        return res.end();
      }

      const estimatedCost = calculateDebateCost(config);

      if (user.subscription.currentBalance < estimatedCost) {
        safeWrite({
          type: 'error',
          data: {
            message: `Insufficient credits. Estimated cost: $${estimatedCost.toFixed(2)}, Available: $${user.subscription.currentBalance.toFixed(2)}`,
            error: 'INSUFFICIENT_CREDITS',
            estimatedCost,
            availableBalance: user.subscription.currentBalance
          }
        });
        return res.end();
      }
    }

    // Gather all models to save (regular + challenger if enabled)
    const modelsToSave = [...config.models];
    if (config.challenger?.enabled && config.challenger?.model) {
      const challengerAlreadyIncluded = modelsToSave.some(m => m.id === config.challenger.model.id);
      if (!challengerAlreadyIncluded) {
        modelsToSave.push({
          ...config.challenger.model,
          isChallenger: true
        });
      }
    }

    // Use existing debate if ID provided (from Vercel), otherwise create new
    if (existingDebateId) {
      console.log(`[Railway] Using existing debate from Vercel: ${existingDebateId}`);
      debate = await prisma.debate.update({
        where: { id: existingDebateId },
        data: {
          status: 'running'
        },
        include: { modelSelections: true }
      });
    } else {
      // Create debate in database (direct Railway call without Vercel)
      debate = await prisma.debate.create({
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
            create: modelsToSave.map(model => ({
              modelId: model.id,
              provider: model.provider,
              name: model.name || model.id,  // API model ID
              displayName: model.isChallenger
                ? `${model.displayName || model.name || model.id} (Challenger)`
                : (model.displayName || model.name || model.id)
            }))
          }
        },
        include: {
          modelSelections: true
        }
      });
    }

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
      safeWrite({
        type: 'error',
        data: { message: 'Debate timeout - the debate took too long to complete' }
      });
      res.end();
    }, config.rounds * 10 * 60 * 1000);

    console.log(`Starting debate ${debate.id} with ${config.rounds} rounds, style: ${config.style || 'not set'}`);

    // Set up keepalive to prevent stream timeout during long model API calls
    // Send SSE comment every 15 seconds to keep connection alive
    let keepaliveCount = 0;
    keepaliveInterval = setInterval(() => {
      if (!streamClosed) {
        try {
          keepaliveCount++;
          res.write(`: keepalive ${keepaliveCount}\n\n`);
          if (keepaliveCount % 4 === 0) { // Log every minute
            console.log(`[Keepalive] ${keepaliveCount} heartbeats sent (${keepaliveCount * 15}s elapsed)`);
          }
        } catch (err) {
          console.warn('Keepalive write failed, stream likely closed');
          clearInterval(keepaliveInterval);
        }
      } else {
        console.log(`[Keepalive] Stopped after ${keepaliveCount} heartbeats`);
        clearInterval(keepaliveInterval);
      }
    }, 15000);

    console.log('✓ Keepalive heartbeat enabled (15s interval)');

    // Use modelsToSave which already includes Challenger if enabled
    if (config.challenger?.enabled && config.challenger?.model) {
      console.log(`✓ Challenger model included: ${config.challenger.model.displayName || config.challenger.model.id}`);
    }

    // Initialize orchestrator with ONLY regular debate models (not Challenger)
    // Challenger runs separately via runChallengerStep after each round
    const orchestrator = new Orchestrator(config.models, config);

    // For ideation mode: extract requirements + generate rubric before Round 1
    if (config.style === 'ideation') {
      // Extract hard requirements from description (always do this for ideation)
      if (config.description) {
        try {
          console.log('[Ideation] Extracting hard requirements from description...');
          const requirements = await orchestrator.extractRequirements(config.topic, config.description);
          if (requirements) {
            console.log('[Ideation] Requirements extracted:', requirements.substring(0, 150) + '...');
          }
        } catch (error) {
          console.error('[Ideation] Failed to extract requirements:', error);
        }
      }

      // Generate rubric from success criteria (if provided)
      console.log('[Rubric Check] successCriteria:', config.successCriteria ? 'YES (' + config.successCriteria.substring(0, 50) + '...)' : 'NO');
      if (config.successCriteria) {
        try {
          console.log('[Ideation] Generating evaluation rubric from success criteria...');
          const rubric = await orchestrator.generateRubric(config.successCriteria, config.topic);
          if (rubric) {
            await prisma.debate.update({
              where: { id: debate.id },
              data: { rubric }
            });
            console.log('[Ideation] Rubric generated and saved:', rubric.substring(0, 100) + '...');
          } else {
            console.log('[Ideation] generateRubric returned null/empty');
          }
        } catch (error) {
          console.error('[Ideation] Failed to generate rubric:', error);
        }
      }

      // Assign roles to models for the ideation debate
      orchestrator.assignIdeationRoles();
    } else {
      console.log('[Pre-Round] Skipping ideation preprocessing - not ideation mode');
    }

    // Run debate rounds
    for (let i = 1; i <= config.rounds; i++) {
      console.log(`Starting round ${i}`);

      // Create round record first (responses will be added as models complete)
      const savedRound = await prisma.debateRound.create({
        data: {
          debateId: debate.id,
          roundNumber: i
        }
      });

      // Track responses as they arrive
      const roundResponses = [];

      // Run round with callback that streams each response immediately as models complete
      await orchestrator.runRound(
        i,
        config.topic,
        config.description,
        config.style === 'consensus-seeking',
        async (responseData) => {
          // Save response to database immediately
          const savedResponse = await prisma.modelResponse.create({
            data: {
              roundId: savedRound.id,
              modelId: responseData.modelId,
              modelProvider: responseData.provider || 'unknown',
              content: responseData.content,
              position: responseData.position,
              confidence: responseData.confidence,
              isHuman: false
            }
          });

          roundResponses.push(savedResponse);

          console.log(`[Round ${i}] Model ${responseData.modelId} completed, streaming immediately`);

          // Stream response immediately (natural keepalive)
          // If stream is closed, just log it - debate continues in background for polling
          const update = {
            type: 'response',
            data: {
              ...savedResponse,
              round: i
            }
          };

          if (!safeWrite(update, true)) {
            console.warn(`[Round ${i}] Stream closed, client disconnected - continuing debate in background`);
            // Don't throw - debate will complete and polling will pick up result
          }
        },
        config.style // Pass debate style for ideation mode
      );

      // All models completed, send round-complete
      const roundUpdate = {
        type: 'round-complete',
        data: {
          ...savedRound,
          responses: roundResponses,
          debateId: debate.id // Include debate ID for polling fallback
        }
      };
      if (!safeWrite(roundUpdate, true)) {
        console.warn(`[Round ${i}] Stream closed, client disconnected - continuing to next round`);
        // Don't return - continue debate for remaining rounds
      } else {
        console.log(`Completed round ${i} with ${roundResponses.length} responses`);
      }

      // === IRON-FORGED DEBATE: Generate Round Synthesis ===
      try {
        console.log(`[Round ${i}] Generating round synthesis...`);
        const roundSynthesis = await orchestrator.generateRoundSynthesis(i, roundResponses, config.topic);

        // Save synthesis to database (uses existing consensus field)
        await prisma.debateRound.update({
          where: { id: savedRound.id },
          data: { consensus: roundSynthesis }
        });

        const synthesisUpdate = {
          type: 'round-synthesis',
          data: {
            round: i,
            synthesis: roundSynthesis,
            debateId: debate.id
          }
        };
        safeWrite(synthesisUpdate, true);
        console.log(`[Round ${i}] Synthesis complete: ${roundSynthesis.substring(0, 100)}...`);
      } catch (error) {
        console.error(`[Round ${i}] Synthesis generation failed:`, error);
      }

      // === IRON-FORGED DEBATE: Run Challenger (if enabled and NOT final round) ===
      // Challenger stress-tests for the NEXT round, so skip after final round
      if (config.challenger?.enabled && config.challenger?.model && i < config.rounds) {
        try {
          console.log(`[Round ${i}] Running Challenger...`);
          const challengerResponse = await orchestrator.runChallengerStep(
            i,
            orchestrator.roundSyntheses[i] || 'No synthesis available',
            config.topic,
            config.challenger.model
          );

          if (challengerResponse) {
            // SAVE Challenger response to database
            const challengerModelId = config.challenger.model.id || config.challenger.model.modelId;
            await prisma.modelResponse.create({
              data: {
                roundId: savedRound.id,
                modelId: `challenger-${challengerModelId}`,
                modelProvider: config.challenger.model.provider || 'challenger',
                content: challengerResponse,
                position: 'challenger',
                confidence: 100,
                isHuman: false
              }
            });

            const challengerUpdate = {
              type: 'challenger-response',
              data: {
                round: i,
                modelId: `challenger-${challengerModelId}`,
                content: challengerResponse,
                debateId: debate.id
              }
            };
            safeWrite(challengerUpdate, true);
            console.log(`[Round ${i}] Challenger saved and sent: ${challengerResponse.substring(0, 100)}...`);
          }
        } catch (error) {
          console.error(`[Round ${i}] Challenger failed:`, error);
        }
      }
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
        // Extract model name from judge model object (frontend sends full model object)
        const judgeModelName = config.judge?.model?.name || config.judge?.model || 'claude-3-5-sonnet';
        console.log('[Debate] Judge model from config:', config.judge?.model);
        console.log('[Debate] Extracted judge model name:', judgeModelName);

        const judgeResult = await orchestrator.generateJudgeAnalysis(
          debate.id,
          judgeModelName,
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

        // Send judge analysis as separate event to reduce final payload size
        if (judgeAnalysis) {
          const judgeUpdate = {
            type: 'judge-analysis',
            data: {
              id: debate.id,
              judgeAnalysis,
              winnerId: judgeResult.winner?.id || judgeResult.winner,
              winnerName: judgeResult.winner?.name || judgeResult.winner,
              winnerType: judgeResult.winner?.type || 'model',
              victoryReason: judgeResult.winner?.reason
            }
          };
          if (!safeWrite(judgeUpdate)) {
            console.warn('Stream closed, could not send judge analysis - debate still saved to database');
            // Continue - judge analysis is already in database, polling will retrieve it
          } else {
            console.log('Sent judge analysis separately to reduce final payload');
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

    // Send final update (without judgeAnalysis which was sent separately)
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

    // Remove judgeAnalysis from final payload to reduce size (already sent separately)
    const { judgeAnalysis: _removedJudgeAnalysis, ...finalDebateWithoutJudge } = finalDebate;

    const finalUpdate = {
      type: 'debate-complete',
      data: {
        ...finalDebateWithoutJudge,
        message: 'Debate completed. Judge analysis sent separately.'
      }
    };
    if (!safeWrite(finalUpdate)) {
      console.warn('Stream closed, could not send final update - debate saved to database, polling will retrieve it');
      // Don't return - let finally block clean up properly
    } else {
      console.log('Debate completed successfully via stream');
    }

    console.log(`[DEBATE COMPLETE] ID: ${debate.id}, All data saved to database`);

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

    safeWrite({
      type: 'error',
      data: {
        message: error.message || 'An error occurred during the debate'
      }
    });
  } finally {
    logger?.endDebate();
    if (debateTimeout) clearTimeout(debateTimeout);
    if (keepaliveInterval) clearInterval(keepaliveInterval);
    res.end();
  }
});

// Start a pending debate (triggers processing)
router.post('/:id/start', async (req, res) => {
  const { id } = req.params;

  try {
    // Find the debate with all necessary relations
    const debate = await prisma.debate.findUnique({
      where: { id },
      include: {
        modelSelections: true,
        user: {
          include: { subscription: true }
        }
      }
    });

    if (!debate) {
      return res.status(404).json({ error: 'Debate not found' });
    }

    if (debate.status !== 'pending') {
      return res.status(400).json({
        error: `Cannot start debate with status '${debate.status}'. Only pending debates can be started.`
      });
    }

    // Update status to running
    await prisma.debate.update({
      where: { id },
      data: { status: 'running' }
    });

    console.log(`[Start] Debate ${id} status updated to running`);

    // Reconstruct config from saved debate data
    const config = {
      topic: debate.topic,
      description: debate.description,
      rounds: debate.rounds,
      format: debate.format || 'structured',
      style: debate.style || 'consensus-seeking',
      models: debate.modelSelections.map(ms => ({
        id: ms.modelId,
        provider: ms.provider,
        name: ms.name,
        displayName: ms.displayName
      })),
      judge: { enabled: true },
      successCriteria: debate.successCriteria || null
    };

    // Process debate in background (non-blocking)
    setImmediate(async () => {
      const logger = new DebateLogger();
      try {
        logger.startDebate(id, config);
        console.log(`[Start] Beginning background processing for debate ${id}`);

        const orchestrator = new Orchestrator(config.models, config);

        // Pre-round processing for ideation
        if (config.style === 'ideation') {
          if (config.description) {
            try {
              await orchestrator.extractRequirements(config.topic, config.description);
            } catch (e) {
              console.error('[Start] Requirements extraction failed:', e);
            }
          }
          if (config.successCriteria) {
            try {
              const rubric = await orchestrator.generateRubric(config.successCriteria, config.topic);
              if (rubric) {
                await prisma.debate.update({ where: { id }, data: { rubric } });
              }
            } catch (e) {
              console.error('[Start] Rubric generation failed:', e);
            }
          }
          orchestrator.assignIdeationRoles();
        }

        // Run debate rounds
        for (let i = 1; i <= config.rounds; i++) {
          console.log(`[Start] Running round ${i} for debate ${id}`);

          const savedRound = await prisma.debateRound.create({
            data: { debateId: id, roundNumber: i }
          });

          const roundResponses = [];

          await orchestrator.runRound(
            i,
            config.topic,
            config.description,
            config.style === 'consensus-seeking',
            async (responseData) => {
              const saved = await prisma.modelResponse.create({
                data: {
                  roundId: savedRound.id,
                  modelId: responseData.modelId,
                  modelProvider: responseData.provider || 'unknown',
                  content: responseData.content,
                  position: responseData.position,
                  confidence: responseData.confidence,
                  isHuman: false
                }
              });
              roundResponses.push(saved);
            },
            config.style
          );

          // Generate round synthesis
          try {
            const synthesis = await orchestrator.generateRoundSynthesis(i, roundResponses, config.topic);
            await prisma.debateRound.update({
              where: { id: savedRound.id },
              data: { consensus: synthesis }
            });
          } catch (e) {
            console.error(`[Start] Round ${i} synthesis failed:`, e);
          }
        }

        // Generate final synthesis
        let synthesis = null;
        try {
          synthesis = await orchestrator.generateSynthesis(id);
          await prisma.debate.update({ where: { id }, data: { finalSynthesis: synthesis } });
        } catch (e) {
          console.error('[Start] Final synthesis failed:', e);
        }

        // Generate judge analysis
        try {
          const judgeResult = await orchestrator.generateJudgeAnalysis(id, 'claude-3-5-sonnet', config.style === 'consensus-seeking');
          const updateData = { judgeAnalysis: judgeResult.analysis, status: 'completed' };
          if (judgeResult.winner) {
            updateData.winnerId = judgeResult.winner.id || judgeResult.winner;
            updateData.winnerName = judgeResult.winner.name || judgeResult.winner;
            updateData.winnerType = judgeResult.winner.type || 'model';
            updateData.victoryReason = judgeResult.winner.reason || 'Highest quality contributions';
          }
          await prisma.debate.update({ where: { id }, data: updateData });
        } catch (e) {
          console.error('[Start] Judge analysis failed:', e);
          await prisma.debate.update({ where: { id }, data: { status: 'completed' } });
        }

        console.log(`[Start] Debate ${id} completed successfully`);

      } catch (error) {
        console.error(`[Start] Debate ${id} failed:`, error);
        await prisma.debate.update({
          where: { id },
          data: { status: 'failed' }
        });
      } finally {
        logger.endDebate();
      }
    });

    // Return immediately - processing continues in background
    res.json({
      success: true,
      message: 'Debate started. Processing in background.',
      debateId: id
    });

  } catch (error) {
    console.error('[Start] Error starting debate:', error);
    res.status(500).json({ error: error.message });
  }
});

// Restart a failed debate
router.post('/:id/restart', async (req, res) => {
  const { id } = req.params;

  try {
    // Find the debate
    const debate = await prisma.debate.findUnique({
      where: { id },
      include: {
        debateRounds: true,
        modelSelections: true
      }
    });

    if (!debate) {
      return res.status(404).json({ error: 'Debate not found' });
    }

    if (debate.status !== 'failed') {
      return res.status(400).json({
        error: `Cannot restart debate with status '${debate.status}'. Only failed debates can be restarted.`
      });
    }

    // Delete existing rounds (they may be partial/corrupted)
    await prisma.debateRound.deleteMany({
      where: { debateId: id }
    });

    // Reset the debate status (only use fields that exist in production schema)
    const updatedDebate = await prisma.debate.update({
      where: { id },
      data: {
        status: 'pending',
        finalSynthesis: null,
        judgeAnalysis: null,
        winnerId: null,
        winnerName: null,
        winnerType: null,
        victoryReason: null
      },
      include: {
        modelSelections: true
      }
    });

    console.log(`[Restart] Debate ${id} reset to pending status`);

    res.json({
      success: true,
      message: 'Debate reset successfully. Ready to restart.',
      debate: updatedDebate
    });

  } catch (error) {
    console.error('[Restart] Error restarting debate:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;





