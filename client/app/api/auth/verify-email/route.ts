import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendWelcomeEmail } from '@/lib/email';
import { RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  // Apply rate limiting for verification attempts
  const rateLimitResult = RATE_LIMITS.auth(req);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(
      rateLimitResult.limit,
      rateLimitResult.remaining,
      rateLimitResult.reset,
      'Too many verification attempts. Please wait before trying again.'
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      return NextResponse.redirect(
        new URL('/verify-email?error=invalid-link', req.url)
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
      return NextResponse.redirect(
        new URL('/verify-email?error=invalid-token', req.url)
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
      
      return NextResponse.redirect(
        new URL('/verify-email?error=expired', req.url)
      );
    }

    // Find the user and verify their email
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL('/verify-email?error=user-not-found', req.url)
      );
    }

    // Delete the used verification token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        },
      },
    });

    // Send welcome email now that they're verified (non-blocking)
    sendWelcomeEmail(email, user.name).catch(err => {
      console.error('Failed to send welcome email after verification:', err);
      // Don't fail verification if welcome email fails
    });

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/verify-email?success=true', req.url)
    );

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(
      new URL('/verify-email?error=server-error', req.url)
    );
  }
}