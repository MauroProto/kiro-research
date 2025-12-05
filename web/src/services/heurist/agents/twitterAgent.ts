import { callHeuristAgent } from '../client';
import { HEURIST_CONFIG } from '../config';

/**
 * Twitter Intelligence Agent
 * Cost: 10 credits per use
 *
 * Official Tools:
 * - user_timeline: Fetch a user's recent posts
 * - tweet_detail: Get a tweet with thread context and replies
 * - twitter_search: Search for posts and influential mentions
 */

export interface TwitterSearchResult {
  tweets: Array<{
    id: string;
    text: string;
    author: string;
    author_username: string;
    created_at: string;
    likes: number;
    retweets: number;
    replies: number;
    sentiment?: 'positive' | 'negative' | 'neutral';
  }>;
  summary?: string;
  sentiment_overview?: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

/**
 * Search Twitter/X for posts and influential mentions
 * Tool: twitter_search
 */
export async function searchTwitter(
  query: string,
  options: { raw_data_only?: boolean } = {}
): Promise<TwitterSearchResult> {
  const { raw_data_only = false } = options;

  const response = await callHeuristAgent<TwitterSearchResult>(
    HEURIST_CONFIG.agents.twitter,
    {
      tool: 'twitter_search',
      tool_arguments: { query },
      raw_data_only,
    },
    { useCache: true, cacheTTL: 2 * 60 * 1000 }
  );

  return response.result;
}

/**
 * Get a user's timeline (recent posts)
 * Tool: user_timeline
 */
export async function getUserTimeline(
  username: string
): Promise<{
  username: string;
  tweets: Array<{
    id: string;
    text: string;
    created_at: string;
    likes: number;
    retweets: number;
  }>;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.twitter,
    {
      tool: 'user_timeline',
      tool_arguments: { username },
    },
    { useCache: true, cacheTTL: 5 * 60 * 1000 }
  );

  return response.result as {
    username: string;
    tweets: Array<{ id: string; text: string; created_at: string; likes: number; retweets: number }>;
  };
}

/**
 * Get tweet detail with thread and replies
 * Tool: tweet_detail
 */
export async function getTweetDetail(
  tweetId: string
): Promise<{
  tweet: {
    id: string;
    text: string;
    author: string;
    created_at: string;
    likes: number;
    retweets: number;
  };
  thread: Array<{ id: string; text: string; author: string }>;
  replies: Array<{ id: string; text: string; author: string }>;
}> {
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.twitter,
    {
      tool: 'tweet_detail',
      tool_arguments: { tweet_id: tweetId },
    }
  );

  return response.result as {
    tweet: { id: string; text: string; author: string; created_at: string; likes: number; retweets: number };
    thread: Array<{ id: string; text: string; author: string }>;
    replies: Array<{ id: string; text: string; author: string }>;
  };
}

/**
 * Get sentiment analysis for a token/topic from Twitter
 * Uses twitter_search with natural language query
 */
export async function getTwitterSentiment(
  task: string
): Promise<{
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  summary: string;
  key_tweets: Array<{ text: string; author: string; engagement: number }>;
}> {
  // Use the task directly as the query - orchestrator provides the full task
  const response = await callHeuristAgent(
    HEURIST_CONFIG.agents.twitter,
    {
      query: task,
    },
    { useCache: true, cacheTTL: 2 * 60 * 1000, timeout: 60000 }  // 60 second timeout for Twitter
  );

  // response.result is { response: string, data: object }
  const result = response.result as {
    response?: string;
    data?: {
      status?: string;
      data?: {
        influential_mentions?: string | Array<unknown>;
        general_search_result?: Array<{
          text?: string;
          author?: { name?: string; followers_count?: number };
          favorite_count?: number;
          retweet_count?: number;
        }>;
      };
    };
  };

  // The response text contains the full analysis
  const responseText = result?.response || '';
  const searchResults = result?.data?.data?.general_search_result || [];

  // Parse sentiment from response text
  const textLower = responseText.toLowerCase();
  let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (textLower.includes('bullish') || textLower.includes('optimism') || textLower.includes('positive')) {
    sentiment = 'bullish';
  } else if (textLower.includes('bearish') || textLower.includes('pessimism') || textLower.includes('negative')) {
    sentiment = 'bearish';
  }

  // Extract key tweets
  const keyTweets = searchResults.slice(0, 5).map(t => ({
    text: t.text || '',
    author: t.author?.name || 'Unknown',
    engagement: (t.favorite_count || 0) + (t.retweet_count || 0),
  }));

  return {
    sentiment,
    confidence: 0.7,
    summary: responseText || 'No sentiment analysis available',
    key_tweets: keyTweets,
  };
}

/**
 * Search for crypto discussions and alpha
 */
export async function searchCryptoDiscussions(
  topic: string
): Promise<TwitterSearchResult> {
  return searchTwitter(`${topic} crypto blockchain`);
}
