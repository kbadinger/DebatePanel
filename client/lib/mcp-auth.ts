import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

export interface McpAuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    isAdmin: boolean;
    name?: string;
  };
  apiKey?: {
    id: string;
    name: string;
    permissions: string[];
  };
  error?: string;
}

/**
 * Authenticate MCP API requests
 * Expects X-MCP-API-Key header with the API key
 */
export async function authenticateMcpRequest(req: NextRequest): Promise<McpAuthResult> {
  try {
    const apiKey = req.headers.get('x-mcp-api-key');
    
    if (!apiKey) {
      return {
        success: false,
        error: 'Missing X-MCP-API-Key header'
      };
    }

    // Validate API key format (should be 64 characters hex)
    if (!/^[a-f0-9]{64}$/i.test(apiKey)) {
      return {
        success: false,
        error: 'Invalid API key format'
      };
    }

    // Hash the provided key to compare with stored hash
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    // Find the API key in database
    const mcpKey = await prisma.mcpApiKey.findFirst({
      where: {
        keyHash,
        isActive: true,
        expiresAt: {
          gt: new Date() // Key must not be expired
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isAdmin: true,
            name: true
          }
        }
      }
    });

    if (!mcpKey) {
      return {
        success: false,
        error: 'Invalid or expired API key'
      };
    }

    // Update last used timestamp
    await prisma.mcpApiKey.update({
      where: { id: mcpKey.id },
      data: { lastUsedAt: new Date() }
    });

    // Parse permissions from JSON
    const permissions = Array.isArray(mcpKey.permissions) 
      ? mcpKey.permissions as string[]
      : [];

    return {
      success: true,
      user: mcpKey.user,
      apiKey: {
        id: mcpKey.id,
        name: mcpKey.name,
        permissions
      }
    };

  } catch (error) {
    console.error('MCP authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}

/**
 * Check if user has specific permission
 */
export function hasPermission(apiKey: { permissions: string[] }, permission: string): boolean {
  return apiKey.permissions.includes(permission) || apiKey.permissions.includes('admin');
}

/**
 * Generate a new MCP API key (for admin use)
 */
export function generateMcpApiKey(): string {
  return createHash('sha256')
    .update(Date.now() + Math.random().toString())
    .digest('hex');
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Create MCP error response
 */
export function createMcpErrorResponse(message: string, status: number = 401): Response {
  return new Response(
    JSON.stringify({ 
      error: message,
      timestamp: new Date().toISOString()
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-MCP-Error': 'true'
      }
    }
  );
}

/**
 * Log MCP request for monitoring
 */
export async function logMcpRequest(
  userId: string,
  apiKeyId: string,
  endpoint: string,
  method: string,
  success: boolean,
  error?: string
) {
  try {
    // This could be enhanced to use a dedicated logging service
    console.log('MCP Request:', {
      userId,
      apiKeyId,
      endpoint,
      method,
      success,
      error,
      timestamp: new Date().toISOString()
    });
    
    // In production, you might want to store this in a dedicated logs table
    // or send to a monitoring service like DataDog, New Relic, etc.
  } catch (logError) {
    console.error('Failed to log MCP request:', logError);
  }
}