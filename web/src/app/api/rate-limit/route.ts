import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitByIP } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  // Check rate limit by IP address (server-side)
  const result = checkRateLimitByIP(request);
  
  return NextResponse.json({
    allowed: result.allowed,
    remaining: result.remaining,
    total: result.total,
    resetAt: result.resetAt,
  });
}
