import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const plan = searchParams.get('plan') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (plan) {
      where.subscription = { plan };
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          subscription: true,
          _count: {
            select: {
              debates: true,
              usageRecords: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    // Get usage stats for each user
    const userIds = users.map(u => u.id);
    const usageStats = await prisma.usageRecord.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _sum: { totalCost: true }
    });

    const usageMap = usageStats.reduce((acc, stat) => {
      acc[stat.userId] = stat._sum.totalCost || 0;
      return acc;
    }, {} as Record<string, number>);

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      subscription: user.subscription ? {
        plan: user.subscription.plan,
        status: user.subscription.status,
        currentBalance: user.subscription.currentBalance,
        monthlyAllowance: user.subscription.monthlyAllowance
      } : null,
      stats: {
        debates: user._count.debates,
        totalSpent: usageMap[user.id] || 0
      }
    }));

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
} 