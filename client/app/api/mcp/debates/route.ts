import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authenticateMcpRequest, hasPermission, createMcpErrorResponse, logMcpRequest } from '@/lib/mcp-auth';
import { RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Apply general MCP rate limiting
    const rateLimitResult = RATE_LIMITS.mcp(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(
        rateLimitResult.limit,
        rateLimitResult.remaining,
        rateLimitResult.reset,
        'Too many MCP requests'
      );
    }

    // Authenticate MCP request
    const authResult = await authenticateMcpRequest(req);
    if (!authResult.success) {
      return createMcpErrorResponse(authResult.error || 'Authentication failed', 401);
    }

    // Check read permission
    if (!hasPermission(authResult.apiKey!, 'read')) {
      return createMcpErrorResponse('Permission denied: read access required', 403);
    }

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100); // Max 100
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status');

    // Build where clause
    const whereClause: any = authResult.user!.isAdmin 
      ? {} // Admin can see all debates
      : { userId: authResult.user!.id }; // Regular users see only their debates

    if (status && ['in_progress', 'completed', 'failed'].includes(status)) {
      whereClause.status = status;
    }

    // Fetch debates
    const debates = await prisma.debate.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      select: {
        id: true,
        topic: true,
        description: true,
        status: true,
        createdAt: true,
        completedAt: true,
        winner: true,
        finalSynthesis: true,
        participants: true,
        config: true,
        userId: authResult.user!.isAdmin ? true : undefined // Include userId for admin
      }
    });

    // Get total count for pagination
    const totalCount = await prisma.debate.count({
      where: whereClause
    });

    // Parse JSON fields and format response
    const formattedDebates = debates.map(debate => ({
      ...debate,
      participants: JSON.parse(debate.participants as string),
      config: JSON.parse(debate.config as string),
      participantCount: JSON.parse(debate.participants as string).length
    }));

    await logMcpRequest(authResult.user!.id, authResult.apiKey!.id, '/api/mcp/debates', 'GET', true);

    return new Response(
      JSON.stringify({
        success: true,
        debates: formattedDebates,
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + limit < totalCount
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error fetching MCP debates:', error);
    return createMcpErrorResponse('Failed to fetch debates', 500);
  }
}