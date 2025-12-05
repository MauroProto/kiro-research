import { callHeuristAgent } from '../client';
import { HEURIST_CONFIG } from '../config';

/**
 * Solana Token Info Agent (Bitquery)
 * Cost: FREE
 *
 * Comprehensive analysis of Solana tokens using Bitquery API.
 * Analyze token metrics (volume, price, liquidity), track holders and buyers,
 * monitor trading activity, and identify trending tokens.
 *
 * Official Tools:
 * - query_token_metrics: Get detailed token trading metrics
 * - query_token_holders: Fetch top token holders and distribution
 * - query_token_buyers: Fetch first buyers (likely insiders/smart money)
 * - query_top_traders: Fetch top traders by volume (whales, arbitrage bots)
 * - query_holder_status: Check if buyers are holding, sold, or bought more
 * - get_top_trending_tokens: Get current top trending tokens on Solana
 */

export interface TokenMetrics {
  mint_address: string;
  symbol?: string;
  name?: string;
  price_usd?: number;
  price_change_24h?: number;
  volume_24h?: number;
  volume_7d?: number;
  liquidity_usd?: number;
  market_cap?: number;
  trades_24h?: number;
  unique_traders_24h?: number;
  buy_volume?: number;
  sell_volume?: number;
  buy_sell_ratio?: number;
}

export interface TokenHolder {
  address: string;
  balance: number;
  percentage: number;
  value_usd?: number;
  first_acquired?: string;
  last_transaction?: string;
}

export interface TokenBuyer {
  address: string;
  bought_amount: number;
  bought_value_usd?: number;
  first_buy_time: string;
  avg_buy_price?: number;
  is_still_holding?: boolean;
  current_balance?: number;
}

export interface TopTrader {
  address: string;
  total_volume: number;
  buy_volume: number;
  sell_volume: number;
  net_position?: number;
  trades_count: number;
  profit_loss?: number;
  is_bot?: boolean;
}

export interface HolderStatus {
  address: string;
  status: 'holding' | 'sold' | 'bought_more' | 'partial_sold';
  initial_balance: number;
  current_balance: number;
  change_percentage: number;
  last_activity?: string;
}

export interface TrendingSolanaToken {
  mint_address: string;
  symbol: string;
  name: string;
  price_usd: number;
  price_change_24h?: number;
  volume_24h: number;
  market_cap?: number;
  liquidity?: number;
  trending_score?: number;
  social_score?: number;
}

/**
 * Get detailed token trading metrics
 * Tool: query_token_metrics
 *
 * Fetches trading data including volume, price movements, and liquidity
 */
export async function getTokenMetrics(
  mintAddress: string
): Promise<TokenMetrics | null> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.solanaToken,
    {
      tool: 'query_token_metrics',
      tool_arguments: { mint_address: mintAddress },
    },
    { useCache: true, cacheTTL: 30 * 1000 }
  );

  const result = response.result as {
    response?: string;
    data?: TokenMetrics;
  };

  return result?.data || null;
}

/**
 * Fetch top token holders and distribution
 * Tool: query_token_holders
 */
export async function getTokenHolders(
  mintAddress: string
): Promise<{
  holders: TokenHolder[];
  total_holders?: number;
  concentration_top10?: number;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.solanaToken,
    {
      tool: 'query_token_holders',
      tool_arguments: { mint_address: mintAddress },
    },
    { useCache: true, cacheTTL: 60 * 1000 }
  );

  const result = response.result as {
    response?: string;
    data?: {
      holders?: TokenHolder[];
      total_holders?: number;
      concentration_top10?: number;
    };
  };

  return {
    holders: result?.data?.holders || [],
    total_holders: result?.data?.total_holders,
    concentration_top10: result?.data?.concentration_top10,
  };
}

/**
 * Fetch first buyers of a token since launch
 * Tool: query_token_buyers
 *
 * Useful to identify early buyers who are likely insiders or smart money
 */
export async function getTokenBuyers(
  mintAddress: string
): Promise<{
  buyers: TokenBuyer[];
  summary?: string;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.solanaToken,
    {
      tool: 'query_token_buyers',
      tool_arguments: { mint_address: mintAddress },
    },
    { useCache: true, cacheTTL: 60 * 1000 }
  );

  const result = response.result as {
    response?: string;
    data?: {
      buyers?: TokenBuyer[];
    };
  };

  return {
    buyers: result?.data?.buyers || [],
    summary: result?.response,
  };
}

/**
 * Fetch top traders by volume
 * Tool: query_top_traders
 *
 * Returns whales actively trading the token and arbitrage bots
 */
export async function getTopTraders(
  mintAddress: string
): Promise<{
  traders: TopTrader[];
  summary?: string;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.solanaToken,
    {
      tool: 'query_top_traders',
      tool_arguments: { mint_address: mintAddress },
    },
    { useCache: true, cacheTTL: 60 * 1000 }
  );

  const result = response.result as {
    response?: string;
    data?: {
      traders?: TopTrader[];
    };
  };

  return {
    traders: result?.data?.traders || [],
    summary: result?.response,
  };
}

/**
 * Check if token buyers are still holding, sold, or bought more
 * Tool: query_holder_status
 */
export async function getHolderStatus(
  mintAddress: string,
  addresses: string[]
): Promise<{
  statuses: HolderStatus[];
  summary?: string;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.solanaToken,
    {
      tool: 'query_holder_status',
      tool_arguments: {
        mint_address: mintAddress,
        addresses,
      },
    },
    { useCache: true, cacheTTL: 60 * 1000 }
  );

  const result = response.result as {
    response?: string;
    data?: {
      statuses?: HolderStatus[];
    };
  };

  return {
    statuses: result?.data?.statuses || [],
    summary: result?.response,
  };
}

/**
 * Get current top trending tokens on Solana
 * Uses QUERY mode for comprehensive response
 *
 * Retrieves list of most popular and actively traded tokens on Solana
 */
export async function getTrendingSolanaTokens(): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.solanaToken,
    {
      query: "What are the top trending tokens on Solana right now? Show me the hottest memecoins and tokens with the most trading activity. Include token name, symbol, price, 24h change, volume, market cap, and liquidity for each. Analyze which ones have the best momentum and why.",
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 2 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || "No trending Solana tokens found",
    data: result?.data,
  };
}

/**
 * Comprehensive token analysis - combines multiple tools
 */
export async function analyzeToken(
  mintAddress: string
): Promise<{
  metrics: TokenMetrics | null;
  holders: TokenHolder[];
  top_traders: TopTrader[];
  early_buyers: TokenBuyer[];
}> {
  const [metricsResult, holdersResult, tradersResult, buyersResult] = await Promise.all([
    getTokenMetrics(mintAddress),
    getTokenHolders(mintAddress),
    getTopTraders(mintAddress),
    getTokenBuyers(mintAddress),
  ]);

  return {
    metrics: metricsResult,
    holders: holdersResult.holders,
    top_traders: tradersResult.traders,
    early_buyers: buyersResult.buyers,
  };
}
