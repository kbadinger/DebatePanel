import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendEmailVerification } from '@/lib/email';
import { RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  // Apply rate limiting for signup
  const rateLimitResult = RATE_LIMITS.auth(req);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(
      rateLimitResult.limit,
      rateLimitResult.remaining,
      rateLimitResult.reset,
      'Too many signup attempts. Please wait before trying again.'
    );
  }

  try {
    const { name, email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = nanoid(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user with unverified email
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: null, // Explicitly set as unverified
      },
    });

    // Create verification token
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: verificationToken,
        expires: expiresAt,
      },
    });

    // Create default free subscription (but user can't access until verified)
    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: 'free',
        status: 'active',
        monthlyAllowance: 5.00, // $5 free trial
        currentBalance: 5.00,
        rolloverBalance: 0,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Send email verification (non-blocking)
    sendEmailVerification(email, verificationToken, name).catch(err => {
      console.error('Failed to send verification email:', err);
      // Don't fail signup if email fails
    });

    return NextResponse.json({
      message: 'Account created! Please check your email to verify your address before accessing the platform.',
      userId: user.id,
      requiresVerification: true,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}