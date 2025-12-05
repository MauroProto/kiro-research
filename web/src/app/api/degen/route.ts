import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";
import { checkRateLimitByIP, incrementUsageByIP } from "@/lib/rateLimit";
// All 12 agents available
import * as twitterAgent from "@/services/heurist/agents/twitterAgent";
import * as elfaTwitterAgent from "@/services/heurist/agents/elfaTwitterAgent";
import * as trendingAgent from "@/services/heurist/agents/trendingAgent";
import * as tokenAnalysisAgent from "@/services/heurist/agents/tokenAnalysisAgent";
import * as pumpfunAgent from "@/services/heurist/agents/pumpfunAgent";
import * as newsAgent from "@/services/heurist/agents/newsAgent";
import * as dexscreenerAgent from "@/services/heurist/agents/dexscreenerAgent";
import * as aixbtAgent from "@/services/heurist/agents/aixbtAgent";
import * as tokenResolverAgent from "@/services/heurist/agents/tokenResolverAgent";
import * as coingeckoAgent from "@/services/heurist/agents/coingeckoAgent";
import * as solanaTokenAgent from "@/services/heurist/agents/solanaTokenAgent";
import * as baseUsdcForensicsAgent from "@/services/heurist/agents/baseUsdcForensicsAgent";
import { HEURIST_CONFIG } from "@/services/heurist/config";

// DeepSeek Configuration
const deepseek = createOpenAI({
  name: "deepseek",
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

/**
 * Extract error message from any error type
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

// Words to ignore when extracting tokens from tasks
const IGNORED_WORDS = new Set([
  'get', 'analyze', 'search', 'find', 'provide', 'show', 'fetch', 'retrieve',
  'check', 'look', 'query', 'request', 'obtain', 'gather', 'collect',
  'real', 'time', 'data', 'info', 'information', 'details', 'market',
  'price', 'volume', 'liquidity', 'trading', 'pairs', 'token', 'tokens',
  'current', 'latest', 'recent', 'new', 'trending', 'analysis', 'sentiment',
  'the', 'for', 'and', 'with', 'from', 'about', 'what', 'how', 'why',
]);

// Known tokens/projects to match
const KNOWN_TOKENS = [
  'SOL', 'SOLANA', 'BTC', 'BITCOIN', 'ETH', 'ETHEREUM', 'BNB', 'XRP',
  'DOGE', 'DOGECOIN', 'ADA', 'CARDANO', 'AVAX', 'AVALANCHE', 'DOT', 'POLKADOT',
  'MATIC', 'POLYGON', 'LINK', 'CHAINLINK', 'UNI', 'UNISWAP', 'ATOM', 'COSMOS',
  'LTC', 'LITECOIN', 'PEPE', 'SHIB', 'SHIBA', 'FLOKI', 'BONK', 'WIF',
  'MEME', 'AAVE', 'MKR', 'MAKER', 'CRV', 'CURVE', 'SNX', 'SYNTHETIX',
  'COMP', 'COMPOUND', 'ARB', 'ARBITRUM', 'OP', 'OPTIMISM', 'JUP', 'JUPITER',
  'PYTH', 'JTO', 'RAY', 'RAYDIUM', 'FET', 'AGIX', 'RNDR', 'RENDER',
  'AXS', 'AXIE', 'SAND', 'SANDBOX', 'MANA', 'DECENTRALAND', 'IMX', 'IMMUTABLE',
  'GALA', 'SUI', 'APT', 'APTOS', 'SEI', 'TIA', 'CELESTIA', 'INJ', 'INJECTIVE',
];

/**
 * Extract token/project name from a task string
 * Filters out common action words and finds actual token references
 */
function extractTokenFromTask(task: string): string | null {
  // First try $TOKEN pattern
  const dollarMatch = task.match(/\$([A-Z]{2,10})/i);
  if (dollarMatch) {
    const token = dollarMatch[1].toUpperCase();
    if (!IGNORED_WORDS.has(token.toLowerCase())) {
      return token;
    }
  }

  // Then try known tokens (case insensitive)
  const taskUpper = task.toUpperCase();
  for (const token of KNOWN_TOKENS) {
    const regex = new RegExp(`\\b${token}\\b`, 'i');
    if (regex.test(taskUpper)) {
      return token;
    }
  }

  // Finally, try to find any capitalized word that's not ignored
  const words = task.split(/\s+/);
  for (const word of words) {
    const clean = word.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (clean.length >= 2 && clean.length <= 10 && !IGNORED_WORDS.has(clean.toLowerCase())) {
      // Check if it looks like a token (all caps in original or known pattern)
      if (/^[A-Z]{2,10}$/.test(word.replace(/[^A-Za-z]/g, ''))) {
        return clean;
      }
    }
  }

  return null;
}

// Available agents with their descriptions (max 5 per query + TradingView)
// All 11 agents available
const AVAILABLE_AGENTS = {
  // Twitter Agents (mutually exclusive - only ONE can be used per query)
  twitter: {
    name: "Twitter Intelligence",
    description: "Analyzes Twitter/X for sentiment, discussions, influential mentions about crypto topics.",
    cost: "10 credits",
    icon: "twitter",
    exclusiveGroup: "twitter",
  },
  elfaTwitter: {
    name: "Elfa Twitter AI",
    description: "AI-powered Twitter intelligence - smart mentions, trending tokens from Twitter activity, account analysis.",
    cost: "10 credits",
    icon: "twitter",
    exclusiveGroup: "twitter",
  },

  // Token Data Agents
  tokenResolver: {
    name: "Token Resolver",
    description: "Find tokens by address/symbol/name, get detailed profiles with market data, pairs, and holders.",
    cost: "1 credit",
    icon: "search",
  },
  coingecko: {
    name: "CoinGecko Data",
    description: "Token info, prices, trending coins, categories, trending pools from CoinGecko.",
    cost: "1 credit",
    icon: "chart",
  },
  solanaToken: {
    name: "Solana Token Analysis",
    description: "Deep Solana token analysis - metrics, holders, early buyers, top traders, trending tokens.",
    cost: "1 credit",
    icon: "token",
  },
  dexscreener: {
    name: "DEX Data",
    description: "Real-time DEX trading data - prices, liquidity, volume, boosted tokens.",
    cost: "1 credit",
    icon: "chart",
  },
  tokenAnalysis: {
    name: "Token Analysis",
    description: "Analyzes memecoins using GMGN data.",
    cost: "FREE",
    icon: "token",
  },

  // Analysis & News Agents
  aixbt: {
    name: "Project Analysis",
    description: "Deep fundamental analysis of crypto projects, market summaries, and trending project info.",
    cost: "FREE",
    icon: "search",
  },
  news: {
    name: "Web3 News",
    description: "Fetches latest Web3 and cryptocurrency news.",
    cost: "FREE",
    icon: "news",
  },
  trending: {
    name: "Trending Tokens",
    description: "Aggregates trending tokens from GMGN, CoinGecko, Pump.fun, DexScreener and Twitter.",
    cost: "1 credit",
    icon: "trending",
  },
  pumpfun: {
    name: "Pump.fun Tracker",
    description: "Tracks Pump.fun on Solana - new launches, graduations.",
    cost: "1 credit",
    icon: "rocket",
  },
  baseUsdcForensics: {
    name: "Base USDC Forensics",
    description: "Investigate USDC transaction patterns on Base network. Analyze wallet profiles, funding sources, outflows, and detect suspicious patterns.",
    cost: "3 credits",
    icon: "search",
  },
};

// Twitter agents are mutually exclusive
const TWITTER_AGENTS = ["twitter", "elfaTwitter"];

// Max agents per query (excluding TradingView chart)
const MAX_AGENTS_PER_QUERY = HEURIST_CONFIG.maxAgentsPerQuery;

/**
 * Validate and fix agent selection to enforce rules:
 * 1. Maximum 5 agents
 * 2. Twitter agents are mutually exclusive (only one)
 */
function validateAgentSelection(agents: string[]): string[] {
  let validatedAgents = [...agents];

  // Rule 1: Twitter agents are mutually exclusive - keep only the first one
  const twitterAgentsSelected = validatedAgents.filter(a => TWITTER_AGENTS.includes(a));
  if (twitterAgentsSelected.length > 1) {
    // Keep only the first Twitter agent, remove others
    const firstTwitterAgent = twitterAgentsSelected[0];
    validatedAgents = validatedAgents.filter(a => !TWITTER_AGENTS.includes(a) || a === firstTwitterAgent);
    console.log(`[Validation] Removed duplicate Twitter agents, keeping: ${firstTwitterAgent}`);
  }

  // Rule 2: Maximum 5 agents
  if (validatedAgents.length > MAX_AGENTS_PER_QUERY) {
    console.log(`[Validation] Limiting from ${validatedAgents.length} to ${MAX_AGENTS_PER_QUERY} agents`);
    validatedAgents = validatedAgents.slice(0, MAX_AGENTS_PER_QUERY);
  }

  return validatedAgents;
}

/**
 * Get the alternative Twitter agent (for fallback)
 */
function getAlternativeTwitterAgent(failedAgent: string): string | null {
  if (failedAgent === "twitter") return "elfaTwitter";
  if (failedAgent === "elfaTwitter") return "twitter";
  return null;
}

interface AgentDecision {
  agents: string[];
  reasoning: string;
  tasks: Record<string, string>;
}

interface AgentResult {
  agent: string;
  task: string;
  success: boolean;
  data: unknown;
  error?: string;
}

// Progress event types
type ProgressEvent =
  | { type: "start"; query: string }
  | { type: "orchestrator_start" }
  | { type: "orchestrator_chunk"; text: string }
  | { type: "orchestrator_done"; decision: AgentDecision }
  | { type: "agent_start"; agent: string; task: string; isRetry?: boolean }
  | { type: "agent_done"; agent: string; success: boolean; error?: string }
  | { type: "retry_check_start"; failedAgents: string[] }
  | { type: "retry_check_done"; retryPlan: { agent: string; newTask: string }[] }
  | { type: "reasoner_start" }
  | { type: "reasoner_chunk"; text: string }  // Chain of thought reasoning
  | { type: "reasoner_content_chunk"; text: string }  // Final answer content
  | { type: "reasoner_done" }
  | { type: "complete"; response: string };

/**
 * STEP 1: Orchestrator - DeepSeek (non-reasoning) decides which agents to use
 * Now with streaming support
 */
async function orchestrateWithStreaming(
  userQuery: string,
  onChunk: (text: string) => Promise<void>
): Promise<AgentDecision> {
  const agentDescriptions = Object.entries(AVAILABLE_AGENTS)
    .map(([id, agent]) => `- **${id}**: ${agent.name} - ${agent.description} (${agent.cost})`)
    .join("\n");

  const prompt = `You are an intelligent orchestrator for a crypto research platform. Your job is to analyze the user's query and decide which AI agents to use for the best possible research.

## Available Agents:
${agentDescriptions}

## User Query:
"${userQuery}"

## Your Task:
1. Understand what the user wants to know
2. Decide which agents would provide valuable information (MAXIMUM ${MAX_AGENTS_PER_QUERY} agents)
3. For each agent, specify what task/query they should execute

## CRITICAL RULES:
1. **MAXIMUM ${MAX_AGENTS_PER_QUERY} AGENTS** - You can only select up to ${MAX_AGENTS_PER_QUERY} agents per query. Choose wisely.
2. **TWITTER AGENTS ARE MUTUALLY EXCLUSIVE** - NEVER select both "twitter" AND "elfaTwitter". Pick only ONE of them if needed.
3. **USE COMPLEMENTARY AGENTS** - Don't pick agents that give the same data. Pick agents that complement each other:
   - Use "coingecko" for market data AND "dexscreener" for DEX liquidity (they provide different data)
   - Use "trending" for discovery AND "solanaToken" for deep analysis
   - Use "news" for context AND "aixbt" for project fundamentals

## AGENT SELECTION BY QUERY TYPE:

### For broad market/trend questions (like "what's trending", "what should I invest in", "starting a project"):
1. **ALWAYS include "trending"** - aggregates trends from multiple sources
2. **ALWAYS include "coingecko"** - provides trending coins with REAL price/volume metrics
3. **Include "dexscreener"** - provides DEX data and real liquidity info
4. **Include "news"** - provides market context
5. **Include "pumpfun"** - for new token launches (especially Solana)

### For specific token analysis (like "$SOL sentiment", "analyze BTC"):
1. **Use "solanaToken"** for Solana tokens with deep metrics
2. **Use "coingecko"** for established tokens with market data
3. **Use "dexscreener"** for DEX pairs and liquidity
4. **Use "twitter" OR "elfaTwitter"** for social sentiment (pick ONE)

### For project research:
1. **Use "aixbt"** for fundamental project analysis and market summaries

## IMPORTANT - AVOID THESE MISTAKES:
- DON'T select only "trending" without "coingecko" or "dexscreener" - trending alone lacks price metrics
- DON'T skip "coingecko" for market questions - it has the best price/volume data
- DON'T skip "dexscreener" for DEX/trading questions - it has real-time liquidity data

## TASK FORMATTING:
- Keep tasks simple and direct
- For trending agents: "Get trending tokens" or "Get trending memecoins"
- For data agents: "Get market data for SOL" or "Get DEX pairs for PEPE"
- For analysis: "Analyze Solana ecosystem" or "Get market summary"

## Response Format (JSON only, no markdown):
{
  "agents": ["agent_id_1", "agent_id_2", ...],
  "reasoning": "Brief explanation of why these agents were chosen",
  "tasks": {
    "agent_id_1": "Specific task or query for this agent",
    "agent_id_2": "Specific task or query for this agent"
  }
}

Respond ONLY with valid JSON, no additional text.`;

  let fullText = "";

  const result = streamText({
    model: deepseek("deepseek-chat"),
    prompt,
    temperature: 0.3,
  });

  for await (const chunk of result.textStream) {
    fullText += chunk;
    await onChunk(chunk);
  }

  try {
    let cleanedText = fullText.trim();
    if (cleanedText.startsWith("```json")) cleanedText = cleanedText.slice(7);
    if (cleanedText.startsWith("```")) cleanedText = cleanedText.slice(3);
    if (cleanedText.endsWith("```")) cleanedText = cleanedText.slice(0, -3);
    cleanedText = cleanedText.trim();

    return JSON.parse(cleanedText) as AgentDecision;
  } catch {
    return {
      agents: ["news", "tokenAnalysis", "aixbt", "trending"],
      reasoning: "Fallback selection due to parsing error",
      tasks: {
        news: "Get latest crypto news",
        tokenAnalysis: "Get trending memecoins from GMGN",
        aixbt: "Get market summary",
        trending: "Get trending tokens across platforms",
      },
    };
  }
}

/**
 * STEP 2.5: Retry Checker - DeepSeek analyzes failures and creates retry strategy
 */
async function checkAndPlanRetries(
  failedAgents: { agent: string; task: string; error: string }[],
  userQuery: string
): Promise<{ agent: string; newTask: string }[]> {
  if (failedAgents.length === 0) return [];

  const failureDetails = failedAgents
    .map(f => `- **${f.agent}**: Task was "${f.task}", Error: "${f.error}"`)
    .join("\n");

  const prompt = `You are a retry specialist. Some AI agents failed to execute their tasks. Your job is to create simpler, more likely to succeed alternative queries for them.

## Original User Query:
"${userQuery}"

## Failed Agents:
${failureDetails}

## Your Task:
For each failed agent, create a SIMPLER, more focused task that is more likely to succeed. Consider:
- If timeout occurred, make the query shorter and more specific
- If there was a parameter error, adjust the query format
- If the query was too complex, break it down to the essential request
- For Twitter: use simpler search terms, avoid complex analysis requests
- For DEX/Token queries: use specific token names or just ask for trending data

## Response Format (JSON only):
{
  "retries": [
    { "agent": "agent_id", "newTask": "Simpler task description" }
  ]
}

Respond ONLY with valid JSON.`;

  const result = await generateText({
    model: deepseek("deepseek-chat"),
    prompt,
    temperature: 0.3,
  });

  try {
    let cleanedText = result.text.trim();
    if (cleanedText.startsWith("```json")) cleanedText = cleanedText.slice(7);
    if (cleanedText.startsWith("```")) cleanedText = cleanedText.slice(3);
    if (cleanedText.endsWith("```")) cleanedText = cleanedText.slice(0, -3);
    cleanedText = cleanedText.trim();

    const parsed = JSON.parse(cleanedText) as { retries: { agent: string; newTask: string }[] };
    return parsed.retries || [];
  } catch {
    // Fallback: create simple retry tasks
    return failedAgents.map(f => ({
      agent: f.agent,
      newTask: getSimpleFallbackTask(f.agent),
    }));
  }
}

/**
 * Get a simple fallback task for an agent
 */
function getSimpleFallbackTask(agentId: string): string {
  const fallbacks: Record<string, string> = {
    twitter: "Get recent crypto sentiment",
    elfaTwitter: "Get trending tokens from Twitter",
    dexscreener: "Get trending DEX pairs",
    aixbt: "Get market summary",
    tokenResolver: "Search for trending tokens",
    coingecko: "Get trending coins from CoinGecko",
    solanaToken: "Get trending Solana tokens",
    trending: "Get trending tokens",
    tokenAnalysis: "Get GMGN trending memecoins",
    pumpfun: "Get new Pump.fun tokens",
    news: "Get latest crypto news",
    baseUsdcForensics: "Analyze USDC transaction patterns on Base",
  };
  return fallbacks[agentId] || "General analysis";
}

/**
 * Validate if agent data has actual content (not empty)
 */
function validateAgentData(agentId: string, data: unknown): { valid: boolean; reason?: string } {
  if (!data) return { valid: false, reason: "No data returned" };

  const d = data as Record<string, unknown>;

  switch (agentId) {
    case "dexscreener":
      // Query mode returns { response: string, data?: unknown }
      if (d.response && String(d.response).length > 20) return { valid: true };
      // Check if pairs array exists and has items
      if (d.pairs && Array.isArray(d.pairs) && d.pairs.length > 0) return { valid: true };
      if (d.data && typeof d.data === 'object') {
        const nestedData = d.data as Record<string, unknown>;
        if (nestedData.pairs && Array.isArray(nestedData.pairs)) return { valid: true };
      }
      if (d.error) return { valid: false, reason: String(d.error) };
      return { valid: false, reason: "No DEX pairs found" };

    case "aixbt": {
      // Log what we receive for debugging
      console.log(`[Validate AIXBT] Received data keys: ${Object.keys(d).join(', ')}`);

      // Query mode returns { response: string, data?: unknown }
      if (d.response && String(d.response).length > 20) return { valid: true };

      // Check nested data structure (API returns { response: '', data: { data: { projects: [...] } } })
      if (d.data && typeof d.data === 'object') {
        const nestedData = d.data as Record<string, unknown>;
        console.log(`[Validate AIXBT] Nested data keys: ${Object.keys(nestedData).join(', ')}`);

        // Check for summaries/news in nested data
        if (nestedData.summaries && Array.isArray(nestedData.summaries) && nestedData.summaries.length > 0) return { valid: true };
        if (nestedData.news && Array.isArray(nestedData.news) && nestedData.news.length > 0) return { valid: true };

        if (nestedData.data && typeof nestedData.data === 'object') {
          const innerData = nestedData.data as Record<string, unknown>;
          console.log(`[Validate AIXBT] Inner data keys: ${Object.keys(innerData).join(', ')}`);
          if (innerData.projects && Array.isArray(innerData.projects) && innerData.projects.length > 0) return { valid: true };
          if (innerData.summaries && Array.isArray(innerData.summaries) && innerData.summaries.length > 0) return { valid: true };
          if (innerData.news && Array.isArray(innerData.news) && innerData.news.length > 0) return { valid: true };
        }
        if (nestedData.projects && Array.isArray(nestedData.projects) && nestedData.projects.length > 0) return { valid: true };

        // If nested data has any meaningful content, accept it
        if (Object.keys(nestedData).length > 0 && JSON.stringify(nestedData).length > 50) {
          return { valid: true };
        }
      }

      // Legacy: Check for summary or analysis
      if (d.summary && String(d.summary).length > 20) return { valid: true };
      if (d.analysis && String(d.analysis).length > 20) return { valid: true };
      if (d.projects && Array.isArray(d.projects) && d.projects.length > 0) return { valid: true };

      // If there's any substantial content, accept it
      const jsonStr = JSON.stringify(d);
      if (jsonStr.length > 100) {
        console.log(`[Validate AIXBT] Accepting based on content length: ${jsonStr.length}`);
        return { valid: true };
      }

      return { valid: false, reason: "No project analysis data" };
    }

    case "twitter":
      // Check for sentiment data
      if (d.response && String(d.response).length > 50) return { valid: true };
      if (d.sentiment) return { valid: true };
      if (d.data && typeof d.data === 'object') return { valid: true };
      return { valid: false, reason: "No Twitter sentiment data" };

    case "elfaTwitter":
      // Check for Elfa Twitter data
      if (d.mentions && Array.isArray(d.mentions) && d.mentions.length > 0) return { valid: true };
      if (d.tokens && Array.isArray(d.tokens) && d.tokens.length > 0) return { valid: true };
      if (d.tweets && Array.isArray(d.tweets) && d.tweets.length > 0) return { valid: true };
      if (d.summary && String(d.summary).length > 20) return { valid: true };
      return { valid: false, reason: "No Elfa Twitter data" };

    case "tokenResolver":
      // Check for token resolver data
      if (d.candidates && Array.isArray(d.candidates) && d.candidates.length > 0) return { valid: true };
      if (d.profile && typeof d.profile === 'object') return { valid: true };
      if (d.search_results && Array.isArray(d.search_results)) return { valid: true };
      return { valid: false, reason: "No token resolver data" };

    case "coingecko":
      // Query mode returns { response: string, data?: unknown }
      if (d.response && String(d.response).length > 20) return { valid: true };
      // Legacy checks
      if (d.coins && Array.isArray(d.coins) && d.coins.length > 0) return { valid: true };
      if (d.id && d.symbol) return { valid: true }; // Token info
      if (d.data && typeof d.data === 'object') {
        const nestedData = d.data as Record<string, unknown>;
        if (nestedData.trending_coins && Array.isArray(nestedData.trending_coins)) return { valid: true };
      }
      if (typeof d === 'object' && d !== null && Object.keys(d).length > 2) return { valid: true };
      return { valid: false, reason: "No CoinGecko data" };

    case "solanaToken":
      // Query mode returns { response: string, data?: unknown }
      if (d.response && String(d.response).length > 20) return { valid: true };
      // Check nested data structure
      if (d.data && typeof d.data === 'object') {
        const nestedData = d.data as Record<string, unknown>;
        if (nestedData.trending_tokens && Array.isArray(nestedData.trending_tokens)) return { valid: true };
      }
      // Legacy checks
      if (d.tokens && Array.isArray(d.tokens) && d.tokens.length > 0) return { valid: true };
      if (d.metrics && typeof d.metrics === 'object') return { valid: true };
      if (d.holders && Array.isArray(d.holders) && d.holders.length > 0) return { valid: true };
      if (d.traders && Array.isArray(d.traders) && d.traders.length > 0) return { valid: true };
      if (d.top_traders && Array.isArray(d.top_traders)) return { valid: true };
      return { valid: false, reason: "No Solana token data" };

    case "trending":
      // Check nested data structure first (API returns { response: '', data: { status, data: { coingecko_trending, twitter_trending } } })
      if (d.data && typeof d.data === 'object') {
        const nestedData = d.data as Record<string, unknown>;
        // Check for trending data arrays
        if (nestedData.data && typeof nestedData.data === 'object') {
          const innerData = nestedData.data as Record<string, unknown>;
          if (innerData.coingecko_trending || innerData.twitter_trending || innerData.solana_trending) return { valid: true };
        }
        if (nestedData.solana_trending || nestedData.trending_tokens) return { valid: true };
        if (nestedData.status === 'success') return { valid: true };
      }
      // Query mode returns { response: string, data?: unknown }
      if (d.response && String(d.response).length > 20) return { valid: true };
      // Legacy: Check if tokens array exists
      if (d.tokens && Array.isArray(d.tokens) && d.tokens.length > 0) return { valid: true };
      return { valid: false, reason: "No trending tokens found" };

    case "tokenAnalysis":
      // Query mode returns { response: string, data?: unknown }
      if (d.response && String(d.response).length > 20) return { valid: true };
      // Legacy checks
      if (d.payload && String(d.payload).length > 100) return { valid: true };
      if (d.data && typeof d.data === 'object') return { valid: true };
      if (d.tokens && Array.isArray(d.tokens)) return { valid: true };
      return { valid: false, reason: "No token analysis data" };

    case "pumpfun":
      // Query mode returns { response: string, data?: unknown }
      if (d.response && String(d.response).length > 20) return { valid: true };
      // Check for pump.fun tokens in nested data
      if (d.data && typeof d.data === 'object') {
        const nestedData = d.data as Record<string, unknown>;
        if (nestedData.tokens && Array.isArray(nestedData.tokens)) return { valid: true };
        if (nestedData.data && typeof nestedData.data === 'object') return { valid: true };
      }
      if (d.tokens && Array.isArray(d.tokens) && d.tokens.length > 0) return { valid: true };
      return { valid: false, reason: "No Pump.fun tokens found" };

    case "news":
      // Check nested data structure first
      if (d.data && typeof d.data === 'object') {
        const nestedData = d.data as Record<string, unknown>;
        // Check for error (tool not supported)
        if (nestedData.error && String(nestedData.error).includes('Unsupported tool')) {
          return { valid: false, reason: "News agent requires query mode" };
        }
        if (nestedData.payload && typeof nestedData.payload === 'object') {
          const payload = nestedData.payload as Record<string, unknown>;
          if (payload.results && Array.isArray(payload.results)) return { valid: true };
        }
        if (nestedData.results && Array.isArray(nestedData.results)) return { valid: true };
        if (nestedData.news && Array.isArray(nestedData.news)) return { valid: true };
      }
      // Query mode returns { response: string, data?: unknown }
      if (d.response && String(d.response).length > 20) return { valid: true };
      // Legacy: Check for news results array
      if (d.results && Array.isArray(d.results) && d.results.length > 0) return { valid: true };
      return { valid: false, reason: "No news found" };

    case "baseUsdcForensics":
      // Query mode returns { response: string, data?: unknown }
      if (d.response && String(d.response).length > 20) return { valid: true };
      // Check for forensics data
      if (d.data && typeof d.data === 'object') {
        const nestedData = d.data as Record<string, unknown>;
        if (nestedData.profile || nestedData.funders || nestedData.sinks || nestedData.activity) return { valid: true };
      }
      return { valid: false, reason: "No USDC forensics data" };

    default:
      // For unknown agents, accept any non-empty object
      return { valid: Object.keys(d).length > 0 };
  }
}

/**
 * Execute a single agent
 */
async function executeAgent(agentId: string, task: string, options: { isRetry?: boolean } = {}): Promise<unknown> {
  const { isRetry = false } = options;
  // Use longer timeout for retries
  const timeout = isRetry ? 45000 : 30000;

  switch (agentId) {
    case "twitter":
      return await twitterAgent.getTwitterSentiment(task);

    case "elfaTwitter": {
      // Elfa Twitter AI agent
      const tokenSymbol = extractTokenFromTask(task);
      if (task.toLowerCase().includes("trending") || task.toLowerCase().includes("hot")) {
        return await elfaTwitterAgent.getTrendingTokensFromTwitter();
      } else if (task.toLowerCase().includes("account") || task.toLowerCase().includes("@")) {
        const usernameMatch = task.match(/@?(\w+)/);
        if (usernameMatch) {
          return await elfaTwitterAgent.searchAccount(usernameMatch[1]);
        }
      }
      // Default: search mentions for the token
      return await elfaTwitterAgent.searchMentions(tokenSymbol || task);
    }

    case "tokenResolver": {
      // Token Resolver agent - search and profile
      const tokenSymbol = extractTokenFromTask(task);
      if (task.toLowerCase().includes("profile") || task.toLowerCase().includes("detail")) {
        const result = await tokenResolverAgent.findToken(tokenSymbol || task, { includePairs: true });
        return result;
      }
      // Default: search for token
      return await tokenResolverAgent.searchToken(tokenSymbol || task);
    }

    case "coingecko": {
      // CoinGecko agent
      if (task.toLowerCase().includes("trending") || task.toLowerCase().includes("hot")) {
        return await coingeckoAgent.getTrendingCoins();
      } else if (task.toLowerCase().includes("categor")) {
        return await coingeckoAgent.getCategoryData();
      } else if (task.toLowerCase().includes("pool")) {
        return await coingeckoAgent.getTrendingPools();
      } else {
        // Get token info
        const tokenSymbol = extractTokenFromTask(task);
        if (tokenSymbol) {
          return await coingeckoAgent.getTokenInfo(tokenSymbol.toLowerCase());
        }
        return await coingeckoAgent.getTrendingCoins();
      }
    }

    case "solanaToken": {
      // Solana Token Analysis agent
      const tokenSymbol = extractTokenFromTask(task);
      if (task.toLowerCase().includes("trending") || task.toLowerCase().includes("hot")) {
        return await solanaTokenAgent.getTrendingSolanaTokens();
      } else if (task.toLowerCase().includes("holder")) {
        if (tokenSymbol) {
          return await solanaTokenAgent.getTokenHolders(tokenSymbol);
        }
      } else if (task.toLowerCase().includes("trader") || task.toLowerCase().includes("whale")) {
        if (tokenSymbol) {
          return await solanaTokenAgent.getTopTraders(tokenSymbol);
        }
      } else if (task.toLowerCase().includes("buyer") || task.toLowerCase().includes("early")) {
        if (tokenSymbol) {
          return await solanaTokenAgent.getTokenBuyers(tokenSymbol);
        }
      } else if (tokenSymbol) {
        // Full analysis for specific token
        return await solanaTokenAgent.analyzeToken(tokenSymbol);
      }
      // Default: trending Solana tokens
      return await solanaTokenAgent.getTrendingSolanaTokens();
    }

    case "dexscreener":
      if (task.toLowerCase().includes("trend")) {
        return await dexscreenerAgent.getTrendingPairs();
      } else {
        // Extract token symbol - look for $TOKEN format or known tokens
        const tokenSymbol = extractTokenFromTask(task);
        if (tokenSymbol) {
          return await dexscreenerAgent.searchToken(tokenSymbol);
        }
        // Fallback to trending if no specific token found
        return await dexscreenerAgent.getTrendingPairs();
      }

    case "aixbt":
      if (task.toLowerCase().includes("market") || task.toLowerCase().includes("summary") || task.toLowerCase().includes("overview")) {
        return await aixbtAgent.getMarketSummary();
      } else {
        // Extract project name
        const projectName = extractTokenFromTask(task);
        if (projectName) {
          return await aixbtAgent.searchProjects(projectName);
        }
        return await aixbtAgent.getMarketSummary();
      }

    case "trending":
      if (task.toLowerCase().includes("memecoin")) {
        return await trendingAgent.getTrendingMemecoins();
      } else if (task.toLowerCase().includes("solana")) {
        return await trendingAgent.getTrendingOnChain("solana");
      } else if (task.toLowerCase().includes("base")) {
        return await trendingAgent.getTrendingOnChain("base");
      } else {
        return await trendingAgent.getTrendingTokens();
      }

    case "tokenAnalysis":
      if (task.toLowerCase().includes("trend") || task.toLowerCase().includes("gmgn")) {
        return await tokenAnalysisAgent.getGMGNTrending();
      } else {
        const tokenMatch = task.match(/\$?([A-Za-z]+)/);
        if (tokenMatch) {
          return await tokenAnalysisAgent.analyzeToken(tokenMatch[1]);
        }
        return await tokenAnalysisAgent.getGMGNTrending();
      }

    case "pumpfun":
      if (task.toLowerCase().includes("new") || task.toLowerCase().includes("launch")) {
        return await pumpfunAgent.getNewPumpFunTokens();
      } else if (task.toLowerCase().includes("graduat")) {
        return await pumpfunAgent.getRecentlyGraduated();
      }
      return await pumpfunAgent.getTrendingPumpFun();

    case "news":
      return await newsAgent.getLatestNews();

    case "baseUsdcForensics": {
      // Base USDC Forensics agent
      const addressMatch = task.match(/0x[a-fA-F0-9]{40}/);
      const address = addressMatch ? addressMatch[0] : null;

      if (!address) {
        // No address found, do general analysis
        return await baseUsdcForensicsAgent.analyzeWallet(task);
      }

      if (task.toLowerCase().includes("funder") || task.toLowerCase().includes("source")) {
        return await baseUsdcForensicsAgent.getTopFunders(address);
      } else if (task.toLowerCase().includes("sink") || task.toLowerCase().includes("destination") || task.toLowerCase().includes("outflow")) {
        return await baseUsdcForensicsAgent.getTopSinks(address);
      } else if (task.toLowerCase().includes("daily") || task.toLowerCase().includes("activity")) {
        return await baseUsdcForensicsAgent.getDailyActivity(address);
      } else if (task.toLowerCase().includes("counterpart") || task.toLowerCase().includes("relationship")) {
        return await baseUsdcForensicsAgent.getNetCounterparties(address);
      } else {
        // Full forensic analysis
        return await baseUsdcForensicsAgent.analyzeWallet(address);
      }
    }

    default:
      throw new Error(`Unknown agent: ${agentId}`);
  }
}

/**
 * Detect if text is primarily in Spanish
 */
function isSpanish(text: string): boolean {
  const spanishIndicators = [
    /\b(qué|cómo|cuál|dónde|cuándo|por qué|quiero|hacer|tengo|puedo|ayuda|hola|gracias)\b/i,
    /\b(proyecto|cripto|moneda|tendencia|mercado|analizar|recomiendas|lanzar|token)\b/i,
    /\b(el|la|los|las|un|una|es|son|está|están|para|con|sobre|como)\b/i,
  ];

  let matches = 0;
  for (const pattern of spanishIndicators) {
    if (pattern.test(text)) matches++;
  }

  return matches >= 2;
}

/**
 * STEP 3: Synthesizer - DeepSeek REASONER compiles everything (with streaming)
 * Uses raw fetch to access both reasoning_content and content streams
 */
async function synthesizeWithStreaming(
  userQuery: string,
  orchestration: AgentDecision,
  agentResults: AgentResult[],
  onReasoningChunk: (text: string) => Promise<void>,
  onContentChunk: (text: string) => Promise<void>
): Promise<{ reasoning: string; content: string }> {
  const resultsFormatted = agentResults
    .map((r) => {
      if (r.success && r.data != null) {
        let dataStr: string;
        try {
          dataStr = JSON.stringify(r.data, null, 2) || "{}";
          if (dataStr.length > 3000) {
            dataStr = dataStr.slice(0, 3000) + "\n... (truncated)";
          }
        } catch {
          dataStr = "Error serializing data";
        }
        return `### ${AVAILABLE_AGENTS[r.agent as keyof typeof AVAILABLE_AGENTS]?.name || r.agent}
**Task:** ${r.task}
**Data:**
\`\`\`json
${dataStr}
\`\`\``;
      } else {
        return `### ${AVAILABLE_AGENTS[r.agent as keyof typeof AVAILABLE_AGENTS]?.name || r.agent}
**Task:** ${r.task}
**Status:** FAILED - ${r.error || "No data returned"}`;
      }
    })
    .join("\n\n");

  // Detect language and adjust response language
  const respondInSpanish = isSpanish(userQuery);
  const languageInstruction = respondInSpanish
    ? "\n\n## IMPORTANT: The user wrote in Spanish. You MUST respond entirely in Spanish."
    : "";

  const systemPrompt = `You are a senior crypto analyst writing a clear, well-structured report for a fellow trader.

## Formatting Guidelines:
- Use 2-4 section headers (## Header) to organize your analysis
- Mix short paragraphs with occasional bullet points for key data
- Bullets are good for: listing tokens, prices, percentages, quick comparisons
- Paragraphs are good for: context, explanations, opinions, summaries
- Use **bold** for important numbers, token names, and key terms
- Keep each section focused and scannable
- Be conversational but professional
- NO emojis
- NEVER mention missing data, failed agents, or empty responses - just work with what you have
- Do NOT say things like "no data was found" - simply skip those topics${languageInstruction}`;

  const userPrompt = `Question: "${userQuery}"

Agent Data:
${resultsFormatted}

Write a well-structured analysis with clear sections. Use headers to organize topics, bullets for data points and lists, and short paragraphs for explanations and insights. Make it easy to scan but also informative.`;

  // Use raw fetch to access reasoning_content stream
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-reasoner",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let reasoningContent = "";
  let content = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;

          if (delta?.reasoning_content) {
            reasoningContent += delta.reasoning_content;
            await onReasoningChunk(delta.reasoning_content);
          }
          if (delta?.content) {
            content += delta.content;
            await onContentChunk(delta.content);
          }
        } catch {
          // Ignore parsing errors
        }
      }
    }
  }

  return { reasoning: reasoningContent, content };
}

/**
 * Main API Handler with SSE for progress updates
 */
export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Check rate limit
    const rateLimit = checkRateLimitByIP(req);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    incrementUsageByIP(req);

    const userQuery = messages[messages.length - 1]?.content || "";
    if (!userQuery) {
      return new Response(
        JSON.stringify({ error: "No query provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create SSE stream for progress updates
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const sendEvent = async (event: ProgressEvent) => {
      const data = `data: ${JSON.stringify(event)}\n\n`;
      await writer.write(encoder.encode(data));
    };

    // Run the analysis in the background
    (async () => {
      try {
        console.log("\n[DEGEN] Starting analysis for:", userQuery);
        await sendEvent({ type: "start", query: userQuery });

        // STEP 1: Orchestrator with streaming
        console.log("[STEP 1] Orchestrating...");
        await sendEvent({ type: "orchestrator_start" });
        const orchestration = await orchestrateWithStreaming(userQuery, async (chunk) => {
          await sendEvent({ type: "orchestrator_chunk", text: chunk });
        });
        await sendEvent({ type: "orchestrator_done", decision: orchestration });
        console.log("[STEP 1] Orchestrator selected:", orchestration.agents.join(", "));

        // Validate agent selection (enforce 5 max, Twitter exclusivity)
        const validatedAgents = validateAgentSelection(orchestration.agents);
        if (validatedAgents.length !== orchestration.agents.length) {
          console.log("[STEP 1] Validated agents:", validatedAgents.join(", "));
          orchestration.agents = validatedAgents;
        }

        // STEP 2: Execute agents sequentially with validation
        console.log("[STEP 2] Executing agents...");
        const agentResults: AgentResult[] = [];

        for (const agentId of validatedAgents) {
          const task = orchestration.tasks[agentId] || "General analysis";
          console.log(`[Agent] Starting ${agentId}`);
          await sendEvent({ type: "agent_start", agent: agentId, task });

          try {
            const data = await executeAgent(agentId, task);

            // Validate if data has actual content
            const validation = validateAgentData(agentId, data);
            if (validation.valid) {
              agentResults.push({ agent: agentId, task, success: true, data });
              await sendEvent({ type: "agent_done", agent: agentId, success: true });
              console.log(`[Agent] ${agentId} completed with valid data`);
            } else {
              // Data is empty - mark as failed to trigger retry
              console.log(`[Agent] ${agentId} returned empty data: ${validation.reason}`);
              agentResults.push({ agent: agentId, task, success: false, data: null, error: validation.reason });
              await sendEvent({ type: "agent_done", agent: agentId, success: false, error: validation.reason });
            }
          } catch (error) {
            const errorMsg = getErrorMessage(error);
            agentResults.push({ agent: agentId, task, success: false, data: null, error: errorMsg });
            await sendEvent({ type: "agent_done", agent: agentId, success: false, error: errorMsg });
            console.log(`[Agent] ${agentId} failed:`, errorMsg);
          }
        }

        // STEP 2.5: Check for failures and retry (up to 2 retry rounds)
        const MAX_RETRY_ROUNDS = 2;
        for (let retryRound = 0; retryRound < MAX_RETRY_ROUNDS; retryRound++) {
          const failedAgents = agentResults
            .filter(r => !r.success)
            .map(r => ({ agent: r.agent, task: r.task, error: r.error || "Unknown error" }));

          if (failedAgents.length === 0) break;

          console.log(`[STEP 2.5] Round ${retryRound + 1}: ${failedAgents.length} agents failed, planning retries...`);
          await sendEvent({ type: "retry_check_start", failedAgents: failedAgents.map(f => f.agent) });

          // Get retry strategy from DeepSeek (or use simple fallback for round 2)
          let retryPlan: { agent: string; newTask: string }[];
          if (retryRound === 0) {
            retryPlan = await checkAndPlanRetries(failedAgents, userQuery);
          } else {
            // Second round: use simple fallback tasks directly
            retryPlan = failedAgents.map(f => ({
              agent: f.agent,
              newTask: getSimpleFallbackTask(f.agent),
            }));
          }
          await sendEvent({ type: "retry_check_done", retryPlan });
          console.log(`[STEP 2.5] Retry plan:`, retryPlan.map(r => `${r.agent}: ${r.newTask}`).join(", "));

          // Execute retries
          for (const retry of retryPlan) {
            const existingIndex = agentResults.findIndex(r => r.agent === retry.agent);
            console.log(`[Retry ${retryRound + 1}] Retrying ${retry.agent} with: "${retry.newTask}"`);
            await sendEvent({ type: "agent_start", agent: retry.agent, task: retry.newTask, isRetry: true });

            try {
              const data = await executeAgent(retry.agent, retry.newTask, { isRetry: true });

              // Validate the retry data too
              const validation = validateAgentData(retry.agent, data);
              if (validation.valid) {
                if (existingIndex >= 0) {
                  agentResults[existingIndex] = { agent: retry.agent, task: retry.newTask, success: true, data };
                }
                await sendEvent({ type: "agent_done", agent: retry.agent, success: true });
                console.log(`[Retry ${retryRound + 1}] ${retry.agent} succeeded with valid data`);
              } else {
                console.log(`[Retry ${retryRound + 1}] ${retry.agent} returned empty data: ${validation.reason}`);
                if (existingIndex >= 0) {
                  agentResults[existingIndex] = { ...agentResults[existingIndex], error: validation.reason };
                }
                await sendEvent({ type: "agent_done", agent: retry.agent, success: false, error: validation.reason });
              }
            } catch (error) {
              const errorMsg = getErrorMessage(error);
              console.log(`[Retry ${retryRound + 1}] ${retry.agent} failed again:`, errorMsg);

              // TWITTER FALLBACK: Try alternative Twitter agent before AIXBT
              const alternativeTwitter = getAlternativeTwitterAgent(retry.agent);
              if (alternativeTwitter && retryRound === MAX_RETRY_ROUNDS - 1) {
                console.log(`[Fallback] Trying alternative Twitter agent: ${alternativeTwitter}`);
                try {
                  const altData = await executeAgent(alternativeTwitter, retry.newTask, { isRetry: true });
                  const altValidation = validateAgentData(alternativeTwitter, altData);

                  if (altValidation.valid) {
                    if (existingIndex >= 0) {
                      agentResults[existingIndex] = {
                        agent: retry.agent,
                        task: `[${alternativeTwitter} Fallback] ${retry.newTask}`,
                        success: true,
                        data: {
                          ...altData as object,
                          source: `${alternativeTwitter} (fallback from ${retry.agent})`,
                          note: `${retry.agent} was unavailable, using ${alternativeTwitter} instead`
                        }
                      };
                    }
                    await sendEvent({ type: "agent_done", agent: retry.agent, success: true });
                    console.log(`[Fallback] ${alternativeTwitter} succeeded`);
                  } else {
                    throw new Error(`${alternativeTwitter} returned empty data`);
                  }
                } catch (altError) {
                  console.log(`[Fallback] ${alternativeTwitter} also failed:`, getErrorMessage(altError));

                  // FINAL FALLBACK: Use AIXBT for sentiment analysis
                  console.log(`[Fallback] Using AIXBT for sentiment analysis as final fallback`);
                  try {
                    const topicMatch = retry.newTask.match(/\b(SOL|Solana|BTC|Bitcoin|ETH|Ethereum|crypto|market)\b/i);
                    const topic = topicMatch ? topicMatch[1] : undefined;

                    const aixbtData = await aixbtAgent.getDeepSentimentAnalysis(topic);
                    if (existingIndex >= 0) {
                      agentResults[existingIndex] = {
                        agent: retry.agent,
                        task: `[AIXBT Fallback] Sentiment analysis for: ${topic || 'crypto market'}`,
                        success: true,
                        data: {
                          ...aixbtData,
                          source: "AIXBT (Twitter fallback)",
                          note: "Both Twitter agents were unavailable, using AIXBT aggregated sentiment data"
                        }
                      };
                    }
                    await sendEvent({ type: "agent_done", agent: retry.agent, success: true });
                    console.log(`[Fallback] AIXBT sentiment analysis succeeded`);
                  } catch (aixbtError) {
                    if (existingIndex >= 0) {
                      agentResults[existingIndex] = { ...agentResults[existingIndex], error: errorMsg };
                    }
                    await sendEvent({ type: "agent_done", agent: retry.agent, success: false, error: errorMsg });
                    console.log(`[Fallback] AIXBT also failed:`, getErrorMessage(aixbtError));
                  }
                }
              } else {
                if (existingIndex >= 0) {
                  agentResults[existingIndex] = { ...agentResults[existingIndex], error: errorMsg };
                }
                await sendEvent({ type: "agent_done", agent: retry.agent, success: false, error: errorMsg });
              }
            }
          }
        }

        // STEP 3: Synthesize with DeepSeek Reasoner (streaming)
        console.log("[STEP 3] Synthesizing with streaming...");
        await sendEvent({ type: "reasoner_start" });
        const synthesis = await synthesizeWithStreaming(
          userQuery,
          orchestration,
          agentResults,
          // Callback for reasoning (chain of thought)
          async (chunk) => {
            await sendEvent({ type: "reasoner_chunk", text: chunk });
          },
          // Callback for content (final answer)
          async (chunk) => {
            await sendEvent({ type: "reasoner_content_chunk", text: chunk });
          }
        );
        await sendEvent({ type: "reasoner_done" });
        console.log("[STEP 3] Synthesis complete");

        // Format final response using the content from reasoner
        const successCount = agentResults.filter((r) => r.success).length;
        const finalResponse = `## Research Analysis

**Your Question:** ${userQuery}

**Agents Used:** ${orchestration.agents.map(a => AVAILABLE_AGENTS[a as keyof typeof AVAILABLE_AGENTS]?.name || a).join(", ")}

---

${synthesis.content}

---
*Analysis completed using ${successCount} data sources.*`;

        await sendEvent({ type: "complete", response: finalResponse });
        console.log("[DEGEN] Analysis complete\n");

      } catch (error) {
        console.error("[DEGEN] Fatal error:", error);
        await sendEvent({
          type: "complete",
          response: `Error during analysis: ${getErrorMessage(error)}`
        });
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    console.error("[DEGEN] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
