import { callHeuristAgent } from '../client';
import { HEURIST_CONFIG } from '../config';

/**
 * Token Resolver Agent
 * Cost: x402 payment
 *
 * Find tokens by address/symbol/name/CoinGecko ID, return normalized profiles
 * and top DEX pools. Pulls extra context (sites/socials/funding/indicators).
 *
 * Official Tools:
 * - search: Find tokens by address, ticker/symbol, or token name (up to 5 candidates)
 * - profile: Get detailed profile and market data of a token
 */

export interface TokenCandidate {
  name: string;
  symbol: string;
  address?: string;
  chain?: string;
  coingecko_id?: string;
  market_cap?: number;
  volume_24h?: number;
  liquidity?: number;
  price_usd?: number;
}

export interface TokenProfile {
  name: string;
  symbol: string;
  address?: string;
  chain?: string;
  coingecko_id?: string;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  github?: string;
  market_data: {
    price_usd?: number;
    market_cap?: number;
    fdv?: number;
    volume_24h?: number;
    price_change_24h?: number;
    price_change_7d?: number;
    ath?: number;
    atl?: number;
  };
  pairs?: Array<{
    dex: string;
    pair_address: string;
    base_token: string;
    quote_token: string;
    liquidity_usd: number;
    volume_24h: number;
  }>;
  holders?: Array<{
    address: string;
    balance: number;
    percentage: number;
  }>;
  technical_indicators?: {
    rsi?: number;
    macd?: { value: number; signal: number; histogram: number };
    moving_averages?: { ma7: number; ma25: number; ma99: number };
  };
}

/**
 * Search for tokens by address, ticker/symbol, or name
 * Tool: search
 *
 * Returns up to 5 candidates with basic market/trading context
 * May return scam tokens (high market cap with low volume) - ignore them
 */
export async function searchToken(
  query: string
): Promise<{
  candidates: TokenCandidate[];
  total_results: number;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.tokenResolver,
    {
      tool: 'search',
      tool_arguments: { query },
    },
    { useCache: true, cacheTTL: 60 * 1000 }
  );

  const result = response.result as {
    response?: string;
    data?: {
      candidates?: TokenCandidate[];
      total_results?: number;
    };
  };

  return {
    candidates: result?.data?.candidates || [],
    total_results: result?.data?.total_results || 0,
  };
}

/**
 * Get detailed profile and market data of a token
 * Tool: profile
 *
 * Identify by ONE OF:
 * - chain + address (for contract tokens)
 * - symbol (for native/well-known tokens like BTC, ETH, SOL)
 * - coingecko_id
 *
 * Optional sections: pairs, holders (Solana only), traders (Solana only),
 * funding_rates (Binance large caps only), technical_indicators (large caps only)
 */
export async function getTokenProfile(
  identifier: {
    chain?: string;
    address?: string;
    symbol?: string;
    coingecko_id?: string;
  },
  options: {
    includePairs?: boolean;
    includeHolders?: boolean;
    includeTraders?: boolean;
    includeFundingRates?: boolean;
    includeTechnicalIndicators?: boolean;
  } = {}
): Promise<TokenProfile | null> {
  const sections: string[] = [];
  if (options.includePairs) sections.push('pairs');
  if (options.includeHolders) sections.push('holders');
  if (options.includeTraders) sections.push('traders');
  if (options.includeFundingRates) sections.push('funding_rates');
  if (options.includeTechnicalIndicators) sections.push('technical_indicators');

  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.tokenResolver,
    {
      tool: 'profile',
      tool_arguments: {
        ...identifier,
        sections: sections.length > 0 ? sections : undefined,
      },
    },
    { useCache: true, cacheTTL: 60 * 1000 }
  );

  const result = response.result as {
    response?: string;
    data?: TokenProfile;
  };

  return result?.data || null;
}

/**
 * Quick search and get best match profile
 * Convenience function that searches and returns the top result's profile
 */
export async function findToken(
  query: string,
  options: { includePairs?: boolean } = {}
): Promise<{
  search_results: TokenCandidate[];
  profile: TokenProfile | null;
}> {
  // First search
  const searchResults = await searchToken(query);

  if (searchResults.candidates.length === 0) {
    return { search_results: [], profile: null };
  }

  // Get profile of best match (highest market cap or first result)
  const bestMatch = searchResults.candidates.reduce((best, current) => {
    if (!best) return current;
    return (current.market_cap || 0) > (best.market_cap || 0) ? current : best;
  }, searchResults.candidates[0]);

  let profile: TokenProfile | null = null;

  if (bestMatch.coingecko_id) {
    profile = await getTokenProfile(
      { coingecko_id: bestMatch.coingecko_id },
      { includePairs: options.includePairs }
    );
  } else if (bestMatch.chain && bestMatch.address) {
    profile = await getTokenProfile(
      { chain: bestMatch.chain, address: bestMatch.address },
      { includePairs: options.includePairs }
    );
  } else if (bestMatch.symbol) {
    profile = await getTokenProfile(
      { symbol: bestMatch.symbol },
      { includePairs: options.includePairs }
    );
  }

  return {
    search_results: searchResults.candidates,
    profile,
  };
}
