import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PATCH /api/admin/model-requests/[id] - Update request status (admin only)
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { status, adminNotes } = body;
    const requestId = params.id;

    // Validation
    const validStatuses = ['pending', 'approved', 'rejected', 'added'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Update the request
    const updatedRequest = await prisma.modelRequest.update({
      where: { id: requestId },
      data: {
        status,
        adminNotes: adminNotes || null,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        votes: {
          select: {
            voteType: true
          }
        }
      }
    });

    // Calculate vote scores
    const upVotes = updatedRequest.votes.filter(v => v.voteType === 'up').length;
    const downVotes = updatedRequest.votes.filter(v => v.voteType === 'down').length;
    const score = upVotes - downVotes;

    const response = {
      ...updatedRequest,
      upVotes,
      downVotes,
      score,
      votes: undefined // Remove detailed votes for privacy
    };

    // TODO: Send notification to user when status changes to 'added'
    if (status === 'added') {
      // In a real implementation, you'd send an email or push notification here
      console.log(`Model request ${updatedRequest.modelName} has been added - notify user ${updatedRequest.user.email}`);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating model request:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}


