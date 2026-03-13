import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

const prisma = new PrismaClient();

// Toggle public visibility for a debate
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { isAdmin: true }
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { debateId, isPublic, publicSlug } = await req.json();

    if (!debateId) {
      return NextResponse.json({ error: 'debateId required' }, { status: 400 });
    }

    // Generate slug if making public and no slug provided
    let slug = publicSlug;
    if (isPublic && !slug) {
      const debate = await prisma.debate.findUnique({
        where: { id: debateId },
        select: { topic: true }
      });
      if (debate) {
        // Create slug from topic
        slug = debate.topic
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 50);
        // Add random suffix to ensure uniqueness
        slug = `${slug}-${Date.now().toString(36)}`;
      }
    }

    const updated = await prisma.debate.update({
      where: { id: debateId },
      data: {
        isPublic: isPublic ?? true,
        publicSlug: isPublic ? slug : null
      },
      select: {
        id: true,
        isPublic: true,
        publicSlug: true
      }
    });

    return NextResponse.json({
      success: true,
      debate: updated,
      publicUrl: updated.isPublic && updated.publicSlug
        ? `/d/${updated.publicSlug}`
        : null
    });
  } catch (error) {
    console.error('Error updating debate visibility:', error);
    return NextResponse.json(
      { error: 'Failed to update debate' },
      { status: 500 }
    );
  }
}

// Get public status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const debateId = searchParams.get('debateId');

    if (!debateId) {
      return NextResponse.json({ error: 'debateId required' }, { status: 400 });
    }

    const debate = await prisma.debate.findUnique({
      where: { id: debateId },
      select: {
        isPublic: true,
        publicSlug: true
      }
    });

    if (!debate) {
      return NextResponse.json({ error: 'Debate not found' }, { status: 404 });
    }

    return NextResponse.json({
      isPublic: debate.isPublic,
      publicSlug: debate.publicSlug,
      publicUrl: debate.isPublic && debate.publicSlug
        ? `/d/${debate.publicSlug}`
        : null
    });
  } catch (error) {
    console.error('Error fetching debate visibility:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debate' },
      { status: 500 }
    );
  }
}
