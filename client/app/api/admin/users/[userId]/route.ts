import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      include: {
        subscription: true,
        debates: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            modelSelections: true,
            _count: {
              select: { debateRounds: true }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get usage statistics
    const [totalUsage, monthlyUsage, modelUsage] = await Promise.all([
      // Total usage
      prisma.usageRecord.aggregate({
        where: { userId: params.userId },
        _sum: { totalCost: true },
        _count: true
      }),
      
      // Monthly usage
      prisma.usageRecord.aggregate({
        where: {
          userId: params.userId,
          createdAt: {
            gte: new Date(new Date().setDate(1)) // First day of current month
          }
        },
        _sum: { totalCost: true }
      }),
      
      // Usage by model
      prisma.usageRecord.groupBy({
        by: ['modelId'],
        where: { userId: params.userId },
        _count: true,
        _sum: { totalCost: true },
        orderBy: { _sum: { totalCost: 'desc' } },
        take: 10
      })
    ]);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
        subscription: user.subscription,
        debates: user.debates.map(d => ({
          id: d.id,
          topic: d.topic,
          createdAt: d.createdAt,
          status: d.status,
          rounds: d._count.debateRounds,
          models: d.modelSelections.map(m => m.modelId)
        }))
      },
      usage: {
        total: {
          cost: totalUsage._sum.totalCost || 0,
          count: totalUsage._count
        },
        currentMonth: {
          cost: monthlyUsage._sum.totalCost || 0
        },
        byModel: modelUsage.map(m => ({
          modelId: m.modelId,
          count: m._count,
          cost: m._sum.totalCost || 0
        }))
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { action, amount, reason } = body;

    if (action === 'add-credits') {
      if (!amount || amount <= 0) {
        return NextResponse.json(
          { error: 'Invalid amount' },
          { status: 400 }
        );
      }

      // Update user's balance
      const subscription = await prisma.subscription.update({
        where: { userId: params.userId },
        data: {
          currentBalance: {
            increment: amount
          }
        }
      });

      // Log the credit addition (you might want to create an audit log table)
      console.log(`Admin ${session.user.email} added ${amount} credits to user ${params.userId}. Reason: ${reason || 'No reason provided'}`);

      return NextResponse.json({
        success: true,
        newBalance: subscription.currentBalance
      });
    }

    if (action === 'toggle-admin') {
      // Prevent self-privilege modification
      if (params.userId === session.user.id) {
        return NextResponse.json({
          error: 'Cannot modify your own admin privileges'
        }, { status: 403 });
      }

      // Get current user data to check existing admin status
      const targetUser = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { id: true, email: true, isAdmin: true }
      });

      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Check if we're trying to remove the last admin
      if (targetUser.isAdmin && !body.isAdmin) {
        const adminCount = await prisma.user.count({
          where: { isAdmin: true }
        });
        
        if (adminCount <= 1) {
          return NextResponse.json({
            error: 'Cannot remove the last admin user'
          }, { status: 403 });
        }
      }

      const user = await prisma.user.update({
        where: { id: params.userId },
        data: {
          isAdmin: body.isAdmin
        }
      });

      // Comprehensive audit logging
      console.log(`ADMIN PRIVILEGE CHANGE: Admin ${session.user.email} (${session.user.id}) ${body.isAdmin ? 'GRANTED' : 'REVOKED'} admin privileges ${body.isAdmin ? 'to' : 'from'} user ${targetUser.email} (${params.userId}). Reason: ${reason || 'No reason provided'}`);

      return NextResponse.json({
        success: true,
        isAdmin: user.isAdmin
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
} 