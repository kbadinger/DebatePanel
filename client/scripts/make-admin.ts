import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    if (user.isAdmin) {
      console.log(`User ${email} is already an admin`);
      process.exit(0);
    }

    await prisma.user.update({
      where: { email },
      data: { isAdmin: true },
    });

    console.log(`Successfully made ${email} an admin`);
  } catch (error) {
    console.error('Error making user admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('Usage: npm run make-admin <email>');
  process.exit(1);
}

makeAdmin(email); 