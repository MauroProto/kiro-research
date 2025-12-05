import { callHeuristAgent } from '../client';
import { HEURIST_CONFIG } from '../config';

/**
 * Trending Token Agent
 * Cost: 1 credit
 *
 * Aggregates trending tokens from multiple sources (GMGN, CoinGecko, Pump.fun, DexScreener, Twitter)
 * Uses QUERY mode since no specific tools are documented
 */

export interface TrendingToken {
  name: string;
  symbol: string;
  price?: number;
  price_change_24h?: number;
  volume_24h?: number;
  market_cap?: number;
  source: string;
}

/**
 * Get trending tokens from all sources
 */
export async function getTrendingTokens(): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.trending,
    {
      query: "What are the top trending tokens right now? Include tokens from all sources like GMGN, CoinGecko, Pump.fun, DexScreener. List the token name, symbol, price change, and source.",
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 2 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || "No trending data available",
    data: result?.data,
  };
}

/**
 * Get trending memecoins specifically
 */
export async function getTrendingMemecoins(): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.trending,
    {
      query: "What are the top trending memecoins right now? Focus on memecoins specifically. Include name, symbol, price, 24h change, volume, and which platform they're trending on.",
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 2 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || "No memecoin data available",
    data: result?.data,
  };
}

/**
 * Get trending on specific chain
 */
export async function getTrendingOnChain(chain: 'solana' | 'base' | 'ethereum'): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.trending,
    {
      query: `What are the top trending tokens on ${chain} right now? Include token name, symbol, price, 24h change, volume, and market cap where available.`,
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 2 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || `No ${chain} trending data available`,
    data: result?.data,
  };
}
