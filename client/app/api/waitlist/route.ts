import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if already on waitlist
    const existing = await prisma.waitlist.findUnique({
      where: { email },
    });

    if (existing) {
      // Don't reveal they're already on list - just say success
      return NextResponse.json({ success: true });
    }

    // Add to waitlist
    await prisma.waitlist.create({
      data: {
        email,
        name: name || null,
        status: 'pending',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Waitlist error:', error);
    return NextResponse.json(
      { error: 'Failed to join waitlist' },
      { status: 500 }
    );
  }
}

// GET endpoint for admin to view waitlist
export async function GET(req: NextRequest) {
  try {
    // Simple check - in production you'd verify admin session
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const waitlist = await prisma.waitlist.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(waitlist);
  } catch (error) {
    console.error('Waitlist fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waitlist' },
      { status: 500 }
    );
  }
}
