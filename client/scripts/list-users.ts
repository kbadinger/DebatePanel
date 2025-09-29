import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        isAdmin: true,
        createdAt: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            currentBalance: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('\n📋 Users in Database:\n');
    console.log('═'.repeat(80));
    
    if (users.length === 0) {
      console.log('No users found in the database.');
    } else {
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.email}`);
        console.log('   Name:', user.name || '(not set)');
        console.log('   Admin:', user.isAdmin ? '✅ Yes' : '❌ No');
        console.log('   Email Verified:', user.emailVerified ? '✅ Yes' : '❌ No');
        console.log('   Created:', user.createdAt.toLocaleDateString());
        if (user.subscription) {
          console.log('   Subscription:', user.subscription.plan, `(${user.subscription.status})`);
          console.log('   Balance: $' + user.subscription.currentBalance.toFixed(2));
        } else {
          console.log('   Subscription: None');
        }
      });
    }
    
    console.log('\n═'.repeat(80));
    console.log(`Total users: ${users.length}`);
    console.log('\nTo reset a password for any of these users, use their email address');
    console.log('on the forgot password page.\n');
    
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();



