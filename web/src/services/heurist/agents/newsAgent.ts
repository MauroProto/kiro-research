import { callHeuristAgent } from '../client';
import { HEURIST_CONFIG } from '../config';

/**
 * Unifai Web3 News Agent
 * Cost: FREE
 *
 * Fetches latest Web3 and cryptocurrency news
 * Uses QUERY mode since no specific tools are documented
 */

export interface NewsItem {
  title: string;
  summary?: string;
  url?: string;
  source?: string;
  published_at?: string;
  category?: string;
}

/**
 * Get latest crypto news
 */
export async function getLatestNews(): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.news,
    {
      query: "What are the latest and most important cryptocurrency and Web3 news today? Include headlines, brief summaries, and sources. Focus on market-moving news, regulatory updates, and major project announcements.",
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 5 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || "No news available",
    data: result?.data,
  };
}

/**
 * Search news by topic
 */
export async function searchNews(query: string): Promise<{
  response: string;
  data?: unknown;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.news,
    {
      query: `Search for the latest news about: ${query}. Include relevant headlines, summaries, sources, and publication dates.`,
      raw_data_only: false,
    },
    { useCache: true, cacheTTL: 5 * 60 * 1000, timeout: 60000 }
  );

  const result = response.result as {
    response?: string;
    data?: unknown;
  };

  return {
    response: result?.response || "No news found for this topic",
    data: result?.data,
  };
}
