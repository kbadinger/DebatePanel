import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { PrismaClient } from '@prisma/client';

async function handleRequest(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const prisma = new PrismaClient();
    const url = new URL(req.url);
    const hours = parseInt(url.searchParams.get('hours') || '24');

    const since = new Date();
    since.setHours(since.getHours() - hours);

    console.log(`[TEST DB] Querying cost reconciliation records from last ${hours} hours`);

    // Query for system-created cost reconciliation records
    const costRecords = await prisma.usageRecord.findMany({
      where: {
        createdAt: { gte: since },
        OR: [
          { userId: { contains: 'system' } },
          { debateId: { contains: 'cost-reconciliation' } },
          { roundNumber: 0 } // Cost reconciliation uses roundNumber 0
        ]
      },
      select: {
        id: true,
        userId: true,
        debateId: true,
        roundNumber: true,
        modelId: true,
        modelProvider: true,
        inputTokens: true,
        outputTokens: true,
        apiCost: true,
        // actualApiCost: true,            // Disabled for backward compatibility
        // estimatedApiCost: true,         // Disabled for backward compatibility
        // costDelta: true,                // Disabled for backward compatibility
        // hasActualCost: true,            // Disabled for backward compatibility
        // costSource: true,               // Disabled for backward compatibility
        // providerCostFetched: true,      // Disabled for backward compatibility  
        // providerCostFetchedAt: true,    // Disabled for backward compatibility
        // reconciliationNotes: true,      // Disabled for backward compatibility
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Also get some stats and sample records to debug
    const totalCostRecords = await prisma.usageRecord.count({
      where: {
        OR: [
          { userId: { contains: 'system' } },
          { debateId: { contains: 'cost-reconciliation' } },
          { roundNumber: 0 }
        ]
      }
    });

    // Get ALL cost records regardless of date to debug
    const allCostRecords = await prisma.usageRecord.findMany({
      where: {
        OR: [
          { userId: { contains: 'system' } },
          { debateId: { contains: 'cost-reconciliation' } },
          { roundNumber: 0 }
        ]
      },
      select: {
        id: true,
        userId: true,
        debateId: true,
        roundNumber: true,
        modelId: true,
        modelProvider: true,
        createdAt: true,
        // actualApiCost: true,        // Disabled for backward compatibility
        // estimatedApiCost: true,     // Disabled for backward compatibility  
        // hasActualCost: true,        // Disabled for backward compatibility
        // reconciliationNotes: true,  // Disabled for backward compatibility
      },
      orderBy: { createdAt: 'desc' },
      take: 5 // Just show 5 most recent
    });

    // Disabled for backward compatibility - hasActualCost field not available
    const totalWithActualCosts = 0; // await prisma.usageRecord.count({
    //   where: {
    //     hasActualCost: true,
    //     OR: [
    //       { userId: { contains: 'system' } },
    //       { debateId: { contains: 'cost-reconciliation' } },
    //       { roundNumber: 0 }
    //     ]
    //   }
    // });

    // Get system user info
    const systemUser = await prisma.user.findFirst({
      where: { email: 'system@cost-reconciliation.internal' },
      select: { id: true, email: true, name: true, isAdmin: true, createdAt: true }
    });

    // Get system debate info
    const systemDebate = await prisma.debate.findFirst({
      where: { id: { contains: 'cost-reconciliation-system' } },
      select: { id: true, topic: true, description: true, createdAt: true }
    });

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      queryParams: {
        hours,
        since: since.toISOString()
      },
      statistics: {
        totalCostRecords,
        totalWithActualCosts,
        recentRecordsFound: costRecords.length,
        accuracyRate: totalCostRecords > 0 ? (totalWithActualCosts / totalCostRecords * 100).toFixed(1) + '%' : '0%'
      },
      systemEntities: {
        user: systemUser,
        debate: systemDebate
      },
      recentRecords: costRecords.map(record => ({
        ...record,
        createdAt: record.createdAt.toISOString(),
        // Add backward compatibility fields
        actualApiCost: null,
        estimatedApiCost: null,
        hasActualCost: false,
        providerCostFetchedAt: null,
        reconciliationNotes: null
      })),
      allCostRecords: allCostRecords.map(record => ({
        ...record,
        createdAt: record.createdAt.toISOString(),
        // Add backward compatibility fields
        actualApiCost: null,
        estimatedApiCost: null,
        hasActualCost: false,
        reconciliationNotes: null
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[TEST DB] Query error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Database query failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}