import { callHeuristAgent } from '../client';
import { HEURIST_CONFIG } from '../config';

/**
 * Pump.fun Token Agent
 * Cost: 1 credit
 *
 * Tracks Pump.fun on Solana - new launches, graduations
 * Uses QUERY mode for better compatibility
 */

export interface PumpFunToken {
  name: string;
  symbol: string;
  mint_address?: string;
  price?: number;
  market_cap?: number;
  progress_to_graduation?: number;
  created_at?: string;
  creator?: string;
}

/**
 * Get trending tokens on Pump.fun
 */
export async function getTrendingPumpFun(): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.pumpfun,
    {
      query: "What are the top trending tokens on Pump.fun right now? Show me the hottest memecoins that are gaining traction. Include token name, symbol, price, market cap, and progress to graduation if available.",
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 2 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || "No Pump.fun trending data available",
    data: result?.data,
  };
}

/**
 * Get new token launches
 */
export async function getNewPumpFunTokens(): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.pumpfun,
    {
      query: "Show me the newest token launches on Pump.fun in the last few hours. What are the latest memecoins being created? Include token name, symbol, creator, creation time, and current status.",
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || "No new Pump.fun tokens found",
    data: result?.data,
  };
}

/**
 * Get recently graduated tokens
 */
export async function getRecentlyGraduated(): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.pumpfun,
    {
      query: "What tokens have recently graduated from Pump.fun? Show me successful token launches that completed their bonding curve and moved to Raydium. Include token name, symbol, graduation time, and current price/market cap.",
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 2 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || "No graduated tokens found",
    data: result?.data,
  };
}

/**
 * Analyze Pump.fun meta and trends
 */
export async function getPumpFunMeta(): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.pumpfun,
    {
      query: "Analyze the current Pump.fun meta. What themes, narratives, and types of tokens are trending? What categories of memecoins are being launched most frequently (animals, AI, politics, gaming, etc)? What makes a token successful on Pump.fun right now?",
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 5 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || "No Pump.fun meta analysis available",
    data: result?.data,
  };
}
