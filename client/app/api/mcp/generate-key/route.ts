import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { PrismaClient } from '@prisma/client';
import { generateMcpApiKey, hashApiKey, createMcpErrorResponse } from '@/lib/mcp-auth';
import { RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  // Apply rate limiting for admin operations
  const rateLimitResult = RATE_LIMITS.mcpAdmin(req);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(
      rateLimitResult.limit,
      rateLimitResult.remaining,
      rateLimitResult.reset,
      'Too many MCP admin requests. Please wait before trying again.'
    );
  }

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createMcpErrorResponse('Authentication required', 401);
    }

    // Check admin privileges
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true, email: true }
    });

    if (!user?.isAdmin) {
      return createMcpErrorResponse('Admin privileges required', 403);
    }

    const { name, permissions, expiresInDays } = await req.json();

    // Validate input
    if (!name || typeof name !== 'string') {
      return createMcpErrorResponse('Name is required and must be a string', 400);
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return createMcpErrorResponse('Permissions array is required', 400);
    }

    const validPermissions = ['read', 'write', 'debate_create', 'admin'];
    const invalidPerms = permissions.filter(p => !validPermissions.includes(p));
    if (invalidPerms.length > 0) {
      return createMcpErrorResponse(`Invalid permissions: ${invalidPerms.join(', ')}`, 400);
    }

    const expireDays = expiresInDays && typeof expiresInDays === 'number' ? expiresInDays : 90;
    if (expireDays < 1 || expireDays > 365) {
      return createMcpErrorResponse('expiresInDays must be between 1 and 365', 400);
    }

    // Check if user already has an MCP key (one per user limit)
    const existingKey = await prisma.mcpApiKey.findUnique({
      where: { userId: session.user.id }
    });

    if (existingKey) {
      return createMcpErrorResponse('User already has an MCP API key. Revoke the existing key first.', 409);
    }

    // Generate new API key
    const apiKey = generateMcpApiKey();
    const keyHash = hashApiKey(apiKey);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expireDays);

    // Store in database
    const mcpKey = await prisma.mcpApiKey.create({
      data: {
        userId: session.user.id,
        keyHash,
        name,
        permissions,
        expiresAt,
        isActive: true
      }
    });

    console.log(`MCP API key generated for admin user ${user.email}: ${name}`);

    // Return the key (ONLY this once - it won't be stored in plain text)
    return new Response(
      JSON.stringify({
        success: true,
        apiKey, // The actual key - save this securely!
        keyId: mcpKey.id,
        name,
        permissions,
        expiresAt: expiresAt.toISOString(),
        warning: 'Save this API key securely - it will not be shown again!'
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error generating MCP API key:', error);
    return createMcpErrorResponse('Failed to generate API key', 500);
  }
}

export async function GET(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = RATE_LIMITS.mcpAdmin(req);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(
      rateLimitResult.limit,
      rateLimitResult.remaining,
      rateLimitResult.reset,
      'Too many requests'
    );
  }

  try {
    // Check authentication and admin privileges
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createMcpErrorResponse('Authentication required', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true }
    });

    if (!user?.isAdmin) {
      return createMcpErrorResponse('Admin privileges required', 403);
    }

    // Get current user's MCP key info (without the actual key)
    const mcpKey = await prisma.mcpApiKey.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        mcpKey: mcpKey || null
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error fetching MCP API key info:', error);
    return createMcpErrorResponse('Failed to fetch API key info', 500);
  }
}

export async function DELETE(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = RATE_LIMITS.mcpAdmin(req);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(
      rateLimitResult.limit,
      rateLimitResult.remaining,
      rateLimitResult.reset,
      'Too many requests'
    );
  }

  try {
    // Check authentication and admin privileges
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createMcpErrorResponse('Authentication required', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true, email: true }
    });

    if (!user?.isAdmin) {
      return createMcpErrorResponse('Admin privileges required', 403);
    }

    // Delete the user's MCP key
    const deletedKey = await prisma.mcpApiKey.delete({
      where: { userId: session.user.id }
    });

    console.log(`MCP API key revoked for admin user ${user.email}: ${deletedKey.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'MCP API key revoked successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error revoking MCP API key:', error);
    return createMcpErrorResponse('Failed to revoke API key', 500);
  }
}