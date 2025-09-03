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
    const provider = url.searchParams.get('provider'); // Add provider filter

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Build provider filter
    const providerFilter = provider && provider !== 'all' ? { modelProvider: provider } : {};

    // Get summary statistics
    const [
      overallStats,
      modelUsage,
      providerStats,
      accuracyByProvider,
      dailyUsage,
      costReconciliationData
    ] = await Promise.all([
      // Overall summary stats - using only existing columns for now
      prisma.usageRecord.aggregate({
        where: { 
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
          ...providerFilter
        },
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
        where: { 
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
          ...providerFilter
        },
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
        where: { 
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
          ...providerFilter
        },
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

      // Daily usage trend - using raw SQL to group by date only
      (async () => {
        // Get default date range (last 30 days) or use provided filters
        const startDate = dateFilter.gte || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = dateFilter.lte || new Date();
        
        if (provider && provider !== 'all') {
          // With provider filter - EXCLUDE reconciliation records
          return await prisma.$queryRaw`
            SELECT 
              DATE("createdAt") as date,
              SUM("apiCost")::DECIMAL as "totalApiCost", 
              COUNT(*)::INTEGER as "requestCount"
            FROM "UsageRecord"
            WHERE "createdAt" >= ${startDate}
              AND "createdAt" <= ${endDate}
              AND "modelProvider" = ${provider}
              AND "roundNumber" != 0
            GROUP BY DATE("createdAt")
            ORDER BY DATE("createdAt") DESC
            LIMIT 30
          `;
        } else {
          // Without provider filter - EXCLUDE reconciliation records
          return await prisma.$queryRaw`
            SELECT 
              DATE("createdAt") as date,
              SUM("apiCost")::DECIMAL as "totalApiCost",
              COUNT(*)::INTEGER as "requestCount" 
            FROM "UsageRecord"
            WHERE "createdAt" >= ${startDate}
              AND "createdAt" <= ${endDate}
              AND "roundNumber" != 0
            GROUP BY DATE("createdAt")
            ORDER BY DATE("createdAt") DESC
            LIMIT 30
          `;
        }
      })(),

      // Cost reconciliation data (real costs from API providers)
      prisma.usageRecord.findMany({
        where: {
          roundNumber: 0, // Cost reconciliation marker
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }),
          ...providerFilter,
          OR: [
            { userId: { contains: 'system' } },
            { debateId: { contains: 'cost-reconciliation' } }
          ]
        },
        select: {
          modelId: true,
          modelProvider: true,
          apiCost: true, // This is the real cost from API
          createdAt: true,
          inputTokens: true,
          outputTokens: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ]);

    // Calculate summary metrics with real cost reconciliation data
    const totalRequests = overallStats._count.id || 0;
    
    // Calculate actual costs from reconciliation data
    const totalReconciledCost = costReconciliationData.reduce((sum, record) => sum + (record.apiCost || 0), 0);
    const reconciliationRecordCount = costReconciliationData.length;
    
    // Use existing apiCost as estimated cost
    const totalEstimated = overallStats._sum.apiCost || 0;
    const totalActual = totalReconciledCost > 0 ? totalReconciledCost : null;
    const totalDelta = totalActual ? totalActual - totalEstimated : null;
    const coverageRate = totalRequests > 0 ? reconciliationRecordCount / totalRequests : 0;
    const averageAccuracy = totalActual && totalEstimated > 0 ? 
      Math.min(totalActual, totalEstimated) / Math.max(totalActual, totalEstimated) : 0;

    // Process model usage data with reconciliation
    const models = await Promise.all(modelUsage.map(async (model) => {
      // Get model display name from the models config if needed
      // For now, we'll use the modelId as display name
      const displayName = model.modelId.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Find reconciliation data for this model
      const modelReconciliationData = costReconciliationData.filter(r => 
        r.modelId === model.modelId && r.modelProvider === model.modelProvider
      );
      
      const estimatedCost = model._sum.apiCost || 0;
      const actualCost = modelReconciliationData.reduce((sum, r) => sum + (r.apiCost || 0), 0);
      const hasActualData = actualCost > 0;
      const delta = hasActualData ? actualCost - estimatedCost : null;
      const accuracy = hasActualData && estimatedCost > 0 ? 
        Math.min(actualCost, estimatedCost) / Math.max(actualCost, estimatedCost) : null;
      
      return {
        modelId: model.modelId,
        displayName,
        provider: model.modelProvider,
        usage: {
          count: model._count.id || 0,
          inputTokens: model._sum.inputTokens || 0,
          outputTokens: model._sum.outputTokens || 0,
          actualCostCount: modelReconciliationData.length
        },
        costs: {
          estimated: estimatedCost,
          actual: hasActualData ? actualCost : null,
          delta: delta,
          accuracy: accuracy,
          hasActualData: hasActualData
        }
      };
    }));

    // Process provider stats with reconciliation data
    const providers = providerStats.map(provider => {
      const estimatedCost = provider._sum.apiCost || 0;
      const totalRequests = provider._count.id || 0;
      
      // Get reconciliation data for this provider
      const providerReconciliationData = costReconciliationData.filter(r => 
        r.modelProvider === provider.modelProvider
      );
      
      const actualCost = providerReconciliationData.reduce((sum, r) => sum + (r.apiCost || 0), 0);
      const actualCostRequests = providerReconciliationData.length;
      const hasActualData = actualCost > 0;
      const coverage = totalRequests > 0 ? actualCostRequests / totalRequests : 0;
      const delta = hasActualData ? actualCost - estimatedCost : null;
      
      // Calculate accuracy metrics
      let averageAccuracy = null;
      let avgDelta = null;
      if (hasActualData && estimatedCost > 0) {
        averageAccuracy = Math.min(actualCost, estimatedCost) / Math.max(actualCost, estimatedCost);
        avgDelta = delta / totalRequests; // Average delta per request
      }
      
      return {
        provider: provider.modelProvider,
        usage: {
          totalRequests,
          actualCostRequests,
          coverage
        },
        costs: {
          estimated: estimatedCost,
          actual: hasActualData ? actualCost : null,
          delta: delta
        },
        accuracy: {
          average: averageAccuracy,
          avgDelta: avgDelta,
          sampleSize: actualCostRequests
        }
      };
    });

    // Process daily usage data with reconciliation
    const dailyTrend = (dailyUsage as any[]).map(day => {
      const dateStr = day.date instanceof Date ? day.date.toISOString().split('T')[0] : day.date;
      
      // Find reconciliation data for this date
      const dayReconciliationData = costReconciliationData.filter(r => {
        const rDateStr = r.createdAt.toISOString().split('T')[0];
        return rDateStr === dateStr;
      });
      
      const actualCost = dayReconciliationData.reduce((sum, r) => sum + (r.apiCost || 0), 0);
      const actualCostCount = dayReconciliationData.length;
      const hasActualData = actualCost > 0;
      const estimatedCost = Number(day.totalApiCost) || 0;
      
      // Calculate average accuracy for the day
      let avgAccuracy = 0;
      if (hasActualData && estimatedCost > 0) {
        avgAccuracy = Math.min(actualCost, estimatedCost) / Math.max(actualCost, estimatedCost);
      }
      
      return {
        date: dateStr,
        estimatedCost,
        actualCost: hasActualData ? actualCost : null,
        requestCount: Number(day.requestCount) || 0,
        actualCostCount,
        avgAccuracy: hasActualData ? avgAccuracy : null
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
        actualCostRequests: reconciliationRecordCount
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