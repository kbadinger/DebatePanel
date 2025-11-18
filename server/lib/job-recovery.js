const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Recovers debates that were interrupted by server restart
 * - If all rounds completed: marks as completed with note
 * - If rounds incomplete: marks as failed with helpful message
 * Runs in background to avoid blocking server startup
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
        // All rounds completed - mark as completed without synthesis (too slow)
        try {
          await prisma.debate.update({
            where: { id: debate.id },
            data: {
              status: 'completed',
              finalSynthesis: `This debate completed all ${totalRounds} rounds successfully. ` +
                `The debate was interrupted during final processing, but all rounds and responses are preserved. ` +
                `Review the debate rounds above to see the full discussion.`,
              completedAt: new Date()
            }
          });

          console.log(`     ✅ Marked as completed - all rounds preserved`);

        } catch (error) {
          console.error(`     ❌ Failed to update debate:`, error);
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
