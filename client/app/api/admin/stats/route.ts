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

    // Get overall statistics
    const [
      totalUsers,
      activeUsers,
      totalDebates,
      totalRevenue,
      subscriptionStats,
      recentDebates,
      topModels
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active users (logged in within last 30 days)
      prisma.user.count({
        where: {
          sessions: {
            some: {
              expires: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              }
            }
          }
        }
      }),
      
      // Total debates
      prisma.debate.count(),
      
      // Total revenue (sum of all usage costs)
      prisma.usageRecord.aggregate({
        _sum: {
          totalCost: true
        }
      }),
      
      // Subscription stats
      prisma.subscription.groupBy({
        by: ['plan'],
        _count: true
      }),
      
      // Recent debates
      prisma.debate.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              name: true
            }
          }
        }
      }),
      
      // Top used models
      prisma.usageRecord.groupBy({
        by: ['modelId'],
        _count: true,
        _sum: {
          totalCost: true
        },
        orderBy: {
          _count: {
            modelId: 'desc'
          }
        },
        take: 5
      })
    ]);

    // Get usage trend for last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const usageTrend = await prisma.usageRecord.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      _sum: {
        totalCost: true
      },
      _count: true
    });

    // Format usage trend by day
    const dailyUsage = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = usageTrend.filter(u => 
        u.createdAt.toISOString().split('T')[0] === dateStr
      );
      
      return {
        date: dateStr,
        revenue: dayData.reduce((sum, d) => sum + (d._sum.totalCost || 0), 0),
        debates: dayData.reduce((sum, d) => sum + d._count, 0)
      };
    });

    return NextResponse.json({
      overview: {
        totalUsers,
        activeUsers,
        totalDebates,
        totalRevenue: totalRevenue._sum.totalCost || 0
      },
      subscriptions: subscriptionStats.map(s => ({
        plan: s.plan,
        count: s._count
      })),
      dailyUsage,
      recentDebates: recentDebates.map(d => ({
        id: d.id,
        topic: d.topic,
        createdAt: d.createdAt,
        user: d.user?.email || 'Anonymous',
        status: d.status
      })),
      topModels: topModels.map(m => ({
        modelId: m.modelId,
        usage: m._count,
        revenue: m._sum.totalCost || 0
      }))
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
} 