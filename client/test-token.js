const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testToken() {
  const token = '6531cd11f46ad0b961dc3c6f8a6b7afa80113bf52ec2c7bc3297cfb23b8617e4';
  const email = 'kbadinger@resolventtech.com';
  
  console.log('Testing token lookup...');
  console.log('Token:', token);
  console.log('Email:', email);
  
  try {
    // Check if token exists
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        },
      },
    });
    
    if (!verificationToken) {
      console.log('❌ Token not found in database');
      
      // List all tokens for this email
      const allTokens = await prisma.verificationToken.findMany({
        where: { identifier: email }
      });
      console.log('All tokens for this email:', allTokens);
    } else {
      console.log('✅ Token found:', verificationToken);
      console.log('Current time:', new Date());
      console.log('Token expires:', verificationToken.expires);
      console.log('Is expired?', new Date() > verificationToken.expires);
    }
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testToken();