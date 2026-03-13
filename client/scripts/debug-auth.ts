import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function debugAuth() {
  console.log('🔍 Authentication Debug Tool\n');

  try {
    // Test database connection
    console.log('1️⃣ Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully\n');

    // Check if admin user exists
    console.log('2️⃣ Checking for admin user...');
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
      include: {
        subscription: true,
      },
    });

    if (!adminUser) {
      console.log('❌ Admin user not found!');
      console.log('💡 Run: npx tsx scripts/create-test-admin.ts\n');
    } else {
      console.log('✅ Admin user found:');
      console.log(`   - ID: ${adminUser.id}`);
      console.log(`   - Email: ${adminUser.email}`);
      console.log(`   - Name: ${adminUser.name}`);
      console.log(`   - Has password: ${adminUser.password ? 'Yes' : 'No'}`);
      console.log(`   - Email verified: ${adminUser.emailVerified ? 'Yes' : 'No'}`);
      console.log(`   - Is admin: ${adminUser.isAdmin ? 'Yes' : 'No'}`);
      console.log(`   - Subscription: ${adminUser.subscription?.plan || 'None'}\n`);

      // Test password verification
      if (adminUser.password) {
        console.log('3️⃣ Testing password verification...');
        const testPassword = 'adminpassword123';
        const isValid = await bcrypt.compare(testPassword, adminUser.password);
        console.log(`   Password check for "${testPassword}": ${isValid ? '✅ Valid' : '❌ Invalid'}\n`);
      }
    }

    // Check all users
    console.log('4️⃣ Listing all users in database...');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`   Found ${allUsers.length} user(s):`);
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email}`);
      console.log(`      - ID: ${user.id}`);
      console.log(`      - Admin: ${user.isAdmin ? 'Yes' : 'No'}`);
      console.log(`      - Verified: ${user.emailVerified ? 'Yes' : 'No'}`);
      console.log(`      - Created: ${user.createdAt.toISOString()}`);
    });

    // Check environment variables
    console.log('\n5️⃣ Checking environment variables...');
    const envVars = {
      DATABASE_URL: process.env.DATABASE_URL ? '✅ Set' : '❌ Missing',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || '❌ Not set',
    };

    Object.entries(envVars).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    console.log('\n✅ Debug complete!');
  } catch (error) {
    console.error('\n❌ Error during debug:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

debugAuth();
