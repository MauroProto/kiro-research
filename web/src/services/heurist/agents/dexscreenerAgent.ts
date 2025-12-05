import { callHeuristAgent } from '../client';
import { HEURIST_CONFIG } from '../config';

/**
 * DexScreener Token Info Agent
 * Cost: 1 credit per use
 *
 * Official Tools:
 * - search_pairs: Search for trading pairs by token name, symbol, or address
 * - get_specific_pair_info: Get detailed info for a specific pair (needs chain + pair address)
 * - get_token_pairs: Get all trading pairs for a token on a specific chain
 *
 * Real-time DEX trading data across multiple chains
 */

export interface DexPair {
  chain: string;
  dex: string;
  pair_address: string;
  base_token: {
    address: string;
    name: string;
    symbol: string;
  };
  quote_token: {
    address: string;
    name: string;
    symbol: string;
  };
  price_usd: number;
  price_native: number;
  price_change_5m?: number;
  price_change_1h?: number;
  price_change_6h?: number;
  price_change_24h?: number;
  volume_24h: number;
  liquidity_usd: number;
  fdv?: number;
  market_cap?: number;
  txns_24h: {
    buys: number;
    sells: number;
  };
  created_at?: string;
}

export interface DexScreenerResponse {
  pairs: DexPair[];
  total_results: number;
}

/**
 * Search for trading pairs by token name, symbol, or address
 * Tool: search_pairs
 */
export async function searchToken(
  query: string
): Promise<DexScreenerResponse> {
  const response = await callHeuristAgent<DexScreenerResponse>(
    HEURIST_CONFIG.agents.dexscreener,
    {
      tool: 'search_pairs',
      tool_arguments: { search_term: query },
    },
    { useCache: true, cacheTTL: 30 * 1000 }
  );

  return {
    pairs: response.result.pairs || [],
    total_results: response.result.total_results || 0,
  };
}

/**
 * Get all trading pairs for a specific token on a chain
 * Tool: get_token_pairs
 */
export async function getTokenPairs(
  tokenAddress: string,
  chain: string
): Promise<DexScreenerResponse> {
  const response = await callHeuristAgent<DexScreenerResponse>(
    HEURIST_CONFIG.agents.dexscreener,
    {
      tool: 'get_token_pairs',
      tool_arguments: {
        chain,
        token_address: tokenAddress,
      },
    },
    { useCache: true, cacheTTL: 30 * 1000 }
  );

  return {
    pairs: response.result.pairs || [],
    total_results: response.result.total_results || 0,
  };
}

/**
 * Get detailed info for a specific trading pair
 * Tool: get_specific_pair_info
 *
 * Note: pair_address is the LP contract address, NOT the token address
 */
export async function getPairInfo(
  pairAddress: string,
  chain: string
): Promise<DexPair | null> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.dexscreener,
    {
      tool: 'get_specific_pair_info',
      tool_arguments: {
        chain,
        pair_address: pairAddress,
      },
    },
    { useCache: true, cacheTTL: 30 * 1000 }
  );

  return (response.result as { pair?: DexPair }).pair || null;
}

/**
 * Get token details by address (convenience function)
 */
export async function getTokenByAddress(
  address: string,
  chain: string
): Promise<{
  token: {
    address: string;
    name: string;
    symbol: string;
    chain: string;
  };
  pairs: DexPair[];
  best_pair: DexPair | null;
  total_liquidity: number;
  total_volume_24h: number;
}> {
  const response = await getTokenPairs(address, chain);

  const pairs = response.pairs || [];
  const bestPair = pairs.length > 0
    ? pairs.reduce((best, p) => (p.liquidity_usd > (best?.liquidity_usd || 0) ? p : best), pairs[0])
    : null;

  const token = bestPair?.base_token
    ? { ...bestPair.base_token, chain }
    : { address, name: '', symbol: '', chain };

  return {
    token,
    pairs,
    best_pair: bestPair,
    total_liquidity: pairs.reduce((sum, p) => sum + (p.liquidity_usd || 0), 0),
    total_volume_24h: pairs.reduce((sum, p) => sum + (p.volume_24h || 0), 0),
  };
}

/**
 * Get trending pairs from DexScreener
 * Uses QUERY mode for comprehensive response
 */
export async function getTrendingPairs(
  chain?: string
): Promise<{
  response: string;
  data?: unknown;
}> {
  const chainQuery = chain ? ` on ${chain}` : '';

  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.dexscreener,
    {
      query: `What are the top trending trading pairs${chainQuery} right now? Show me the hottest tokens with the highest volume and price momentum. Include token name, symbol, price, 24h change, volume, liquidity, and number of transactions. Focus on memecoins and new launches that are gaining traction.`,
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 2 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || "No trending pairs data available",
    data: result?.data,
  };
}

/**
 * Get top gainers
 */
export async function getTopGainers(
  options: { chain?: string; timeframe?: '5m' | '1h' | '6h' | '24h' } = {}
): Promise<{
  gainers: Array<{
    token: string;
    symbol: string;
    price_change: number;
    volume_24h: number;
    chain: string;
  }>;
}> {
  const { chain, timeframe = '24h' } = options;
  const chainQuery = chain ? ` on ${chain}` : '';

  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.dexscreener,
    {
      query: `What are the top gainers${chainQuery} in the last ${timeframe}? Show tokens with biggest price increases.`,
    },
    { useCache: true, cacheTTL: 60 * 1000 }
  );

  return response.result as {
    gainers: Array<{
      token: string;
      symbol: string;
      price_change: number;
      volume_24h: number;
      chain: string;
    }>;
  };
}

/**
 * Get top losers
 */
export async function getTopLosers(
  options: { chain?: string; timeframe?: '5m' | '1h' | '6h' | '24h' } = {}
): Promise<{
  losers: Array<{
    token: string;
    symbol: string;
    price_change: number;
    volume_24h: number;
    chain: string;
  }>;
}> {
  const { chain, timeframe = '24h' } = options;
  const chainQuery = chain ? ` on ${chain}` : '';

  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.dexscreener,
    {
      query: `What are the top losers${chainQuery} in the last ${timeframe}? Show tokens with biggest price drops.`,
    },
    { useCache: true, cacheTTL: 60 * 1000 }
  );

  return response.result as {
    losers: Array<{
      token: string;
      symbol: string;
      price_change: number;
      volume_24h: number;
      chain: string;
    }>;
  };
}

/**
 * Get new pairs (recently created)
 */
export async function getNewPairs(
  chain?: string
): Promise<{
  pairs: DexPair[];
}> {
  const chainQuery = chain ? ` on ${chain}` : '';

  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.dexscreener,
    {
      query: `Show me newly created trading pairs${chainQuery} from the last few hours. New token launches.`,
    },
    { useCache: true, cacheTTL: 60 * 1000 }
  );

  return response.result as {
    pairs: DexPair[];
  };
}

