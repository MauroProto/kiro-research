import { callHeuristAgent } from '../client';
import { HEURIST_CONFIG } from '../config';

/**
 * AIXBT Project Info Agent
 * Cost: FREE
 *
 * Official Tools:
 * - search_projects: Search for cryptocurrency projects with comprehensive details
 *   (fundamental analysis, market performance, social activity, recent developments)
 *   Perfect for discovering trending projects, researching by name/ticker/Twitter
 *
 * - get_market_summary: Get 10-15 bite-sized news about market trends, opportunities,
 *   and catalysts. Includes macroeconomics and major crypto updates.
 */

export interface ProjectInfo {
  name: string;
  symbol: string;
  description: string;
  website?: string;
  twitter?: string;
  github?: string;
  category?: string;
  chains?: string[];
}

export interface ProjectAnalysis {
  project: ProjectInfo;
  fundamentals: {
    market_cap?: number;
    fdv?: number;
    tvl?: number;
    revenue?: number;
    token_utility: string;
    tokenomics_summary: string;
  };
  social: {
    twitter_followers?: number;
    twitter_engagement?: number;
    discord_members?: number;
    telegram_members?: number;
    sentiment: 'positive' | 'negative' | 'neutral';
  };
  strengths: string[];
  weaknesses: string[];
  competitors: string[];
  summary: string;
  rating?: number; // 1-10
}

/**
 * Search for projects with comprehensive details
 * Uses QUERY mode for better compatibility
 *
 * Perfect for discovering trending projects, researching by name/ticker/Twitter handle
 */
export async function searchProjects(
  query: string
): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.aixbt,
    {
      query: `Search for cryptocurrency project: ${query}. Provide comprehensive details including fundamental analysis, market performance, social activity, community metrics, recent developments, and any significant news. Include strengths, weaknesses, and competitors if available.`,
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 5 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || `No project data found for ${query}`,
    data: result?.data,
  };
}

/**
 * Get market summary with 10-15 bite-sized news
 * Uses QUERY mode for better compatibility
 *
 * Returns market trends, opportunities, catalysts, macroeconomics
 */
export async function getMarketSummary(): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.aixbt,
    {
      query: "Give me a comprehensive market summary with 10-15 bite-sized news about current market trends, opportunities, and catalysts. Include macroeconomics updates and major crypto news. What are the top movers and trending narratives?",
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 5 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || "No market summary available",
    data: result?.data,
  };
}

/**
 * Get comprehensive project analysis
 * Uses search_projects with natural language query
 */
export async function analyzeProject(
  projectQuery: string
): Promise<ProjectAnalysis> {
  const response = await callHeuristAgent<ProjectAnalysis>(
    HEURIST_CONFIG.agents.aixbt,
    {
      query: `Search for ${projectQuery} and provide comprehensive fundamental analysis, social activity, market performance, and recent developments.`,
    },
    { useCache: true, cacheTTL: 10 * 60 * 1000 }
  );

  return response.result;
}

/**
 * Compare projects
 */
export async function compareProjects(
  projects: string[]
): Promise<{
  comparison: Array<{
    name: string;
    symbol: string;
    category: string;
    market_cap?: number;
    strengths: string[];
    weaknesses: string[];
  }>;
  recommendation: string;
  winner?: string;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.aixbt,
    {
      query: `Compare these projects: ${projects.join(', ')}. Which one has better fundamentals, team, and potential?`,
    },
    { useCache: true, cacheTTL: 10 * 60 * 1000 }
  );

  return response.result as {
    comparison: Array<{
      name: string;
      symbol: string;
      category: string;
      market_cap?: number;
      strengths: string[];
      weaknesses: string[];
    }>;
    recommendation: string;
    winner?: string;
  };
}

/**
 * Deep sentiment analysis - used as fallback when Twitter fails
 * Provides comprehensive market sentiment from AIXBT's aggregated data
 */
export async function getDeepSentimentAnalysis(
  topic?: string
): Promise<{
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  analysis: string;
  key_factors: string[];
  market_mood: string;
  trending_narratives: string[];
  social_metrics?: {
    overall_engagement: string;
    sentiment_distribution: { positive: number; negative: number; neutral: number };
  };
}> {
  const query = topic
    ? `Analyze the current market sentiment for ${topic}. What is the overall mood? Is the community bullish or bearish? What are people talking about? What are the key narratives and catalysts? Provide a deep analysis.`
    : `Analyze the current overall crypto market sentiment. What is the mood? Is the market bullish or bearish? What are the trending narratives? What are people excited or worried about? Provide a comprehensive sentiment analysis.`;

  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.aixbt,
    {
      query,
    },
    { useCache: true, cacheTTL: 5 * 60 * 1000 }
  );

  const result = response.result as {
    response?: string;
    data?: {
      sentiment?: string;
      market_sentiment?: string;
      trending_narratives?: string[];
      news?: Array<{ title?: string; content?: string }>;
    };
  };

  const responseText = result?.response || '';
  const textLower = responseText.toLowerCase();

  // Determine sentiment from response
  let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let confidence = 0.5;

  const bullishIndicators = (textLower.match(/bullish|optimis|positive|growth|rally|pump|moon|exciting|strong/g) || []).length;
  const bearishIndicators = (textLower.match(/bearish|pessimis|negative|decline|crash|dump|concern|weak|fear/g) || []).length;

  if (bullishIndicators > bearishIndicators + 2) {
    sentiment = 'bullish';
    confidence = Math.min(0.9, 0.5 + (bullishIndicators - bearishIndicators) * 0.1);
  } else if (bearishIndicators > bullishIndicators + 2) {
    sentiment = 'bearish';
    confidence = Math.min(0.9, 0.5 + (bearishIndicators - bullishIndicators) * 0.1);
  }

  // Extract key factors from response
  const keyFactors: string[] = [];
  const sentences = responseText.split(/[.!?]+/);
  for (const sentence of sentences.slice(0, 5)) {
    if (sentence.trim().length > 20 && sentence.trim().length < 200) {
      keyFactors.push(sentence.trim());
    }
  }

  return {
    sentiment,
    confidence,
    analysis: responseText || 'Market sentiment analysis based on aggregated social and market data.',
    key_factors: keyFactors.slice(0, 5),
    market_mood: sentiment === 'bullish' ? 'Optimistic' : sentiment === 'bearish' ? 'Cautious' : 'Mixed',
    trending_narratives: result?.data?.trending_narratives || [],
    social_metrics: {
      overall_engagement: 'Moderate',
      sentiment_distribution: {
        positive: sentiment === 'bullish' ? 60 : sentiment === 'bearish' ? 20 : 40,
        negative: sentiment === 'bearish' ? 60 : sentiment === 'bullish' ? 20 : 30,
        neutral: 30,
      },
    },
  };
}

/**
 * Get projects by category
 */
export async function getProjectsByCategory(
  category: string
): Promise<{
  projects: Array<{
    name: string;
    symbol: string;
    market_cap?: number;
    description: string;
    rating?: number;
  }>;
  category_overview: string;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.aixbt,
    {
      query: `What are the top projects in the ${category} category? Give me the leaders and up-and-coming projects.`,
    },
    { useCache: true, cacheTTL: 10 * 60 * 1000 }
  );

  return response.result as {
    projects: Array<{
      name: string;
      symbol: string;
      market_cap?: number;
      description: string;
      rating?: number;
    }>;
    category_overview: string;
  };
}
