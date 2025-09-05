import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

async function confirmAction(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim() === 'yes' || answer.toLowerCase().trim() === 'y');
    });
  });
}

async function clearUserHistoryAggressive(email: string, isDryRun: boolean = false) {
  try {
    console.log('🔍 Looking up user:', email);
    console.log('================================');

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        subscription: true
      }
    });

    if (!user) {
      console.error('❌ User not found with email:', email);
      process.exit(1);
    }

    console.log('✅ Found user:', user.name || 'Unnamed User', `(${user.email})`);

    // Count current debates and usage records
    const debates = await prisma.debate.count({ where: { userId: user.id } });
    const usageRecords = await prisma.usageRecord.count({ where: { userId: user.id } });
    
    console.log('📊 Current Status:');
    console.log('   - Debates in history:', debates);
    console.log('   - Usage records (billing):', usageRecords);
    console.log();

    if (debates === 0) {
      console.log('✅ No debate history found. User appears clean.');
      return;
    }

    if (isDryRun) {
      console.log('🔍 DRY RUN MODE - Would replace all debate content with placeholder data');
      return;
    }

    console.log('⚠️  This will replace all debate history with placeholder data to hide from UI');
    console.log('💾 All billing/usage data will remain intact');
    console.log();
    
    const confirmed = await confirmAction('❓ Continue with aggressive cleanup? (yes/no): ');
    
    if (!confirmed) {
      console.log('❌ Operation cancelled by user.');
      return;
    }

    console.log('🔄 Starting aggressive cleanup...');

    await prisma.$transaction(async (tx) => {
      // Replace all debate content with placeholder data so it doesn't show as real history
      console.log('   📝 Replacing debate topics with placeholders...');
      await tx.debate.updateMany({
        where: { userId: user.id },
        data: {
          topic: '[Test Debate - Cleared]',
          description: '[This debate was cleared during testing cleanup]',
          finalSynthesis: null,
          judgeAnalysis: null,
          winnerId: null,
          winnerName: null,
          winnerType: null,
          victoryReason: null,
          status: 'completed'
        }
      });

      // Replace all model response content with placeholders
      console.log('   💬 Clearing all model response content...');
      await tx.modelResponse.updateMany({
        where: {
          round: {
            debate: { userId: user.id }
          }
        },
        data: {
          content: '[Response content cleared during testing cleanup]',
          position: '[Cleared]',
          confidence: 0
        }
      });

      // Clear round-level analysis
      console.log('   🔄 Clearing round analysis data...');
      await tx.debateRound.updateMany({
        where: {
          debate: { userId: user.id }
        },
        data: {
          consensus: '[Cleared during testing]',
          keyDisagreements: []
        }
      });

      // Delete non-essential records
      console.log('   🗑️  Removing scores and participants...');
      await tx.debateScore.deleteMany({
        where: { debate: { userId: user.id } }
      });

      await tx.participant.deleteMany({
        where: { userId: user.id }
      });

      await tx.modelRequest.deleteMany({
        where: { userId: user.id }
      });

      await tx.modelRequestVote.deleteMany({
        where: { userId: user.id }
      });
    });

    // Verify cleanup
    const afterDebates = await prisma.debate.count({ where: { userId: user.id } });
    const afterUsage = await prisma.usageRecord.count({ where: { userId: user.id } });

    console.log('================================');
    console.log('✅ Aggressive cleanup completed!');
    console.log('================================');
    console.log('📊 Results:');
    console.log(`   📝 ${debates} debates converted to placeholder data`);
    console.log(`   💾 ${usageRecords} usage records preserved (unchanged)`);
    console.log(`   🏠 User will see clean history page`);
    console.log('================================');

    if (afterUsage !== usageRecords) {
      console.error('🚨 ERROR: Usage records were changed! This should not happen.');
    } else {
      console.log('✅ Billing data integrity verified - all usage records preserved');
    }

  } catch (error) {
    console.error('💥 Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log('🧹 Aggressive Database History Cleanup');
    console.log('=====================================');
    console.log('Replaces all debate content with placeholders while preserving billing data');
    console.log('');
    console.log('Usage:');
    console.log('  npx tsx scripts/clear-user-history-aggressive.ts <email> [--dry-run]');
    console.log('');
    console.log('This will make the user\'s history page appear clean while keeping all billing intact.');
    return;
  }

  const email = args[0];
  const isDryRun = args.includes('--dry-run');

  if (!email || !email.includes('@')) {
    console.error('❌ Please provide a valid email address');
    process.exit(1);
  }

  await clearUserHistoryAggressive(email, isDryRun);
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});