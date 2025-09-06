import { NextRequest } from 'next/server';
import { authenticateMcpRequest, createMcpErrorResponse, logMcpRequest } from '@/lib/mcp-auth';
import { RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit';

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

    await logMcpRequest(authResult.user!.id, authResult.apiKey!.id, '/api/mcp/status', 'GET', true);

    return new Response(
      JSON.stringify({
        success: true,
        status: 'online',
        timestamp: new Date().toISOString(),
        user: {
          id: authResult.user!.id,
          email: authResult.user!.email,
          isAdmin: authResult.user!.isAdmin
        },
        apiKey: {
          id: authResult.apiKey!.id,
          name: authResult.apiKey!.name,
          permissions: authResult.apiKey!.permissions
        },
        version: '1.0.0'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('MCP status error:', error);
    return createMcpErrorResponse('Status check failed', 500);
  }
}