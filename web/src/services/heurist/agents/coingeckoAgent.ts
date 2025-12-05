import { callHeuristAgent } from '../client';
import { HEURIST_CONFIG } from '../config';

/**
 * CoinGecko Token Info Agent
 * Cost: FREE
 *
 * Fetch token information, market data, trending coins, and category data from CoinGecko.
 *
 * Official Tools:
 * - get_token_info: Get detailed token information by CoinGecko ID
 * - get_trending_coins: Get today's trending cryptocurrencies
 * - get_token_price_multi: Fetch price data for multiple tokens
 * - get_categories_list: Get all available cryptocurrency categories
 * - get_category_data: Get market data for all categories
 * - get_tokens_by_category: Get tokens within a specific category
 * - get_trending_pools: Get top 10 trending onchain pools
 * - get_top_token_holders: Get top 50 token holders for a token on a network
 */

export interface TokenInfo {
  id: string;
  symbol: string;
  name: string;
  description?: string;
  image?: string;
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    total_volume: { usd: number };
    price_change_24h: number;
    price_change_percentage_24h: number;
    price_change_percentage_7d?: number;
    price_change_percentage_30d?: number;
    ath: { usd: number };
    atl: { usd: number };
    circulating_supply?: number;
    total_supply?: number;
    max_supply?: number;
  };
  links?: {
    homepage?: string[];
    twitter_screen_name?: string;
    telegram_channel_identifier?: string;
    subreddit_url?: string;
    repos_url?: { github?: string[] };
  };
}

export interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank?: number;
  thumb?: string;
  price_btc?: number;
  score?: number;
  data?: {
    price: number;
    price_change_percentage_24h?: { usd?: number };
    market_cap?: string;
    total_volume?: string;
  };
}

export interface Category {
  id: string;
  name: string;
}

export interface CategoryData {
  id: string;
  name: string;
  market_cap?: number;
  market_cap_change_24h?: number;
  volume_24h?: number;
  top_3_coins?: string[];
}

export interface TrendingPool {
  id: string;
  name: string;
  chain: string;
  dex: string;
  token0: { symbol: string; name: string };
  token1: { symbol: string; name: string };
  reserve_in_usd?: number;
  volume_24h?: number;
}

/**
 * Get detailed token information by CoinGecko ID
 * Uses query mode for better reliability
 */
export async function getTokenInfo(
  coingeckoId: string
): Promise<{ response: string; data?: TokenInfo }> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.coingecko,
    {
      query: `Get detailed information about the cryptocurrency "${coingeckoId}". Include current price, 24h price change, market cap, trading volume, all-time high, all-time low, and circulating supply. Provide a brief analysis of its recent performance.`,
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: TokenInfo;
  };

  return {
    response: result?.response || "No token data available",
    data: result?.data,
  };
}

/**
 * Get today's trending cryptocurrencies
 * Uses QUERY mode for comprehensive response
 */
export async function getTrendingCoins(): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.coingecko,
    {
      query: "What are the top trending cryptocurrencies on CoinGecko today? Show me the hottest coins with the most search interest and momentum. Include coin name, symbol, current price, 24h price change, market cap, volume, and market cap rank. Explain why each one is trending.",
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 5 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || "No trending coins data available",
    data: result?.data,
  };
}

/**
 * Fetch price data for multiple tokens
 * Tool: get_token_price_multi
 *
 * Returns current price, market cap, 24hr volume, 24hr change %
 */
export async function getMultiTokenPrices(
  ids: string[]
): Promise<Record<string, {
  usd: number;
  usd_market_cap?: number;
  usd_24h_vol?: number;
  usd_24h_change?: number;
}>> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.coingecko,
    {
      tool: 'get_token_price_multi',
      tool_arguments: { ids: ids.join(',') },
    },
    { useCache: true, cacheTTL: 30 * 1000 }
  );

  const result = response.result as {
    response?: string;
    data?: Record<string, {
      usd: number;
      usd_market_cap?: number;
      usd_24h_vol?: number;
      usd_24h_change?: number;
    }>;
  };

  return result?.data || {};
}

/**
 * Get list of all available cryptocurrency categories
 * Tool: get_categories_list
 */
export async function getCategoriesList(): Promise<Category[]> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.coingecko,
    {
      tool: 'get_categories_list',
      tool_arguments: {},
    },
    { useCache: true, cacheTTL: 60 * 60 * 1000 } // 1 hour cache
  );

  const result = response.result as {
    response?: string;
    data?: Category[];
  };

  return result?.data || [];
}

/**
 * Get market data for all cryptocurrency categories
 * Tool: get_category_data
 */
export async function getCategoryData(): Promise<CategoryData[]> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.coingecko,
    {
      tool: 'get_category_data',
      tool_arguments: {},
    },
    { useCache: true, cacheTTL: 10 * 60 * 1000 }
  );

  const result = response.result as {
    response?: string;
    data?: CategoryData[];
  };

  return result?.data || [];
}

/**
 * Get tokens within a specific category
 * Tool: get_tokens_by_category
 */
export async function getTokensByCategory(
  categoryId: string
): Promise<Array<{
  id: string;
  symbol: string;
  name: string;
  current_price?: number;
  market_cap?: number;
  total_volume?: number;
  price_change_percentage_24h?: number;
}>> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.coingecko,
    {
      tool: 'get_tokens_by_category',
      tool_arguments: { category: categoryId },
    },
    { useCache: true, cacheTTL: 5 * 60 * 1000 }
  );

  const result = response.result as {
    response?: string;
    data?: Array<{
      id: string;
      symbol: string;
      name: string;
      current_price?: number;
      market_cap?: number;
      total_volume?: number;
      price_change_percentage_24h?: number;
    }>;
  };

  return result?.data || [];
}

/**
 * Get top 10 trending onchain pools
 * Tool: get_trending_pools
 */
export async function getTrendingPools(): Promise<TrendingPool[]> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.coingecko,
    {
      tool: 'get_trending_pools',
      tool_arguments: {},
    },
    { useCache: true, cacheTTL: 5 * 60 * 1000 }
  );

  const result = response.result as {
    response?: string;
    data?: TrendingPool[];
  };

  return result?.data || [];
}

/**
 * Get top 50 token holders for a token on a specific network
 * Tool: get_top_token_holders
 */
export async function getTopTokenHolders(
  tokenAddress: string,
  network: string
): Promise<Array<{
  address: string;
  balance: number;
  percentage?: number;
}>> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.coingecko,
    {
      tool: 'get_top_token_holders',
      tool_arguments: {
        token_address: tokenAddress,
        network,
      },
    },
    { useCache: true, cacheTTL: 10 * 60 * 1000 }
  );

  const result = response.result as {
    response?: string;
    data?: Array<{
      address: string;
      balance: number;
      percentage?: number;
    }>;
  };

  return result?.data || [];
}
