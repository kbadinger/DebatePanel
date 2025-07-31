import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { token, email, password } = await req.json();

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        },
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (new Date() > verificationToken.expires) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: email,
            token: token,
          },
        },
      });

      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete the used verification token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        },
      },
    });

    return NextResponse.json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
} 