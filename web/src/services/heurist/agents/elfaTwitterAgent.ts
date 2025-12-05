import { callHeuristAgent } from '../client';
import { HEURIST_CONFIG } from '../config';

/**
 * Elfa Twitter Agent
 * Cost: x402 payment
 *
 * AI-powered Twitter intelligence for crypto. Analyzes smart mentions,
 * tracks influential accounts, and identifies trending tokens from Twitter activity.
 *
 * Official Tools:
 * - search_mentions: Search for smart mentions of a token/topic on Twitter
 * - search_account: Search for tweets from a specific Twitter account
 * - get_trending_tokens: Get trending tokens based on Twitter activity
 */

export interface TwitterMention {
  tweet_id: string;
  author: string;
  author_followers?: number;
  content: string;
  timestamp: string;
  engagement: {
    likes?: number;
    retweets?: number;
    replies?: number;
  };
  sentiment?: 'positive' | 'negative' | 'neutral';
  influence_score?: number;
  is_smart_money?: boolean;
}

export interface AccountTweet {
  tweet_id: string;
  content: string;
  timestamp: string;
  engagement: {
    likes?: number;
    retweets?: number;
    replies?: number;
  };
  mentioned_tokens?: string[];
  hashtags?: string[];
}

export interface TwitterTrendingToken {
  symbol: string;
  name?: string;
  mention_count: number;
  sentiment_score?: number;
  top_influencers?: string[];
  price_correlation?: number;
  trending_score?: number;
}

/**
 * Search for smart mentions of a token/topic on Twitter
 * Tool: search_mentions
 *
 * Returns mentions from influential accounts and smart money
 */
export async function searchMentions(
  query: string,
  options: {
    limit?: number;
    minFollowers?: number;
    onlySmartMoney?: boolean;
  } = {}
): Promise<{
  mentions: TwitterMention[];
  total_count?: number;
  sentiment_summary?: {
    positive: number;
    negative: number;
    neutral: number;
  };
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.elfaTwitter,
    {
      tool: 'search_mentions',
      tool_arguments: {
        query,
        limit: options.limit,
        min_followers: options.minFollowers,
        only_smart_money: options.onlySmartMoney,
      },
    },
    { useCache: true, cacheTTL: 2 * 60 * 1000 }
  );

  const result = response.result as {
    response?: string;
    data?: {
      mentions?: TwitterMention[];
      total_count?: number;
      sentiment_summary?: {
        positive: number;
        negative: number;
        neutral: number;
      };
    };
  };

  return {
    mentions: result?.data?.mentions || [],
    total_count: result?.data?.total_count,
    sentiment_summary: result?.data?.sentiment_summary,
  };
}

/**
 * Search for tweets from a specific Twitter account
 * Tool: search_account
 */
export async function searchAccount(
  username: string,
  options: {
    limit?: number;
    includeReplies?: boolean;
  } = {}
): Promise<{
  tweets: AccountTweet[];
  account_info?: {
    followers: number;
    following: number;
    tweet_count: number;
    is_verified?: boolean;
  };
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.elfaTwitter,
    {
      tool: 'search_account',
      tool_arguments: {
        username,
        limit: options.limit,
        include_replies: options.includeReplies,
      },
    },
    { useCache: true, cacheTTL: 2 * 60 * 1000 }
  );

  const result = response.result as {
    response?: string;
    data?: {
      tweets?: AccountTweet[];
      account_info?: {
        followers: number;
        following: number;
        tweet_count: number;
        is_verified?: boolean;
      };
    };
  };

  return {
    tweets: result?.data?.tweets || [],
    account_info: result?.data?.account_info,
  };
}

/**
 * Get trending tokens based on Twitter activity
 * Tool: get_trending_tokens
 *
 * Analyzes Twitter activity to identify trending crypto tokens
 */
export async function getTrendingTokensFromTwitter(): Promise<{
  tokens: TwitterTrendingToken[];
  summary?: string;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.elfaTwitter,
    {
      tool: 'get_trending_tokens',
      tool_arguments: {},
    },
    { useCache: true, cacheTTL: 5 * 60 * 1000 }
  );

  const result = response.result as {
    response?: string;
    data?: {
      tokens?: TwitterTrendingToken[];
    };
  };

  return {
    tokens: result?.data?.tokens || [],
    summary: result?.response || `Found ${result?.data?.tokens?.length || 0} trending tokens on Twitter`,
  };
}

/**
 * Comprehensive Twitter analysis for a token
 * Combines mentions search with trending data
 */
export async function analyzeTokenOnTwitter(
  tokenSymbol: string
): Promise<{
  mentions: TwitterMention[];
  sentiment_summary?: {
    positive: number;
    negative: number;
    neutral: number;
  };
  is_trending: boolean;
  trending_rank?: number;
}> {
  const [mentionsResult, trendingResult] = await Promise.all([
    searchMentions(tokenSymbol, { limit: 20 }),
    getTrendingTokensFromTwitter(),
  ]);

  const trendingToken = trendingResult.tokens.find(
    t => t.symbol.toLowerCase() === tokenSymbol.toLowerCase()
  );

  return {
    mentions: mentionsResult.mentions,
    sentiment_summary: mentionsResult.sentiment_summary,
    is_trending: !!trendingToken,
    trending_rank: trendingToken
      ? trendingResult.tokens.indexOf(trendingToken) + 1
      : undefined,
  };
}
