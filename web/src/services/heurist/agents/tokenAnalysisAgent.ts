import { callHeuristAgent } from '../client';
import { HEURIST_CONFIG } from '../config';

/**
 * Unifai Token Analysis Agent
 * Cost: FREE
 *
 * Analyzes memecoins using GMGN data
 * Uses QUERY mode for better responses
 */

export interface TokenAnalysis {
  symbol: string;
  name?: string;
  price?: number;
  market_cap?: number;
  volume_24h?: number;
  holders?: number;
  risk_score?: number;
  summary?: string;
}

/**
 * Analyze a specific token
 */
export async function analyzeToken(symbol: string): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.tokenAnalysis,
    {
      query: `Analyze the token ${symbol} using GMGN data. Provide comprehensive analysis including: current price, market cap, 24h volume, holder count, risk assessment, buy/sell pressure, whale activity, and overall sentiment. Is this a good investment opportunity?`,
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || `No analysis available for ${symbol}`,
    data: result?.data,
  };
}

/**
 * Get trending tokens from GMGN
 */
export async function getGMGNTrending(): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.tokenAnalysis,
    {
      query: "What are the top trending memecoins on GMGN right now? Show me the hottest tokens with the most volume and momentum. Include token name, symbol, price, market cap, 24h change, volume, and why they're trending. Focus on Solana memecoins.",
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 2 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || "No GMGN trending data available",
    data: result?.data,
  };
}

/**
 * Get token risk analysis
 */
export async function getTokenRisk(symbol: string): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.tokenAnalysis,
    {
      query: `Analyze the risk profile for ${symbol}. Check for: rug pull indicators, honeypot detection, liquidity locked status, ownership renounced, top holder concentration, contract safety, and any red flags. Provide a risk score from 1-10.`,
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || `No risk analysis available for ${symbol}`,
    data: result?.data,
  };
}
