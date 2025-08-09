import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestAdmin() {
  try {
    // Check if test admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });

    if (existingAdmin) {
      console.log('Test admin already exists with ID:', existingAdmin.id);
      console.log('Email: admin@example.com');
      console.log('Password: adminpassword123');
      return;
    }

    // Create test admin with hashed password
    const hashedPassword = await bcrypt.hash('adminpassword123', 10);
    
    const testAdmin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Test Admin',
        password: hashedPassword,
        isAdmin: true,
        subscription: {
          create: {
            plan: 'pro',
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          }
        },
        tokenBalance: {
          create: {
            balance: 999999999, // Unlimited tokens for admin
            lastRefreshed: new Date()
          }
        }
      },
      include: {
        subscription: true,
        tokenBalance: true
      }
    });

    console.log('✅ Test admin created successfully!');
    console.log('================================');
    console.log('Test Admin Credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: adminpassword123');
    console.log('================================');
    console.log('Admin Details:');
    console.log('ID:', testAdmin.id);
    console.log('Name:', testAdmin.name);
    console.log('Is Admin:', testAdmin.isAdmin);
    console.log('Subscription Plan:', testAdmin.subscription?.plan);
    console.log('Token Balance:', testAdmin.tokenBalance?.balance);
    console.log('================================');
    console.log('Admin Panel URL: http://localhost:3000/admin');
    console.log('================================');

  } catch (error) {
    console.error('Error creating test admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAdmin();