import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAdmin() {
  const email = process.argv[2] || 'admin@example.com';
  const password = process.argv[3] || 'adminpassword123';

  console.log('🔧 Resetting admin user...\n');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('');

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    const hashedPassword = await bcrypt.hash(password, 12);

    if (existingUser) {
      console.log('✅ User found, updating...');

      // Update password and make admin
      await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          isAdmin: true,
          emailVerified: new Date(),
        },
      });

      // Ensure subscription exists
      const subscription = await prisma.subscription.findUnique({
        where: { userId: existingUser.id },
      });

      if (!subscription) {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await prisma.subscription.create({
          data: {
            userId: existingUser.id,
            plan: 'pro',
            status: 'active',
            currentBalance: 100.00,
            monthlyAllowance: 100.00,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });
        console.log('✅ Created Pro subscription with $100 credits');
      } else {
        await prisma.subscription.update({
          where: { userId: existingUser.id },
          data: {
            plan: 'pro',
            currentBalance: 100.00,
            monthlyAllowance: 100.00,
          },
        });
        console.log('✅ Updated to Pro subscription with $100 credits');
      }

    } else {
      console.log('❌ User not found, creating new admin...');

      // Create new admin user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: 'Admin',
          isAdmin: true,
          emailVerified: new Date(),
        },
      });

      // Create Pro subscription
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: 'pro',
          status: 'active',
          currentBalance: 100.00,
          monthlyAllowance: 100.00,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

      console.log('✅ Created new admin user with Pro subscription');
    }

    console.log('\n✅ SUCCESS! Admin user ready:\n');
    console.log('═'.repeat(50));
    console.log('Email:          ', email);
    console.log('Password:       ', password);
    console.log('Admin:          ', '✅ Yes');
    console.log('Email Verified: ', '✅ Yes');
    console.log('Plan:           ', 'Pro');
    console.log('Credits:        ', '$100.00');
    console.log('═'.repeat(50));
    console.log('\n🌐 Login at: https://app.decisionforge.io/login\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();
