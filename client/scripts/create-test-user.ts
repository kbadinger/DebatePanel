import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Check if test user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (existingUser) {
      console.log('Test user already exists with ID:', existingUser.id);
      console.log('Email: test@example.com');
      console.log('Password: testpassword123');
      return;
    }

    // Create test user with hashed password
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        isAdmin: false,
        subscription: {
          create: {
            plan: 'free',
            status: 'active',
            monthlyAllowance: 5,  // $5 for free plan
            currentBalance: 5,    // Start with full balance
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          }
        },
      },
      include: {
        subscription: true
      }
    });

    console.log('✅ Test user created successfully!');
    console.log('================================');
    console.log('Test User Credentials:');
    console.log('Email: test@example.com');
    console.log('Password: testpassword123');
    console.log('================================');
    console.log('User Details:');
    console.log('ID:', testUser.id);
    console.log('Name:', testUser.name);
    console.log('Is Admin:', testUser.isAdmin);
    console.log('Subscription Plan:', testUser.subscription?.plan);
    console.log('Subscription Balance: $', testUser.subscription?.currentBalance);
    console.log('================================');

  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();