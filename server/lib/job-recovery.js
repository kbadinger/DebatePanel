const { PrismaClient } = require('@prisma/client');
const debateQueue = require('./debate-queue');
const prisma = new PrismaClient();

/**
 * Recovers debates that were interrupted by server restart
 * - If all rounds completed: marks as completed with note
 * - If rounds incomplete: queues for automatic restart
 * Runs in background to avoid blocking server startup
 */
async function recoverPendingDebates() {
  console.log('🔄 Checking for interrupted debates...');

  try {
    // Find all debates that need recovery (running or failed with incomplete rounds)
    const interruptedDebates = await prisma.debate.findMany({
      where: {
        OR: [
          { status: 'running' },
          { status: 'failed' }
        ]
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

    if (interruptedDebates.length === 0) {
      console.log('✅ No interrupted debates found');
      return;
    }

    console.log(`⚠️  Found ${interruptedDebates.length} interrupted debate(s)`);

    let completedCount = 0;
    let queuedCount = 0;
    let skippedCount = 0;

    for (const debate of interruptedDebates) {
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
          completedCount++;

        } catch (error) {
          console.error(`     ❌ Failed to update debate:`, error);
        }

      } else if (completedRounds < totalRounds) {
        // Rounds incomplete - queue for restart
        try {
          // Update status to 'pending-restart' so we don't pick it up again
          await prisma.debate.update({
            where: { id: debate.id },
            data: {
              status: 'pending-restart',
              finalSynthesis: `This debate is being restarted automatically. ` +
                `${completedRounds} of ${totalRounds} rounds were completed before interruption. ` +
                `Resuming from round ${completedRounds + 1}...`
            }
          });

          // Add to restart queue
          await debateQueue.enqueue(debate.id);

          console.log(`     🔄 Queued for restart - will resume from round ${completedRounds + 1}`);
          queuedCount++;

        } catch (error) {
          console.error(`     ❌ Failed to queue debate:`, error);
        }
      } else {
        // Edge case: rounds > totalRounds or completedRounds = 0
        console.log(`     ⚠️  Skipped - unusual state (${completedRounds}/${totalRounds})`);
        skippedCount++;
      }
    }

    console.log(`✅ Recovery complete: ${completedCount} completed, ${queuedCount} queued for restart, ${skippedCount} skipped`);

  } catch (error) {
    console.error('❌ Error recovering pending debates:', error);
    // Don't throw - let the server start anyway
  }
}

module.exports = { recoverPendingDebates };
