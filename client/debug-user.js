const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugUser() {
  const email = 'kbadinger@resolventtech.com';
  
  try {
    console.log('Checking if user exists...');
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.log('❌ User not found with email:', email);
      
      // List all users
      const allUsers = await prisma.user.findMany({
        select: { id: true, email: true, name: true, createdAt: true }
      });
      console.log('All users in database:', allUsers);
    } else {
      console.log('✅ User found:', { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        hasPassword: !!user.password 
      });
    }
    
    // Test database connection
    console.log('\nTesting database connection...');
    const count = await prisma.user.count();
    console.log('Total users in database:', count);
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUser();