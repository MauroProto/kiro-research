// Rate limiting system for prompts per user

const MAX_PROMPTS = parseInt(process.env.MAX_PROMPTS_PER_USER || '2');

// In-memory store for development (use Redis/KV for production)
const userPromptCounts = new Map<string, { count: number; resetAt: number }>();

// Reset period: 24 hours
const RESET_PERIOD = 24 * 60 * 60 * 1000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  total: number;
  resetAt: number;
}

export function checkRateLimit(userId: string): RateLimitResult {
  const now = Date.now();
  const userData = userPromptCounts.get(userId);
  
  // Clean up expired entries
  if (userData && now > userData.resetAt) {
    userPromptCounts.delete(userId);
  }
  
  const currentData = userPromptCounts.get(userId);
  
  if (!currentData) {
    return {
      allowed: true,
      remaining: MAX_PROMPTS,
      total: MAX_PROMPTS,
      resetAt: now + RESET_PERIOD,
    };
  }
  
  return {
    allowed: currentData.count < MAX_PROMPTS,
    remaining: Math.max(0, MAX_PROMPTS - currentData.count),
    total: MAX_PROMPTS,
    resetAt: currentData.resetAt,
  };
}

export function incrementUsage(userId: string): RateLimitResult {
  const now = Date.now();
  let userData = userPromptCounts.get(userId);
  
  // Reset if expired
  if (userData && now > userData.resetAt) {
    userPromptCounts.delete(userId);
    userData = undefined;
  }
  
  if (!userData) {
    userData = {
      count: 0,
      resetAt: now + RESET_PERIOD,
    };
  }
  
  userData.count += 1;
  userPromptCounts.set(userId, userData);
  
  return {
    allowed: userData.count <= MAX_PROMPTS,
    remaining: Math.max(0, MAX_PROMPTS - userData.count),
    total: MAX_PROMPTS,
    resetAt: userData.resetAt,
  };
}

export function getRemainingPrompts(userId: string): number {
  const result = checkRateLimit(userId);
  return result.remaining;
}

