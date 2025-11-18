const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Recovers debates that were interrupted by server restart
 * Marks them as failed so they can be retried by the user
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
        }
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

      // Mark as failed with helpful message
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

    console.log(`✅ Recovered ${runningDebates.length} interrupted debate(s)`);

  } catch (error) {
    console.error('❌ Error recovering pending debates:', error);
    // Don't throw - let the server start anyway
  }
}

module.exports = { recoverPendingDebates };
