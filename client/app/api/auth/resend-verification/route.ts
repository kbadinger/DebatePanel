import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendEmailVerification } from '@/lib/email';
import { RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  // Apply stricter rate limiting for resend attempts (max 3 per hour)
  const rateLimitResult = RATE_LIMITS.auth(req);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(
      rateLimitResult.limit,
      rateLimitResult.remaining,
      rateLimitResult.reset,
      'Too many resend attempts. Please wait before trying again.'
    );
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user and check if they exist and are unverified
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists for security
      return NextResponse.json({
        message: 'If an account with that email exists and is unverified, we\'ve sent a new verification email.'
      });
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Delete any existing verification tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Generate new verification token
    const verificationToken = nanoid(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new verification token
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: verificationToken,
        expires: expiresAt,
      },
    });

    // Send new verification email (non-blocking)
    sendEmailVerification(email, verificationToken, user.name).catch(err => {
      console.error('Failed to resend verification email:', err);
    });

    return NextResponse.json({
      message: 'New verification email sent! Please check your inbox and spam folder.'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification email' },
      { status: 500 }
    );
  }
}