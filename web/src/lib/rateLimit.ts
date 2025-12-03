// Rate limiting by IP address - Server-side, harder to bypass
// Uses Vercel's edge headers for real IP detection

const MAX_PROMPTS = parseInt(process.env.MAX_PROMPTS_PER_USER || '2');

// In-memory store - Note: This resets on cold starts in serverless
// For production persistence, use Vercel KV or Upstash Redis
const ipPromptCounts = new Map<string, { count: number; resetAt: number; fingerprint?: string }>();

// Reset period: 24 hours
const RESET_PERIOD = 24 * 60 * 60 * 1000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  total: number;
  resetAt: number;
  ip: string;
}

// Extract real IP from request headers (works on Vercel)
export function getClientIP(request: Request): string {
  // Vercel provides the real IP in these headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const vercelIP = request.headers.get('x-vercel-forwarded-for');
  
  // Priority: Vercel header > x-real-ip > x-forwarded-for (first IP)
  if (vercelIP) {
    return vercelIP.split(',')[0].trim();
  }
  if (realIP) {
    return realIP.trim();
  }
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  // Fallback (shouldn't happen on Vercel)
  return 'unknown';
}

// Generate a simple fingerprint from request headers
export function generateFingerprint(request: Request): string {
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLang = request.headers.get('accept-language') || '';
  const accept = request.headers.get('accept') || '';
  
  // Create a simple hash from headers
  const data = `${userAgent}|${acceptLang}|${accept}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Create a composite key from IP + fingerprint for better accuracy
function getCompositeKey(ip: string, fingerprint: string): string {
  return `${ip}:${fingerprint}`;
}

export function checkRateLimitByIP(request: Request): RateLimitResult {
  const now = Date.now();
  const ip = getClientIP(request);
  const fingerprint = generateFingerprint(request);
  const compositeKey = getCompositeKey(ip, fingerprint);
  
  // Clean up expired entries periodically
  if (Math.random() < 0.1) { // 10% chance to clean up
    cleanupExpired(now);
  }
  
  // Check by composite key first (IP + fingerprint)
  let userData = ipPromptCounts.get(compositeKey);
  
  // Also check by IP alone (catches VPN users changing fingerprint)
  const ipOnlyData = ipPromptCounts.get(ip);
  
  // Use the stricter limit
  if (ipOnlyData && (!userData || ipOnlyData.count > userData.count)) {
    userData = ipOnlyData;
  }
  
  // Reset if expired
  if (userData && now > userData.resetAt) {
    ipPromptCounts.delete(compositeKey);
    ipPromptCounts.delete(ip);
    userData = undefined;
  }
  
  if (!userData) {
    return {
      allowed: true,
      remaining: MAX_PROMPTS,
      total: MAX_PROMPTS,
      resetAt: now + RESET_PERIOD,
      ip: ip.slice(0, 8) + '***', // Partially masked for privacy
    };
  }
  
  return {
    allowed: userData.count < MAX_PROMPTS,
    remaining: Math.max(0, MAX_PROMPTS - userData.count),
    total: MAX_PROMPTS,
    resetAt: userData.resetAt,
    ip: ip.slice(0, 8) + '***',
  };
}

export function incrementUsageByIP(request: Request): RateLimitResult {
  const now = Date.now();
  const ip = getClientIP(request);
  const fingerprint = generateFingerprint(request);
  const compositeKey = getCompositeKey(ip, fingerprint);
  
  // Get or create data for composite key
  let compositeData = ipPromptCounts.get(compositeKey);
  if (!compositeData || now > compositeData.resetAt) {
    compositeData = {
      count: 0,
      resetAt: now + RESET_PERIOD,
      fingerprint,
    };
  }
  compositeData.count += 1;
  ipPromptCounts.set(compositeKey, compositeData);
  
  // Also track by IP alone
  let ipData = ipPromptCounts.get(ip);
  if (!ipData || now > ipData.resetAt) {
    ipData = {
      count: 0,
      resetAt: now + RESET_PERIOD,
    };
  }
  ipData.count += 1;
  ipPromptCounts.set(ip, ipData);
  
  // Return the higher count (stricter)
  const effectiveCount = Math.max(compositeData.count, ipData.count);
  
  return {
    allowed: effectiveCount <= MAX_PROMPTS,
    remaining: Math.max(0, MAX_PROMPTS - effectiveCount),
    total: MAX_PROMPTS,
    resetAt: compositeData.resetAt,
    ip: ip.slice(0, 8) + '***',
  };
}

function cleanupExpired(now: number): void {
  for (const [key, data] of ipPromptCounts.entries()) {
    if (now > data.resetAt) {
      ipPromptCounts.delete(key);
    }
  }
}

// Legacy functions for backward compatibility
export function checkRateLimit(userId: string): RateLimitResult {
  // This is now a fallback - prefer checkRateLimitByIP
  const data = ipPromptCounts.get(userId);
  const now = Date.now();
  
  if (!data || now > data.resetAt) {
    return {
      allowed: true,
      remaining: MAX_PROMPTS,
      total: MAX_PROMPTS,
      resetAt: now + RESET_PERIOD,
      ip: 'legacy',
    };
  }
  
  return {
    allowed: data.count < MAX_PROMPTS,
    remaining: Math.max(0, MAX_PROMPTS - data.count),
    total: MAX_PROMPTS,
    resetAt: data.resetAt,
    ip: 'legacy',
  };
}

export function incrementUsage(userId: string): RateLimitResult {
  const now = Date.now();
  let data = ipPromptCounts.get(userId);
  
  if (!data || now > data.resetAt) {
    data = { count: 0, resetAt: now + RESET_PERIOD };
  }
  
  data.count += 1;
  ipPromptCounts.set(userId, data);
  
  return {
    allowed: data.count <= MAX_PROMPTS,
    remaining: Math.max(0, MAX_PROMPTS - data.count),
    total: MAX_PROMPTS,
    resetAt: data.resetAt,
    ip: 'legacy',
  };
}

export function getRemainingPrompts(userId: string): number {
  const result = checkRateLimit(userId);
  return result.remaining;
}
