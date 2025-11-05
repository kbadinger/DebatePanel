import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProdUsers() {
  console.log('🔍 Checking Production Users\n');

  try {
    await prisma.$connect();
    console.log('✅ Connected to database\n');

    const users = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        isAdmin: true,
        emailVerified: true,
        password: true, // Check if password exists
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${users.length} user(s):\n`);
    console.log('═'.repeat(70));

    if (users.length === 0) {
      console.log('\n❌ NO USERS IN DATABASE!\n');
      console.log('To create an admin user, run:');
      console.log('  npx tsx scripts/create-test-account.ts your@email.com yourpassword\n');
    } else {
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.email}`);
        console.log(`   Name: ${user.name || '(not set)'}`);
        console.log(`   Admin: ${user.isAdmin ? '✅ Yes' : '❌ No'}`);
        console.log(`   Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
        console.log(`   Has Password: ${user.password ? '✅ Yes' : '❌ No (OAuth only)'}`);
      });

      console.log('\n═'.repeat(70));
      console.log('\n💡 Use one of these emails to login!');
      console.log('\n📝 To make any user an admin:');
      console.log('   npx tsx scripts/make-admin.ts user@email.com\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProdUsers();
