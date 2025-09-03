import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Get the same data the usage API returns
    const dailyUsage = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt" AT TIME ZONE 'UTC') as date,
        SUM("apiCost")::DECIMAL as "totalApiCost",
        COUNT(*)::INTEGER as "requestCount" 
      FROM "UsageRecord"
      WHERE "createdAt" >= ${new Date('2025-09-01')}
        AND "createdAt" <= ${new Date('2025-09-05')}
        AND "roundNumber" != 0
      GROUP BY DATE("createdAt" AT TIME ZONE 'UTC')
      ORDER BY DATE("createdAt" AT TIME ZONE 'UTC') DESC
      LIMIT 30
    `;

    return NextResponse.json({
      message: 'Debug daily data',
      data: dailyUsage,
      rawSampleRecords: await prisma.usageRecord.findMany({
        where: {
          createdAt: {
            gte: new Date('2025-09-02'),
            lt: new Date('2025-09-03')
          }
        },
        select: { createdAt: true, apiCost: true, roundNumber: true },
        take: 5,
        orderBy: { createdAt: 'desc' }
      })
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}