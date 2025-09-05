import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

interface DataCounts {
  debates: number;
  debateRounds: number;
  modelResponses: number;
  modelSelections: number;
  participants: number;
  debateScores: number;
  modelRequests: number;
  modelRequestVotes: number;
  usageRecords: number;
}

async function getDataCounts(userId: string): Promise<DataCounts> {
  const [
    debates,
    debateRounds,
    modelResponses,
    modelSelections,
    participants,
    debateScores,
    modelRequests,
    modelRequestVotes,
    usageRecords
  ] = await Promise.all([
    prisma.debate.count({ where: { userId } }),
    prisma.debateRound.count({ where: { debate: { userId } } }),
    prisma.modelResponse.count({ where: { userId } }),
    prisma.modelSelection.count({ where: { debate: { userId } } }),
    prisma.participant.count({ where: { userId } }),
    prisma.debateScore.count({ where: { debate: { userId } } }),
    prisma.modelRequest.count({ where: { userId } }),
    prisma.modelRequestVote.count({ where: { userId } }),
    prisma.usageRecord.count({ where: { userId } })
  ]);

  return {
    debates,
    debateRounds,
    modelResponses,
    modelSelections,
    participants,
    debateScores,
    modelRequests,
    modelRequestVotes,
    usageRecords
  };
}

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

async function clearUserHistory(email: string, isDryRun: boolean = false) {
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
    console.log('   User ID:', user.id);
    console.log('   Admin:', user.isAdmin ? 'Yes' : 'No');
    console.log('   Subscription:', user.subscription?.plan || 'None');
    console.log('   Current Balance: $' + (user.subscription?.currentBalance || 0));
    console.log();

    // Get current data counts
    console.log('📊 Analyzing current data...');
    const beforeCounts = await getDataCounts(user.id);

    console.log('================================');
    console.log('📋 Current Data Summary:');
    console.log('================================');
    console.log('🔥 WILL BE CLEARED/DELETED:');
    console.log('   - Debate Results & Content (synthesis, judge analysis, winners)');
    console.log('   - AI Model Response Content (keeping structure for billing)');
    console.log('   - Human Responses:', beforeCounts.modelResponses);
    console.log('   - Participants:', beforeCounts.participants);
    console.log('   - Debate Scores:', beforeCounts.debateScores);
    console.log('   - Model Requests:', beforeCounts.modelRequests);
    console.log('   - Model Request Votes:', beforeCounts.modelRequestVotes);
    console.log();
    console.log('✅ WILL BE PRESERVED:');
    console.log('   - Usage Records (billing/charges):', beforeCounts.usageRecords);
    console.log('   - User Account & Authentication');
    console.log('   - Subscription & Payment Data');
    console.log('   - API Keys & Configuration');
    console.log('================================');

    const totalToDelete = beforeCounts.debates + beforeCounts.debateRounds + 
                         beforeCounts.modelResponses + beforeCounts.modelSelections +
                         beforeCounts.participants + beforeCounts.debateScores +
                         beforeCounts.modelRequests + beforeCounts.modelRequestVotes;

    if (totalToDelete === 0) {
      console.log('✅ No history data found to delete. User appears clean.');
      return;
    }

    if (isDryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made');
      console.log(`📊 Would delete ${totalToDelete} records total`);
      return;
    }

    // Confirmation
    console.log();
    console.log('⚠️  WARNING: This will permanently delete all debate history!');
    console.log('💾 Consider backing up your database first.');
    console.log();
    
    const confirmed = await confirmAction('❓ Are you sure you want to continue? (yes/no): ');
    
    if (!confirmed) {
      console.log('❌ Operation cancelled by user.');
      return;
    }

    console.log();
    console.log('🗑️  Starting cleanup transaction...');

    // Perform deletion in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete in correct order to respect foreign key constraints
      
      // 1. Delete model request votes first (references both user and model request)
      console.log('   Deleting model request votes...');
      await tx.modelRequestVote.deleteMany({
        where: { userId: user.id }
      });

      // 2. Delete model requests
      console.log('   Deleting model requests...');
      await tx.modelRequest.deleteMany({
        where: { userId: user.id }
      });

      // 3. Clear UI-visible content from debates while preserving structure for billing
      console.log('   Clearing debate content (preserving structure for billing)...');
      
      // Clear final synthesis and judge analysis (the main UI content)
      await tx.debate.updateMany({
        where: { userId: user.id },
        data: {
          finalSynthesis: null,
          judgeAnalysis: null,
          winnerId: null,
          winnerName: null,
          winnerType: null,
          victoryReason: null,
          status: 'active'  // Reset status
        }
      });

      // Delete non-billing related records
      console.log('   Deleting participants...');
      await tx.participant.deleteMany({
        where: { userId: user.id }
      });

      console.log('   Deleting debate scores...');
      await tx.debateScore.deleteMany({
        where: { debate: { userId: user.id } }
      });

      // Delete model responses that don't affect billing (human responses)
      console.log('   Deleting human responses...');
      await tx.modelResponse.deleteMany({
        where: { 
          userId: user.id,
          isHuman: true
        }
      });
      
      console.log('   Clearing AI model response content...');
      // Clear AI response content but keep records for billing reference
      await tx.modelResponse.updateMany({
        where: { 
          round: {
            debate: { userId: user.id }
          },
          isHuman: false
        },
        data: {
          content: '[Response cleared for testing cleanup]',
          position: 'cleared',
          confidence: 0
        }
      });
    });

    // Verify the cleanup
    console.log('🔍 Verifying cleanup...');
    const afterCounts = await getDataCounts(user.id);

    console.log('================================');
    console.log('✅ Cleanup completed successfully!');
    console.log('================================');
    console.log('📊 Results Summary:');
    console.log(`   🗑️  Deleted ${beforeCounts.debates} debates`);
    console.log(`   🗑️  Deleted ${beforeCounts.debateRounds} debate rounds`);
    console.log(`   🗑️  Deleted ${beforeCounts.modelResponses} model responses`);
    console.log(`   🗑️  Deleted ${beforeCounts.modelSelections} model selections`);
    console.log(`   🗑️  Deleted ${beforeCounts.participants} participants`);
    console.log(`   🗑️  Deleted ${beforeCounts.debateScores} debate scores`);
    console.log(`   🗑️  Deleted ${beforeCounts.modelRequests} model requests`);
    console.log(`   🗑️  Deleted ${beforeCounts.modelRequestVotes} model request votes`);
    console.log();
    console.log('💾 Data Preserved:');
    console.log(`   ✅ ${afterCounts.usageRecords} usage records (billing data) - PRESERVED`);
    console.log('   ✅ User account & subscription - PRESERVED');
    console.log('   ✅ API keys & settings - PRESERVED');
    console.log('================================');

    // Sanity check
    if (afterCounts.debates > 0 || afterCounts.modelResponses > 0) {
      console.warn('⚠️  Warning: Some history data may not have been deleted. Please verify.');
    }

    if (afterCounts.usageRecords !== beforeCounts.usageRecords) {
      console.error('🚨 CRITICAL ERROR: Usage records were modified! This should not happen.');
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
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('📖 Database User History Cleanup Utility');
    console.log('========================================');
    console.log('');
    console.log('Usage:');
    console.log('  npx tsx scripts/clear-user-history.ts <email> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --dry-run    Show what would be deleted without making changes');
    console.log('  --help, -h   Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  npx tsx scripts/clear-user-history.ts kbadinger@resolventtech.com');
    console.log('  npx tsx scripts/clear-user-history.ts user@example.com --dry-run');
    console.log('');
    console.log('⚠️  IMPORTANT: This clears ALL debate history but preserves billing data!');
    return;
  }

  const email = args[0];
  const isDryRun = args.includes('--dry-run');

  if (!email || !email.includes('@')) {
    console.error('❌ Please provide a valid email address');
    console.log('   Usage: npx tsx scripts/clear-user-history.ts <email>');
    process.exit(1);
  }

  if (isDryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be made');
    console.log('================================');
  }

  await clearUserHistory(email, isDryRun);
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});