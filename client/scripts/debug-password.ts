import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function debugPassword() {
  const email = process.argv[2];
  const testPassword = process.argv[3];

  if (!email) {
    console.log('Usage: npx tsx scripts/debug-password.ts <email> [password-to-test]');
    console.log('\nExample:');
    console.log('  npx tsx scripts/debug-password.ts admin@example.com');
    console.log('  npx tsx scripts/debug-password.ts admin@example.com adminpassword123');
    process.exit(1);
  }

  try {
    console.log('🔍 Debugging Password for:', email, '\n');

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        isAdmin: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      console.log('❌ User not found!');
      console.log('\nAvailable users:');
      const allUsers = await prisma.user.findMany({
        select: { email: true },
      });
      allUsers.forEach((u) => console.log('  -', u.email));
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.name || '(not set)');
    console.log('   Admin:', user.isAdmin ? 'Yes' : 'No');
    console.log('   Email Verified:', user.emailVerified ? 'Yes' : 'No');
    console.log('   Created:', user.createdAt.toISOString());
    console.log('');

    if (!user.password) {
      console.log('❌ User has NO password!');
      console.log('   This user probably signed up with Google/GitHub');
      console.log('\n💡 To add a password, run:');
      console.log(`   npx tsx scripts/create-test-account.ts ${email} yourpassword`);
      process.exit(1);
    }

    console.log('✅ User has password hash:');
    console.log('   Hash:', user.password.substring(0, 30) + '...');
    console.log('   Hash length:', user.password.length);
    console.log('   Hash starts with:', user.password.substring(0, 7));

    // Check if it looks like a bcrypt hash
    const isBcrypt = user.password.startsWith('$2a$') ||
                     user.password.startsWith('$2b$') ||
                     user.password.startsWith('$2y$');
    console.log('   Valid bcrypt format:', isBcrypt ? '✅ Yes' : '❌ No');

    if (!isBcrypt) {
      console.log('\n⚠️  WARNING: Password is not in bcrypt format!');
      console.log('   This will cause login failures.');
    }

    if (testPassword) {
      console.log('\n🧪 Testing password:', testPassword);
      try {
        const isMatch = await bcrypt.compare(testPassword, user.password);
        if (isMatch) {
          console.log('✅ PASSWORD MATCHES! Login should work.');
        } else {
          console.log('❌ Password does NOT match!');
          console.log('\n💡 To reset the password, run:');
          console.log(`   npx tsx scripts/create-test-account.ts ${email} ${testPassword}`);
        }
      } catch (error) {
        console.log('❌ Error comparing password:', error);
        console.log('   The hash might be corrupted.');
      }
    } else {
      console.log('\n💡 To test a password, run:');
      console.log(`   npx tsx scripts/debug-password.ts ${email} password-to-test`);
    }

    // Test with common passwords
    if (!testPassword) {
      console.log('\n🧪 Testing common passwords...');
      const commonPasswords = [
        'adminpassword123',
        'admin123',
        'password123',
        'password',
        'admin',
      ];

      for (const pwd of commonPasswords) {
        try {
          const isMatch = await bcrypt.compare(pwd, user.password);
          if (isMatch) {
            console.log(`✅ FOUND MATCH: "${pwd}"`);
            break;
          }
        } catch (error) {
          // Skip
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPassword();
