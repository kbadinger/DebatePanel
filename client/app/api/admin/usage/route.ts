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
      // Overall summary stats
      prisma.usageRecord.aggregate({
        where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {},
        _sum: {
          estimatedApiCost: true,
          actualApiCost: true,
          apiCost: true, // Fallback for records without estimatedApiCost
          totalCost: true,
          inputTokens: true,
          outputTokens: true
        },
        _avg: {
          costAccuracy: true
        },
        _count: {
          hasActualCost: true,
          id: true
        }
      }),

      // Model-by-model breakdown
      prisma.usageRecord.groupBy({
        by: ['modelId', 'modelProvider'],
        where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {},
        _sum: {
          estimatedApiCost: true,
          actualApiCost: true,
          apiCost: true, // Fallback for records without estimatedApiCost
          totalCost: true,
          inputTokens: true,
          outputTokens: true
        },
        _avg: {
          costAccuracy: true
        },
        _count: {
          id: true,
          hasActualCost: true
        },
        orderBy: {
          _sum: {
            totalCost: 'desc'
          }
        }
      }),

      // Provider-level stats
      prisma.usageRecord.groupBy({
        by: ['modelProvider'],
        where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {},
        _sum: {
          estimatedApiCost: true,
          actualApiCost: true,
          apiCost: true, // Fallback for records without estimatedApiCost
          totalCost: true
        },
        _avg: {
          costAccuracy: true
        },
        _count: {
          id: true,
          hasActualCost: true
        }
      }),

      // Accuracy metrics by provider (only records with actual costs)
      prisma.usageRecord.groupBy({
        by: ['modelProvider'],
        where: {
          hasActualCost: true,
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {})
        },
        _avg: {
          costAccuracy: true,
          costDelta: true
        },
        _count: {
          id: true
        }
      }),

      // Daily usage trend
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          SUM(estimated_api_cost) as estimated_cost,
          SUM(actual_api_cost) as actual_cost,
          COUNT(*) as request_count,
          COUNT(CASE WHEN has_actual_cost = true THEN 1 END) as actual_cost_count,
          AVG(CASE WHEN has_actual_cost = true THEN cost_accuracy END) as avg_accuracy
        FROM usage_record 
        ${Object.keys(dateFilter).length > 0 ? 
          `WHERE created_at >= ${startDate ? `'${startDate}'` : 'created_at'} 
           AND created_at <= ${endDate ? `'${endDate}'` : 'created_at'}` : 
          'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
        }
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `
    ]);

    // Calculate summary metrics
    const totalRequests = overallStats._count.id || 0;
    const actualCostRequests = overallStats._count.hasActualCost || 0;
    const coverageRate = totalRequests > 0 ? actualCostRequests / totalRequests : 0;
    
    // Use estimatedApiCost if available, otherwise fall back to apiCost for backward compatibility
    const totalEstimated = overallStats._sum.estimatedApiCost || overallStats._sum.apiCost || 0;
    const totalActual = overallStats._sum.actualApiCost || 0;
    const totalDelta = totalActual > 0 ? totalActual - totalEstimated : null;
    const averageAccuracy = overallStats._avg.costAccuracy || 0;

    // Process model usage data
    const models = await Promise.all(modelUsage.map(async (model) => {
      // Get model display name from the models config if needed
      // For now, we'll use the modelId as display name
      const displayName = model.modelId.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Use estimatedApiCost if available, otherwise fall back to apiCost
      const estimatedCost = model._sum.estimatedApiCost || model._sum.apiCost || 0;
      const actualCost = model._sum.actualApiCost || 0;
      const delta = actualCost > 0 ? actualCost - estimatedCost : null;
      const accuracy = model._avg.costAccuracy || null;
      const hasActualData = (model._count.hasActualCost || 0) > 0;
      
      return {
        modelId: model.modelId,
        displayName,
        provider: model.modelProvider,
        usage: {
          count: model._count.id || 0,
          inputTokens: model._sum.inputTokens || 0,
          outputTokens: model._sum.outputTokens || 0,
          actualCostCount: model._count.hasActualCost || 0
        },
        costs: {
          estimated: estimatedCost,
          actual: actualCost || null,
          delta: hasActualData ? delta : null,
          accuracy: accuracy,
          hasActualData
        }
      };
    }));

    // Process provider stats
    const providers = providerStats.map(provider => {
      // Use estimatedApiCost if available, otherwise fall back to apiCost
      const estimatedCost = provider._sum.estimatedApiCost || provider._sum.apiCost || 0;
      const actualCost = provider._sum.actualApiCost || 0;
      const accuracy = provider._avg.costAccuracy || null;
      const totalRequests = provider._count.id || 0;
      const actualCostRequests = provider._count.hasActualCost || 0;
      const coverage = totalRequests > 0 ? actualCostRequests / totalRequests : 0;

      // Find detailed accuracy stats for this provider
      const accuracyStats = accuracyByProvider.find(a => a.modelProvider === provider.modelProvider);
      
      return {
        provider: provider.modelProvider,
        usage: {
          totalRequests,
          actualCostRequests,
          coverage
        },
        costs: {
          estimated: estimatedCost,
          actual: actualCost || null,
          delta: actualCost > 0 ? actualCost - estimatedCost : null
        },
        accuracy: {
          average: accuracy,
          avgDelta: accuracyStats?._avg.costDelta || null,
          sampleSize: accuracyStats?._count.id || 0
        }
      };
    });

    // Process daily usage data
    const dailyTrend = (dailyUsage as any[]).map(day => ({
      date: day.date,
      estimatedCost: parseFloat(day.estimated_cost || '0'),
      actualCost: parseFloat(day.actual_cost || '0'),
      requestCount: parseInt(day.request_count || '0'),
      actualCostCount: parseInt(day.actual_cost_count || '0'),
      avgAccuracy: parseFloat(day.avg_accuracy || '0')
    }));

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