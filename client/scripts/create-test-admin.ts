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
            monthlyAllowance: 50,  // $50 for pro plan
            currentBalance: 50,    // Start with full balance
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          }
        },
      },
      include: {
        subscription: true
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
    console.log('Subscription Balance: $', testAdmin.subscription?.currentBalance);
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