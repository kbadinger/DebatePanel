import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/model-requests/[id]/vote - Vote on a model request
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { voteType } = body;
    const requestId = params.id;

    // Validation
    if (!voteType || !['up', 'down'].includes(voteType)) {
      return NextResponse.json({ error: 'Invalid vote type' }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if request exists
    const modelRequest = await prisma.modelRequest.findUnique({
      where: { id: requestId }
    });

    if (!modelRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Can't vote on your own request
    if (modelRequest.userId === user.id) {
      return NextResponse.json({ error: 'Cannot vote on your own request' }, { status: 400 });
    }

    // Rate limiting - max 10 votes per day per user
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayVoteCount = await prisma.modelRequestVote.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: today
        }
      }
    });

    if (todayVoteCount >= 10) {
      return NextResponse.json({ error: 'Daily vote limit reached (10 per day)' }, { status: 429 });
    }

    // Upsert vote (create or update existing)
    const vote = await prisma.modelRequestVote.upsert({
      where: {
        requestId_userId: {
          requestId,
          userId: user.id
        }
      },
      update: {
        voteType
      },
      create: {
        requestId,
        userId: user.id,
        voteType
      }
    });

    // Get updated vote counts
    const votes = await prisma.modelRequestVote.findMany({
      where: { requestId },
      select: { voteType: true }
    });

    const upVotes = votes.filter(v => v.voteType === 'up').length;
    const downVotes = votes.filter(v => v.voteType === 'down').length;
    const score = upVotes - downVotes;

    return NextResponse.json({
      vote,
      upVotes,
      downVotes,
      score
    });
  } catch (error) {
    console.error('Error voting on model request:', error);
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 });
  }
}

// DELETE /api/model-requests/[id]/vote - Remove vote
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = params.id;

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove vote
    await prisma.modelRequestVote.delete({
      where: {
        requestId_userId: {
          requestId,
          userId: user.id
        }
      }
    });

    // Get updated vote counts
    const votes = await prisma.modelRequestVote.findMany({
      where: { requestId },
      select: { voteType: true }
    });

    const upVotes = votes.filter(v => v.voteType === 'up').length;
    const downVotes = votes.filter(v => v.voteType === 'down').length;
    const score = upVotes - downVotes;

    return NextResponse.json({
      upVotes,
      downVotes,
      score
    });
  } catch (error) {
    console.error('Error removing vote:', error);
    return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 });
  }
}














