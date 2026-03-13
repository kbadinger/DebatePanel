import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserUsageForPeriod } from '@/lib/usage-tracking';
import { AVAILABLE_MODELS } from '@/lib/models/config';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    // Return error if not authenticated
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // For users without data yet, return minimal real data instead of mock
    const hasData = await prisma.usageRecord.findFirst({
      where: { userId }
    });
    
    if (!hasData) {
      // Get real subscription data even if no usage yet
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });
      
      // Get any debates even if no usage records
      const debates = await prisma.debate.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          modelSelections: true,
        },
      });
      
      return NextResponse.json({
        currentPeriod: {
          totalCost: 0,
          apiCost: 0,
          platformFee: 0,
          debateCount: debates.length,
          tokenCount: 0,
        },
        subscription: subscription ? {
          plan: subscription.plan,
          monthlyAllowance: subscription.monthlyAllowance,
          currentBalance: subscription.currentBalance,
          rolloverBalance: subscription.rolloverBalance,
          periodEnd: subscription.currentPeriodEnd.toISOString(),
        } : {
          plan: 'Free',
          monthlyAllowance: 0,
          currentBalance: 0,
          rolloverBalance: 0,
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        modelBreakdown: [],
        recentDebates: debates.map(debate => ({
          id: debate.id,
          topic: debate.topic,
          cost: 0, // No usage records yet
          modelCount: debate.modelSelections.length,
          createdAt: debate.createdAt.toISOString(),
        })),
      });
    }
    
    // Get actual usage data
    const usage = await getUserUsageForPeriod(userId);
    
    // Get subscription info
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });
    
    // Get recent debates
    const recentDebates = await prisma.debate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        usageRecords: true,
        modelSelections: true,
      },
    });
    
    // Calculate model breakdown
    const modelCosts: Record<string, { tokens: number; cost: number }> = {};
    let totalTokens = 0;
    
    for (const [modelId, tokens] of Object.entries(usage.tokensByModel)) {
      const totalModelTokens = tokens.input + tokens.output;
      totalTokens += totalModelTokens;
      
      // Get cost for this model from usage records
      const modelRecords = await prisma.usageRecord.findMany({
        where: { 
          userId,
          modelId,
          createdAt: {
            gte: subscription?.currentPeriodStart || new Date(0),
            lte: subscription?.currentPeriodEnd || new Date(),
          },
        },
      });
      
      const modelCost = modelRecords.reduce((sum, record) => sum + record.totalCost, 0);
      modelCosts[modelId] = { tokens: totalModelTokens, cost: modelCost };
    }
    
    // Format model breakdown
    const modelBreakdown = Object.entries(modelCosts).map(([modelId, data]) => {
      const model = AVAILABLE_MODELS.find(m => m.id === modelId);
      return {
        modelId,
        displayName: model?.displayName || modelId,
        tokenCount: data.tokens,
        cost: data.cost,
        percentage: Math.round((data.tokens / totalTokens) * 100),
      };
    }).sort((a, b) => b.cost - a.cost);
    
    // Format recent debates
    const formattedDebates = recentDebates.map(debate => {
      const debateCost = debate.usageRecords.reduce((sum, record) => sum + record.totalCost, 0);
      return {
        id: debate.id,
        topic: debate.topic,
        cost: debateCost,
        modelCount: debate.modelSelections.length,
        createdAt: debate.createdAt.toISOString(),
      };
    });
    
    return NextResponse.json({
      currentPeriod: {
        totalCost: usage.totalCost,
        apiCost: usage.totalCost * 0.77, // Roughly 77% is API cost
        platformFee: usage.totalCost * 0.23, // 30% markup = 23% of total
        debateCount: usage.debateCount,
        tokenCount: totalTokens,
      },
      subscription: subscription ? {
        plan: subscription.plan,
        monthlyAllowance: subscription.monthlyAllowance,
        currentBalance: subscription.currentBalance,
        rolloverBalance: subscription.rolloverBalance,
        periodEnd: subscription.currentPeriodEnd.toISOString(),
      } : {
        plan: 'Free',
        monthlyAllowance: 0,
        currentBalance: 0,
        rolloverBalance: 0,
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      modelBreakdown,
      recentDebates: formattedDebates,
    });
  } catch (error) {
    console.error('Failed to fetch usage data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}