const { PrismaClient } = require('@prisma/client');
const { Orchestrator } = require('./orchestrator');
const prisma = new PrismaClient();

/**
 * Recovers debates that were interrupted by server restart
 * - If all rounds completed: generates synthesis and judge analysis
 * - If rounds incomplete: marks as failed with helpful message
 */
async function recoverPendingDebates() {
  console.log('🔄 Checking for interrupted debates...');

  try {
    // Find all debates that are still in "running" status
    const runningDebates = await prisma.debate.findMany({
      where: {
        status: 'running'
      },
      include: {
        user: true,
        debateRounds: {
          include: { responses: true },
          orderBy: { roundNumber: 'asc' }
        },
        modelSelections: true
      }
    });

    if (runningDebates.length === 0) {
      console.log('✅ No interrupted debates found');
      return;
    }

    console.log(`⚠️  Found ${runningDebates.length} interrupted debate(s)`);

    for (const debate of runningDebates) {
      const completedRounds = debate.debateRounds.length;
      const totalRounds = debate.rounds;

      console.log(`   - Debate ${debate.id}: ${completedRounds}/${totalRounds} rounds completed`);

      if (completedRounds === totalRounds && completedRounds > 0) {
        // All rounds completed - finish the debate properly
        try {
          console.log(`     🔧 Attempting to complete debate with synthesis and judge analysis...`);

          // Get model info from selections
          const models = debate.modelSelections.map(sel => ({
            id: sel.modelId,
            provider: sel.provider,
            name: sel.name
          }));

          const orchestrator = new Orchestrator(models);

          // Generate synthesis
          let synthesis = null;
          try {
            synthesis = await orchestrator.generateSynthesis(debate.id);
          } catch (error) {
            console.error(`     ⚠️  Synthesis generation failed:`, error.message);
            synthesis = 'Unable to generate synthesis due to recovery error. All debate rounds are preserved above.';
          }

          // Generate judge analysis (use default Claude model)
          let judgeAnalysis = null;
          let updateData = {
            status: 'completed',
            finalSynthesis: synthesis,
            completedAt: new Date()
          };

          try {
            const judgeResult = await orchestrator.generateJudgeAnalysis(
              debate.id,
              'claude-3-5-sonnet',
              false // default to adversarial for recovery
            );

            judgeAnalysis = judgeResult.analysis;
            updateData.judgeAnalysis = judgeAnalysis;

            if (judgeResult.winner) {
              updateData.winnerId = judgeResult.winner.id || judgeResult.winner;
              updateData.winnerName = judgeResult.winner.name || judgeResult.winner;
              updateData.winnerType = judgeResult.winner.type || 'model';
              updateData.victoryReason = judgeResult.winner.reason || 'Highest quality contributions';
            }

            // Store scores if available
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

            console.log(`     ✅ Judge analysis completed`);
          } catch (error) {
            console.error(`     ⚠️  Judge analysis failed:`, error.message);
            updateData.judgeAnalysis = 'Unable to generate judge analysis due to recovery error.';
          }

          // Update debate with all results
          await prisma.debate.update({
            where: { id: debate.id },
            data: updateData
          });

          console.log(`     ✅ Completed successfully - synthesis and judge analysis added`);

        } catch (error) {
          console.error(`     ❌ Failed to complete debate:`, error);
          // Fall back to marking as failed
          await prisma.debate.update({
            where: { id: debate.id },
            data: {
              status: 'failed',
              finalSynthesis: `This debate completed all ${totalRounds} rounds but failed to generate final analysis due to a server restart. ` +
                `All debate rounds are preserved. You can review the responses above.`,
              completedAt: new Date()
            }
          });
          console.log(`     ⚠️  Marked as failed (recovery attempt unsuccessful)`);
        }

      } else {
        // Rounds incomplete - mark as failed
        await prisma.debate.update({
          where: { id: debate.id },
          data: {
            status: 'failed',
            finalSynthesis: `This debate was interrupted during round ${completedRounds + 1} due to a server restart. ` +
              `${completedRounds} of ${totalRounds} rounds were completed. ` +
              `Please start a new debate to continue your discussion.`,
            completedAt: new Date()
          }
        });

        console.log(`     ✓ Marked as failed - ${completedRounds} rounds preserved`);
      }
    }

    console.log(`✅ Recovered ${runningDebates.length} interrupted debate(s)`);

  } catch (error) {
    console.error('❌ Error recovering pending debates:', error);
    // Don't throw - let the server start anyway
  }
}

module.exports = { recoverPendingDebates };
