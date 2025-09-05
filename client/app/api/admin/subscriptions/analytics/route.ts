import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { PrismaClient } from '@prisma/client';
import { stripe } from '@/lib/stripe';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get basic subscription metrics
    const [
      totalSubscriptions,
      planDistribution,
      recentSubscriptions,
      canceledSubscriptions,
      totalUsage,
      totalCreditsIssued,
      totalCreditsUsed
    ] = await Promise.all([
      // Total active subscriptions
      prisma.subscription.count({
        where: { status: 'active' }
      }),

      // Plan distribution
      prisma.subscription.groupBy({
        by: ['plan'],
        _count: { plan: true },
        where: { status: 'active' }
      }),

      // New subscriptions in period
      prisma.subscription.count({
        where: {
          createdAt: { gte: startDate },
          status: 'active'
        }
      }),

      // Canceled subscriptions in period
      prisma.subscription.count({
        where: {
          updatedAt: { gte: startDate },
          status: 'canceled'
        }
      }),

      // Total usage records in period
      prisma.usageRecord.aggregate({
        _sum: { totalCost: true },
        _count: { id: true },
        where: {
          createdAt: { gte: startDate }
        }
      }),

      // Total credits issued (monthly allowances)
      prisma.subscription.aggregate({
        _sum: { monthlyAllowance: true },
        where: { status: 'active' }
      }),

      // Total credits used (current balance vs allowance)
      prisma.subscription.findMany({
        select: {
          monthlyAllowance: true,
          currentBalance: true
        },
        where: { status: 'active' }
      })
    ]);

    // Calculate credit utilization
    const creditsUsed = totalCreditsUsed.reduce((sum, sub) => 
      sum + (sub.monthlyAllowance - sub.currentBalance), 0
    );
    const creditUtilization = totalCreditsIssued._sum.monthlyAllowance 
      ? (creditsUsed / totalCreditsIssued._sum.monthlyAllowance) * 100 
      : 0;

    // Calculate MRR from active subscriptions
    let monthlyRecurringRevenue = 0;
    for (const planGroup of planDistribution) {
      const planConfig = SUBSCRIPTION_PLANS[planGroup.plan as keyof typeof SUBSCRIPTION_PLANS];
      if (planConfig) {
        monthlyRecurringRevenue += planGroup._count.plan * planConfig.price;
      }
    }

    // Get Stripe revenue data for the period
    let stripeRevenue = 0;
    let stripeTransactions = 0;
    try {
      const charges = await stripe.charges.list({
        created: {
          gte: Math.floor(startDate.getTime() / 1000)
        },
        limit: 100
      });
      
      stripeRevenue = charges.data
        .filter(charge => charge.status === 'succeeded')
        .reduce((sum, charge) => sum + charge.amount, 0) / 100; // Convert cents to dollars
      
      stripeTransactions = charges.data.filter(charge => charge.status === 'succeeded').length;
    } catch (error) {
      console.error('Failed to fetch Stripe revenue data:', error);
    }

    // Get subscription growth trend (last 12 months)
    const growthData = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i, 1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      monthEnd.setHours(23, 59, 59, 999);

      const monthData = await prisma.subscription.groupBy({
        by: ['plan'],
        _count: { plan: true },
        where: {
          createdAt: { lte: monthEnd },
          OR: [
            { status: 'active' },
            { 
              status: 'canceled',
              updatedAt: { gt: monthEnd }
            }
          ]
        }
      });

      let monthMRR = 0;
      let monthTotal = 0;
      for (const planGroup of monthData) {
        const planConfig = SUBSCRIPTION_PLANS[planGroup.plan as keyof typeof SUBSCRIPTION_PLANS];
        if (planConfig) {
          monthMRR += planGroup._count.plan * planConfig.price;
          monthTotal += planGroup._count.plan;
        }
      }

      growthData.push({
        month: monthStart.toISOString().substr(0, 7), // YYYY-MM format
        subscriptions: monthTotal,
        mrr: monthMRR
      });
    }

    // Format plan distribution with names
    const formattedPlanDistribution = planDistribution.map(plan => ({
      plan: plan.plan,
      name: SUBSCRIPTION_PLANS[plan.plan as keyof typeof SUBSCRIPTION_PLANS]?.name || plan.plan,
      count: plan._count.plan,
      revenue: (SUBSCRIPTION_PLANS[plan.plan as keyof typeof SUBSCRIPTION_PLANS]?.price || 0) * plan._count.plan
    }));

    return NextResponse.json({
      overview: {
        totalSubscriptions,
        monthlyRecurringRevenue,
        newSubscriptions: recentSubscriptions,
        canceledSubscriptions,
        churnRate: totalSubscriptions > 0 ? (canceledSubscriptions / totalSubscriptions) * 100 : 0,
        arpu: totalSubscriptions > 0 ? monthlyRecurringRevenue / totalSubscriptions : 0
      },
      planDistribution: formattedPlanDistribution,
      usage: {
        totalCost: totalUsage._sum.totalCost || 0,
        totalRecords: totalUsage._count.id || 0,
        creditsIssued: totalCreditsIssued._sum.monthlyAllowance || 0,
        creditsUsed,
        creditUtilization: Math.round(creditUtilization)
      },
      stripe: {
        revenue: stripeRevenue,
        transactions: stripeTransactions
      },
      growth: growthData,
      period: parseInt(period)
    });
  } catch (error) {
    console.error('Admin subscription analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}