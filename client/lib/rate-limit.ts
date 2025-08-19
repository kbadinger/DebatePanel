import { NextRequest } from 'next/server';

// Simple in-memory rate limiting (for basic protection)
// In production, consider using Redis or a dedicated rate limiting service
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitConfig {
  requests: number; // Number of requests allowed
  window: number;   // Time window in milliseconds
}

export function rateLimit(config: RateLimitConfig) {
  return (req: NextRequest): { success: boolean; limit: number; remaining: number; reset: number } => {
    const identifier = getClientIdentifier(req);
    const now = Date.now();
    const resetTime = now + config.window;

    const record = rateLimitMap.get(identifier);

    if (!record || now > record.resetTime) {
      // First request or window expired
      rateLimitMap.set(identifier, { count: 1, resetTime });
      return {
        success: true,
        limit: config.requests,
        remaining: config.requests - 1,
        reset: resetTime
      };
    }

    if (record.count >= config.requests) {
      // Rate limit exceeded
      return {
        success: false,
        limit: config.requests,
        remaining: 0,
        reset: record.resetTime
      };
    }

    // Increment count
    record.count++;
    return {
      success: true,
      limit: config.requests,
      remaining: config.requests - record.count,
      reset: record.resetTime
    };
  };
}

function getClientIdentifier(req: NextRequest): string {
  // Use IP address as identifier (with fallbacks)
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  return ip;
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Very strict for expensive operations
  debate: rateLimit({ requests: 5, window: 60000 }), // 5 debates per minute
  
  // Moderate for API calls
  api: rateLimit({ requests: 30, window: 60000 }), // 30 requests per minute
  
  // Lenient for authentication
  auth: rateLimit({ requests: 10, window: 60000 }), // 10 auth attempts per minute
  
  // Strict for payments
  payment: rateLimit({ requests: 3, window: 60000 }), // 3 payment attempts per minute
  
  // Very strict for webhooks
  webhook: rateLimit({ requests: 100, window: 60000 }), // 100 webhook calls per minute
};

// Helper to create rate limit response
export function createRateLimitResponse(
  limit: number,
  remaining: number, 
  reset: number,
  message: string = 'Too many requests'
): Response {
  return new Response(
    JSON.stringify({ 
      error: message,
      retryAfter: Math.ceil((reset - Date.now()) / 1000)
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
        'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
      },
    }
  );
}

// Cleanup old entries (run periodically)
export function cleanupRateLimitMap() {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof window === 'undefined') { // Server-side only
  setInterval(cleanupRateLimitMap, 5 * 60 * 1000);
}