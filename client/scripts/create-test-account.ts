import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestAccount() {
  const email = process.argv[2];
  const password = process.argv[3];
  
  if (!email || !password) {
    console.log('Usage: npm run create-test-account <email> <password>');
    process.exit(1);
  }

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('User already exists. Updating password and verifying email...');
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          emailVerified: new Date(),
        }
      });
      
      // Ensure subscription exists
      const existingSubscription = await prisma.subscription.findUnique({
        where: { userId: updatedUser.id }
      });
      
      if (!existingSubscription) {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        
        await prisma.subscription.create({
          data: {
            userId: updatedUser.id,
            plan: 'free',
            status: 'active',
            currentBalance: 5.00,
            monthlyAllowance: 5.00,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          }
        });
        console.log('✅ Added free subscription with $5 credits');
      }
      
      console.log('✅ User updated successfully!');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('Credits: $5.00');
      
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          emailVerified: new Date(), // Mark as verified
          name: email.split('@')[0], // Use email prefix as name
        }
      });

      // Create subscription with free credits
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      
      await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: 'free',
          status: 'active',
          currentBalance: 5.00,
          monthlyAllowance: 5.00,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        }
      });

      console.log('✅ Test account created successfully!');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('Credits: $5.00');
      console.log('Email verified: Yes');
    }
    
    console.log('\nYou can now log in at https://app.decisionforge.io/login');
    
  } catch (error) {
    console.error('Error creating test account:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAccount();
