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

    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Get summary statistics
    const [
      overallStats,
      modelUsage,
      providerStats,
      accuracyByProvider,
      dailyUsage
    ] = await Promise.all([
      // Overall summary stats - using only existing columns for now
      prisma.usageRecord.aggregate({
        where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {},
        _sum: {
          apiCost: true, // Use existing apiCost column as estimated cost
          totalCost: true,
          inputTokens: true,
          outputTokens: true
        },
        _count: {
          id: true
        }
      }),

      // Model-by-model breakdown - using only existing columns
      prisma.usageRecord.groupBy({
        by: ['modelId', 'modelProvider'],
        where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {},
        _sum: {
          apiCost: true, // Use existing apiCost as estimated cost
          totalCost: true,
          inputTokens: true,
          outputTokens: true
        },
        _count: {
          id: true
        },
        orderBy: {
          _sum: {
            totalCost: 'desc'
          }
        }
      }),

      // Provider-level stats - using only existing columns
      prisma.usageRecord.groupBy({
        by: ['modelProvider'],
        where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {},
        _sum: {
          apiCost: true, // Use existing apiCost as estimated cost
          totalCost: true
        },
        _count: {
          id: true
        }
      }),

      // Simplified provider accuracy (empty for now until migration is applied)
      [],

      // Daily usage trend - using only existing columns
      prisma.usageRecord.groupBy({
        by: ['createdAt'],
        where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        _sum: {
          apiCost: true
        },
        _count: {
          id: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 30
      })
    ]);

    // Calculate summary metrics - simplified for existing columns only
    const totalRequests = overallStats._count.id || 0;
    const actualCostRequests = 0; // Will be populated once migration is applied
    const coverageRate = 0; // Will be calculated once migration is applied
    
    // Use existing apiCost as estimated cost for now
    const totalEstimated = overallStats._sum.apiCost || 0;
    const totalActual = null; // Will be populated once migration is applied
    const totalDelta = null; // Will be calculated once migration is applied
    const averageAccuracy = 0; // Will be calculated once migration is applied

    // Process model usage data
    const models = await Promise.all(modelUsage.map(async (model) => {
      // Get model display name from the models config if needed
      // For now, we'll use the modelId as display name
      const displayName = model.modelId.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Use existing apiCost as estimated cost for now
      const estimatedCost = model._sum.apiCost || 0;
      const actualCost = null; // Will be populated once migration is applied
      const delta = null; // Will be calculated once migration is applied
      const accuracy = null; // Will be calculated once migration is applied
      const hasActualData = false; // Will be true once migration is applied
      
      return {
        modelId: model.modelId,
        displayName,
        provider: model.modelProvider,
        usage: {
          count: model._count.id || 0,
          inputTokens: model._sum.inputTokens || 0,
          outputTokens: model._sum.outputTokens || 0,
          actualCostCount: 0 // Will be populated once migration is applied
        },
        costs: {
          estimated: estimatedCost,
          actual: actualCost,
          delta: delta,
          accuracy: accuracy,
          hasActualData: hasActualData
        }
      };
    }));

    // Process provider stats - simplified for existing columns only
    const providers = providerStats.map(provider => {
      const estimatedCost = provider._sum.apiCost || 0;
      const totalRequests = provider._count.id || 0;
      
      return {
        provider: provider.modelProvider,
        usage: {
          totalRequests,
          actualCostRequests: 0, // Will be populated once migration is applied
          coverage: 0 // Will be calculated once migration is applied
        },
        costs: {
          estimated: estimatedCost,
          actual: null, // Will be populated once migration is applied
          delta: null // Will be calculated once migration is applied
        },
        accuracy: {
          average: null, // Will be populated once migration is applied
          avgDelta: null, // Will be populated once migration is applied
          sampleSize: 0 // Will be populated once migration is applied
        }
      };
    });

    // Process daily usage data
    const dailyTrend = (dailyUsage as any[]).map(day => {
      const dateStr = day.createdAt.toISOString().split('T')[0];
      return {
        date: dateStr,
        estimatedCost: day._sum.apiCost || 0,
        actualCost: day._sum.apiCost || 0, // Same as estimated for now
        requestCount: day._count.id || 0,
        actualCostCount: 0,
        avgAccuracy: 0
      };
    });

    return NextResponse.json({
      summary: {
        totalEstimatedCost: totalEstimated,
        totalActualCost: totalActual > 0 ? totalActual : null,
        totalDelta: totalActual > 0 ? totalDelta : null,
        coverageRate,
        averageAccuracy,
        totalRequests,
        actualCostRequests
      },
      models,
      providers,
      dailyTrend,
      dateRange: {
        start: startDate,
        end: endDate
      }
    });

  } catch (error) {
    console.error('Usage analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage analytics' },
      { status: 500 }
    );
  }
}