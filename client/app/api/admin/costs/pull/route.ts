import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { CostReconciliation } from '@/lib/cost-reconciliation';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { startDate, endDate, provider = 'all' } = body;

    // Validate dates
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { error: 'startDate must be before endDate' },
        { status: 400 }
      );
    }

    console.log(`[COST API] Pulling costs for ${provider} from ${startDate} to ${endDate}`);

    const reconciliation = new CostReconciliation();
    let results = [];

    try {
      if (provider === 'all') {
        // Fetch from all providers
        results = await reconciliation.fetchAllProviderCosts(start, end);
      } else if (provider === 'openai') {
        const result = await reconciliation.fetchOpenAICosts(start, end);
        results = [result];
      } else if (provider === 'anthropic') {
        const result = await reconciliation.fetchAnthropicCosts(start, end);
        results = [result];
      } else {
        return NextResponse.json(
          { error: 'Invalid provider. Must be "all", "openai", or "anthropic"' },
          { status: 400 }
        );
      }

      // Calculate summary statistics
      const summary = {
        totalProviders: results.length,
        totalCostsFetched: results.reduce((sum, r) => sum + r.totalFetched, 0),
        totalCostUSD: results.reduce((sum, r) => sum + r.totalCostUSD, 0),
        totalMatched: results.reduce((sum, r) => sum + r.matched, 0),
        totalUnmatched: results.reduce((sum, r) => sum + r.unmatched, 0),
        totalUpdated: results.reduce((sum, r) => sum + r.updated, 0),
      };

      console.log(`[COST API] Cost pulling complete:`, summary);

      return NextResponse.json({
        success: true,
        summary,
        results,
        timestamp: new Date().toISOString(),
      });

    } catch (reconciliationError) {
      console.error('[COST API] Reconciliation error:', reconciliationError);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch or reconcile costs',
        details: reconciliationError instanceof Error ? reconciliationError.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[COST API] Request processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process cost pull request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve reconciliation history/status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '7');

    // Get recent reconciliation statistics
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const since = new Date();
    since.setDate(since.getDate() - days);

    // For now, return empty data since production DB doesn't have the new columns yet
    const recentRecords = [];
    const reconciliationStats = [];

    // Once database migration is applied to production, this can be uncommented:
    /*
    const [recentRecords, reconciliationStats] = await Promise.all([
      // Recent records with actual costs
      prisma.usageRecord.findMany({
        where: {
          providerCostFetched: true,
          providerCostFetchedAt: {
            gte: since
          }
        },
        select: {
          id: true,
          modelId: true,
          modelProvider: true,
          createdAt: true,
          apiCost: true, // Use existing column instead of estimatedApiCost
          providerCostFetchedAt: true,
          reconciliationNotes: true,
        },
        orderBy: {
          providerCostFetchedAt: 'desc'
        },
        take: 50
      }),

      // Summary statistics
      prisma.usageRecord.groupBy({
        by: ['modelProvider', 'hasActualCost'],
        where: {
          createdAt: {
            gte: since
          }
        },
        _count: {
          id: true
        },
        _sum: {
          apiCost: true, // Use existing column
        }
      })
    ]);
    */

    await prisma.$disconnect();

    return NextResponse.json({
      recentRecords,
      reconciliationStats,
      period: {
        days,
        since: since.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[COST API] GET error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve reconciliation status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}