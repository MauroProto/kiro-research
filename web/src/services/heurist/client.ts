import { HEURIST_CONFIG, AgentId } from './config';

export interface HeuristRequest {
  agent_id: AgentId;
  input: {
    query?: string;
    tool?: string;
    tool_arguments?: Record<string, unknown>;
    raw_data_only?: boolean;
  };
}

export interface HeuristResponse<T = unknown> {
  result: T;
  success?: boolean;
  error?: string;
}

export interface AgentError {
  code: string;
  message: string;
  agent_id?: string;
}

// Cache for responses (saves credits)
const responseCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute cache

function getCacheKey(agentId: string, input: Record<string, unknown>): string {
  return `${agentId}:${JSON.stringify(input)}`;
}

/**
 * Base Heurist Mesh Client
 * Makes requests to the Heurist Mesh API
 */
export async function callHeuristAgent<T = unknown>(
  agentId: AgentId,
  input: HeuristRequest['input'],
  options: {
    useCache?: boolean;
    cacheTTL?: number;
    timeout?: number;
  } = {}
): Promise<HeuristResponse<T>> {
  const { useCache = true, cacheTTL = CACHE_TTL, timeout = 30000 } = options;

  // Check cache first
  if (useCache) {
    const cacheKey = getCacheKey(agentId, input);
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTTL) {
      console.log(`[Heurist] Cache hit for ${agentId}`);
      return { result: cached.data as T, success: true };
    }
  }

  console.log(`[Heurist] Calling agent: ${agentId}`, input);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${HEURIST_CONFIG.meshEndpoint}/mesh_request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: HEURIST_CONFIG.apiKey,
        agent_id: agentId,
        input,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Heurist] Error from ${agentId}:`, response.status, errorText);
      throw new Error(`Heurist API error: ${response.status} - ${errorText}`);
    }

    const rawData = await response.json();
    console.log(`[Heurist] Response from ${agentId}:`, rawData);

    // Heurist API returns { response: string, data: object }
    // We normalize this to { result: { response, data } } for consistency
    const result = {
      response: rawData.response || '',
      data: rawData.data || rawData.result || {},
    };

    // Cache successful response
    if (useCache) {
      const cacheKey = getCacheKey(agentId, input);
      responseCache.set(cacheKey, { data: result, timestamp: Date.now() });
    }

    return {
      result: result as T,
      success: true,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request to ${agentId} timed out after ${timeout}ms`);
    }

    throw error;
  }
}

/**
 * Clear the response cache
 */
export function clearCache(): void {
  responseCache.clear();
}

/**
 * Get estimated credits for an agent call
 */
export function getAgentCredits(agentId: AgentId): number {
  return HEURIST_CONFIG.credits[agentId] || 0;
}

/**
 * Check if an agent is free
 */
export function isAgentFree(agentId: AgentId): boolean {
  return getAgentCredits(agentId) === 0;
}
