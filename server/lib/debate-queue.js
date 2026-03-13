const { PrismaClient } = require('@prisma/client');
const { Orchestrator } = require('./orchestrator');
const { calculateDebateCost } = require('./pricing');
const { trackUsage } = require('./usage-tracking');
const prisma = new PrismaClient();

/**
 * Queue for processing debates that need to be restarted
 */
class DebateQueue {
  constructor() {
    this.processing = false;
    this.queue = [];
  }

  /**
   * Add a debate to the restart queue
   */
  async enqueue(debateId) {
    console.log(`📥 Adding debate ${debateId} to restart queue`);
    this.queue.push(debateId);

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process the queue of debates to restart
   */
  async processQueue() {
    if (this.processing) {
      console.log('⏸️  Queue already processing');
      return;
    }

    this.processing = true;
    console.log(`🔄 Starting queue processing (${this.queue.length} debates)`);

    while (this.queue.length > 0) {
      const debateId = this.queue.shift();

      try {
        await this.restartDebate(debateId);
      } catch (error) {
        console.error(`❌ Failed to restart debate ${debateId}:`, error);
        // Mark as permanently failed
        await prisma.debate.update({
          where: { id: debateId },
          data: {
            status: 'failed',
            finalSynthesis: `Failed to restart debate after interruption: ${error.message}`
          }
        }).catch(err => console.error('Failed to mark debate as failed:', err));
      }

      // Small delay between debates to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.processing = false;
    console.log('✅ Queue processing completed');
  }

  /**
   * Restart a single debate from where it left off
   */
  async restartDebate(debateId) {
    console.log(`🔄 Restarting debate ${debateId}`);

    // Get debate with all data
    const debate = await prisma.debate.findUnique({
      where: { id: debateId },
      include: {
        user: true,
        debateRounds: {
          include: { responses: true },
          orderBy: { roundNumber: 'asc' }
        },
        modelSelections: true
      }
    });

    if (!debate) {
      console.error(`Debate ${debateId} not found`);
      return;
    }

    // Check if user still has credits (for non-admin users)
    if (!debate.user.isAdmin) {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: debate.user.id }
      });

      if (!subscription || subscription.currentBalance <= 0) {
        console.log(`❌ User has insufficient credits, marking debate as failed`);
        await prisma.debate.update({
          where: { id: debateId },
          data: {
            status: 'failed',
            finalSynthesis: 'Insufficient credits to complete debate after interruption.'
          }
        });
        return;
      }
    }

    const completedRounds = debate.debateRounds.length;
    const totalRounds = debate.rounds;

    console.log(`   Resuming from round ${completedRounds + 1} of ${totalRounds}`);

    // Get models from selections
    const models = debate.modelSelections.map(sel => ({
      id: sel.modelId,
      provider: sel.provider,
      name: sel.name
    }));

    const orchestrator = new Orchestrator(models);

    // Continue from where we left off
    for (let i = completedRounds + 1; i <= totalRounds; i++) {
      console.log(`   Round ${i}/${totalRounds}`);

      // Create round record
      const savedRound = await prisma.debateRound.create({
        data: {
          debateId: debate.id,
          roundNumber: i
        }
      });

      // Run round
      const roundResponses = [];
      await orchestrator.runRound(
        i,
        debate.topic,
        debate.description,
        debate.style === 'consensus-seeking',
        async (responseData) => {
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
        },
        debate.style // Pass style for ideation mode
      );

      console.log(`   ✓ Round ${i} completed with ${roundResponses.length} responses`);
    }

    // Generate synthesis and judge analysis
    console.log(`   Generating final analysis...`);

    let synthesis = null;
    try {
      synthesis = await orchestrator.generateSynthesis(debateId);
    } catch (error) {
      console.error('   ⚠️  Synthesis generation failed:', error.message);
      synthesis = 'Unable to generate synthesis. All debate rounds are preserved above.';
    }

    let updateData = {
      status: 'completed',
      finalSynthesis: synthesis,
      completedAt: new Date()
    };

    // Generate judge analysis if not disabled
    try {
      const judgeResult = await orchestrator.generateJudgeAnalysis(
        debateId,
        'claude-3-5-sonnet',
        debate.format === 'consensus-seeking'
      );

      updateData.judgeAnalysis = judgeResult.analysis;

      if (judgeResult.winner) {
        updateData.winnerId = judgeResult.winner.id || judgeResult.winner;
        updateData.winnerName = judgeResult.winner.name || judgeResult.winner;
        updateData.winnerType = judgeResult.winner.type || 'model';
        updateData.victoryReason = judgeResult.winner.reason || 'Highest quality contributions';
      }

      // Store scores
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
      console.error('   ⚠️  Judge analysis failed:', error.message);
      updateData.judgeAnalysis = 'Unable to generate judge analysis.';
    }

    // Update debate as completed
    await prisma.debate.update({
      where: { id: debateId },
      data: updateData
    });

    // Track usage (for non-admin users)
    if (!debate.user.isAdmin) {
      const config = {
        models,
        rounds: totalRounds,
        topic: debate.topic,
        description: debate.description
      };
      await trackUsage(debate.user.id, debateId, config);
    }

    console.log(`✅ Debate ${debateId} completed successfully`);
  }
}

// Export singleton instance
module.exports = new DebateQueue();
