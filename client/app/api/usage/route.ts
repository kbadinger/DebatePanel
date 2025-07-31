import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserUsageForPeriod } from '@/lib/usage-tracking';
import { AVAILABLE_MODELS } from '@/lib/models/config';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // TODO: Get userId from session when auth is implemented
    const userId = null;
    
    // For now, return mock data
    if (!userId) {
      return NextResponse.json({
        currentPeriod: {
          totalCost: 0.45,
          apiCost: 0.35,
          platformFee: 0.10,
          debateCount: 3,
          tokenCount: 15000,
        },
        subscription: {
          plan: 'Free Trial',
          monthlyAllowance: 5.00,
          currentBalance: 4.55,
          rolloverBalance: 0,
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        modelBreakdown: [
          {
            modelId: 'gpt-4.1',
            displayName: 'GPT-4.1',
            tokenCount: 5000,
            cost: 0.15,
            percentage: 33,
          },
          {
            modelId: 'claude-sonnet-4',
            displayName: 'Claude Sonnet 4',
            tokenCount: 5000,
            cost: 0.15,
            percentage: 33,
          },
          {
            modelId: 'gemini-2.5-pro',
            displayName: 'Gemini 2.5 Pro',
            tokenCount: 5000,
            cost: 0.15,
            percentage: 33,
          },
        ],
        recentDebates: [
          {
            id: '1',
            topic: 'Should we use keyless or BYOK pricing model?',
            cost: 0.15,
            modelCount: 3,
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '2',
            topic: 'Mobile app vs Web app first?',
            cost: 0.15,
            modelCount: 3,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '3',
            topic: 'React vs Vue for the frontend?',
            cost: 0.15,
            modelCount: 3,
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
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