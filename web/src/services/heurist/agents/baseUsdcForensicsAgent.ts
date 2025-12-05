import { callHeuristAgent } from '../client';
import { HEURIST_CONFIG } from '../config';

/**
 * Base USDC Forensics Agent
 * Cost: 3 credits
 *
 * Reveal USDC transaction patterns for any addresses on Base.
 * Onchain USDC investigator for the Base network using BigQuery data.
 *
 * Official Tools:
 * - usdc_basic_profile: Get wallet's USDC activity summary
 * - usdc_top_funders: Identify top source wallets sending USDC
 * - usdc_top_sinks: Find main destinations for USDC outflows
 * - usdc_net_counterparties: Compute per-counterparty net flow metrics
 * - usdc_daily_activity: Aggregate daily USDC activity
 * - usdc_hourly_pair_activity: Report hourly activity between two addresses
 */

export interface USDCProfile {
  address: string;
  first_seen?: string;
  last_seen?: string;
  total_transfers?: number;
  total_usdc_in?: number;
  total_usdc_out?: number;
  net_flow?: number;
}

export interface USDCFunder {
  address: string;
  transfer_count: number;
  total_volume: number;
  first_transfer?: string;
  last_transfer?: string;
}

export interface USDCSink {
  address: string;
  transfer_count: number;
  total_volume: number;
  first_transfer?: string;
  last_transfer?: string;
}

export interface NetCounterparty {
  address: string;
  net_flow: number;
  is_net_payer: boolean;
  total_in: number;
  total_out: number;
}

/**
 * Get a wallet's USDC activity summary on Base
 * Tool: usdc_basic_profile
 */
export async function getBasicProfile(address: string): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.baseUsdcForensics,
    {
      query: `Analyze the USDC activity for wallet ${address} on Base network. Provide a complete profile including: first/last seen timestamps, total transfer count, aggregate USDC received and sent, and net flow. Identify any suspicious patterns.`,
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 5 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || `No USDC profile data for ${address}`,
    data: result?.data,
  };
}

/**
 * Identify top source wallets that send USDC to target
 * Tool: usdc_top_funders
 */
export async function getTopFunders(address: string): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.baseUsdcForensics,
    {
      query: `Identify the top wallets that have sent USDC to ${address} on Base. Show the main funding sources including transfer counts, total volumes, and time ranges. Detect any concentrated funding patterns or potential hub/controller wallets.`,
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 5 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || `No funder data for ${address}`,
    data: result?.data,
  };
}

/**
 * Find main destinations where wallet sends USDC
 * Tool: usdc_top_sinks
 */
export async function getTopSinks(address: string): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.baseUsdcForensics,
    {
      query: `Find the main destination wallets where ${address} sends USDC on Base. Show transfer counts and volumes per counterparty. Identify any payout hubs or suspicious outflow patterns.`,
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 5 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || `No sink data for ${address}`,
    data: result?.data,
  };
}

/**
 * Compute per-counterparty net flow metrics
 * Tool: usdc_net_counterparties
 */
export async function getNetCounterparties(address: string): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.baseUsdcForensics,
    {
      query: `Analyze the net flow relationships for ${address} on Base. For each counterparty, show whether the wallet is a net payer or receiver. Rank counterparties by economic importance and identify any asymmetric relationships.`,
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 5 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || `No counterparty data for ${address}`,
    data: result?.data,
  };
}

/**
 * Aggregate daily USDC activity
 * Tool: usdc_daily_activity
 */
export async function getDailyActivity(address: string): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.baseUsdcForensics,
    {
      query: `Show the daily USDC activity for ${address} on Base. Aggregate by calendar day showing transaction counts and total volume received/sent each day. Identify active vs quiet periods and any unusual volume spikes.`,
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 5 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || `No daily activity data for ${address}`,
    data: result?.data,
  };
}

/**
 * Report hourly USDC activity between two addresses
 * Tool: usdc_hourly_pair_activity
 */
export async function getHourlyPairActivity(
  addressA: string,
  addressB: string
): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.baseUsdcForensics,
    {
      query: `Analyze the hourly USDC transfer activity between ${addressA} and ${addressB} on Base. Show volume in each direction (A→B and B→A) per hour. Identify flow intensity patterns between these potentially related wallets.`,
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 5 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || `No pair activity data`,
    data: result?.data,
  };
}

/**
 * Full forensic analysis of a wallet
 */
export async function analyzeWallet(address: string): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.baseUsdcForensics,
    {
      query: `Perform a complete forensic analysis of wallet ${address} on Base network. Include:
1. Basic profile (first/last seen, total transfers, net flow)
2. Top funding sources (who sends USDC to this wallet)
3. Top destinations (where does this wallet send USDC)
4. Net counterparty relationships
5. Activity patterns and anomalies
6. Risk assessment and suspicious indicators

Provide a comprehensive investigation report.`,
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 10 * 60 * 1000, timeout: 90000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || `No forensic analysis available for ${address}`,
    data: result?.data,
  };
}
