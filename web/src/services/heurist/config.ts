// Heurist MCP Configuration
const SERVER_ID = process.env.HEURIST_SERVER_ID || '794d5bc4';

export const HEURIST_CONFIG = {
  // Server ID for MCP
  serverId: SERVER_ID,

  // MCP SSE Endpoint
  sseEndpoint: `https://sequencer-v2.heurist.xyz/tool${SERVER_ID}/sse`,

  // REST API Endpoint (alternative to SSE)
  apiEndpoint: 'https://sequencer-v2.heurist.xyz',

  // Mesh API Endpoint
  meshEndpoint: 'https://mesh.heurist.xyz',

  // API Key (from environment)
  apiKey: process.env.HEURIST_API_KEY || '',

  // Agent IDs - DEGEN Mode (max 5 per query + TradingView)
  // All 12 agents available to user
  agents: {
    // Token Data Agents
    tokenResolver: 'TokenResolverAgent',
    coingecko: 'CoinGeckoTokenInfoAgent',
    dexscreener: 'DexScreenerTokenInfoAgent',
    solanaToken: 'BitquerySolanaTokenInfoAgent',
    tokenAnalysis: 'UnifaiTokenAnalysisAgent',

    // Twitter Agents (mutually exclusive - only one can be used)
    twitter: 'TwitterIntelligenceAgent',
    elfaTwitter: 'ElfaTwitterIntelligenceAgent',

    // Analysis & News Agents
    aixbt: 'AIXBTProjectInfoAgent',
    news: 'UnifaiWeb3NewsAgent',
    trending: 'TrendingTokenAgent',
    pumpfun: 'PumpFunTokenAgent',

    // Forensics Agents
    baseUsdcForensics: 'BaseUSDCForensicsAgent',
  },

  // Credits per agent (0 = FREE)
  credits: {
    TokenResolverAgent: 1,
    CoinGeckoTokenInfoAgent: 1,
    DexScreenerTokenInfoAgent: 1,
    BitquerySolanaTokenInfoAgent: 1,
    UnifaiTokenAnalysisAgent: 0, // FREE
    TwitterIntelligenceAgent: 10,
    ElfaTwitterIntelligenceAgent: 10,
    AIXBTProjectInfoAgent: 0, // FREE
    UnifaiWeb3NewsAgent: 0, // FREE
    TrendingTokenAgent: 1,
    PumpFunTokenAgent: 1,
    BaseUSDCForensicsAgent: 3,
  },

  // Twitter agents are mutually exclusive
  twitterAgents: ['twitter', 'elfaTwitter'] as const,

  // Max agents per query (excluding TradingView chart)
  maxAgentsPerQuery: 5,
} as const;

export type AgentId = typeof HEURIST_CONFIG.agents[keyof typeof HEURIST_CONFIG.agents];
export type TwitterAgentKey = typeof HEURIST_CONFIG.twitterAgents[number];
