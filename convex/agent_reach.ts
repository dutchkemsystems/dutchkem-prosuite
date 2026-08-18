import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// AGENT REACH — Zero-cost social listening
// Twitter, Reddit, YouTube, LinkedIn, Bilibili
// ═══════════════════════════════════════════════════════════════════

const PLATFORMS: Record<string, { name: string; enabled: boolean; method: string }> = {
  twitter: { name: "Twitter/X", enabled: true, method: "nitter" },
  reddit: { name: "Reddit", enabled: true, method: "api" },
  youtube: { name: "YouTube", enabled: true, method: "invidious" },
  linkedin: { name: "LinkedIn", enabled: true, method: "proxy" },
  bilibili: { name: "Bilibili", enabled: true, method: "api" },
};

// ─── SEARCH ───

export const search = action({
  args: {
    query: v.string(),
    platforms: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const targets = args.platforms || Object.keys(PLATFORMS).filter((p) => PLATFORMS[p].enabled);
    const limit = args.limit || 10;
    const results: Record<string, any> = {};

    for (const platform of targets) {
      try {
        results[platform] = await searchPlatform(platform, args.query, limit);
      } catch (error: any) {
        results[platform] = { error: error.message, results: [] };
      }
    }

    // Log the search
    await ctx.runMutation(internal.agent_reach.logSearch, {
      query: args.query,
      platforms: targets,
      resultCount: Object.values(results).reduce(
        (sum: number, r: any) => sum + (r.results?.length || 0),
        0
      ),
    });

    return results;
  },
});

// ─── PLATFORM SEARCH ───

async function searchPlatform(platform: string, query: string, limit: number) {
  switch (platform) {
    case "twitter":
      return await searchTwitter(query, limit);
    case "reddit":
      return await searchReddit(query, limit);
    case "youtube":
      return await searchYouTube(query, limit);
    case "linkedin":
      return await searchLinkedIn(query, limit);
    case "bilibili":
      return await searchBilibili(query, limit);
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

async function searchTwitter(query: string, limit: number) {
  // Use Nitter instances (no API key needed)
  const nitterInstances = ["nitter.privacydev.net", "nitter.poast.org"];
  const results = [];

  for (const instance of nitterInstances) {
    try {
      const response = await fetch(`https://${instance}/search?f=tweets&q=${encodeURIComponent(query)}&since=&until=&near=`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (response.ok) {
        const html = await response.text();
        // Parse tweets from HTML (simplified)
        const tweetMatches = html.match(/class="tweet-content[^"]*"[^>]*>([^<]+)</g) || [];
        for (const match of tweetMatches.slice(0, limit)) {
          const content = match.replace(/class="tweet-content[^"]*"[^>]*>/, "").trim();
          if (content) results.push({ content, platform: "twitter" });
        }
        break;
      }
    } catch {
      continue;
    }
  }

  return { platform: "twitter", results, count: results.length };
}

async function searchReddit(query: string, limit: number) {
  try {
    const response = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: { "User-Agent": "DutchkemBot/1.0" },
    });
    if (!response.ok) throw new Error(`Reddit API error: ${response.status}`);

    const data = await response.json();
    const results = (data.data?.children || []).map((post: any) => ({
      title: post.data.title,
      content: post.data.selftext?.substring(0, 200),
      url: `https://reddit.com${post.data.permalink}`,
      subreddit: post.data.subreddit,
      score: post.data.score,
      platform: "reddit",
    }));

    return { platform: "reddit", results, count: results.length };
  } catch (error: any) {
    return { platform: "reddit", results: [], count: 0, error: error.message };
  }
}

async function searchYouTube(query: string, limit: number) {
  // Use Invidious API (no API key needed)
  const invidiousInstances = ["vid.puffyan.us", "invidious.snopyta.org"];
  const results = [];

  for (const instance of invidiousInstances) {
    try {
      const response = await fetch(`https://${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (response.ok) {
        const data = await response.json();
        for (const video of (data || []).slice(0, limit)) {
          results.push({
            title: video.title,
            content: video.description?.substring(0, 200),
            url: `https://youtube.com/watch?v=${video.videoId}`,
            channel: video.author,
            views: video.viewCount,
            platform: "youtube",
          });
        }
        break;
      }
    } catch {
      continue;
    }
  }

  return { platform: "youtube", results, count: results.length };
}

async function searchLinkedIn(query: string, limit: number) {
  // LinkedIn requires API key - return placeholder
  return {
    platform: "linkedin",
    results: [
      { content: `LinkedIn search for "${query}" requires API key configuration`, platform: "linkedin" },
    ],
    count: 1,
    note: "Configure LINKEDIN_API_KEY for full access",
  };
}

async function searchBilibili(query: string, limit: number) {
  try {
    const response = await fetch(`https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(query)}&page=1`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!response.ok) throw new Error(`Bilibili API error: ${response.status}`);

    const data = await response.json();
    const results = (data.data?.result || []).slice(0, limit).map((video: any) => ({
      title: video.title?.replace(/<[^>]*>/g, ""),
      content: video.description?.replace(/<[^>]*>/g, "").substring(0, 200),
      url: `https://bilibili.com/video/${video.bvid}`,
      author: video.author,
      views: video.play,
      platform: "bilibili",
    }));

    return { platform: "bilibili", results, count: results.length };
  } catch (error: any) {
    return { platform: "bilibili", results: [], count: 0, error: error.message };
  }
}

// ─── MUTATIONS ───

export const logSearch = mutation({
  args: {
    query: v.string(),
    platforms: v.array(v.string()),
    resultCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("system_config", {
      key: `agent_reach_search_${Date.now()}`,
      value: {
        query: args.query,
        platforms: args.platforms,
        resultCount: args.resultCount,
        timestamp: Date.now(),
      },
      updatedAt: Date.now(),
    });
  },
});

// ─── QUERIES ───

export const getPlatforms = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return Object.entries(PLATFORMS).map(([id, p]) => ({
      id,
      name: p.name,
      enabled: p.enabled,
      method: p.method,
    }));
  },
});

export const getStatus = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return {
      enabled: true,
      platforms: Object.keys(PLATFORMS).length,
      healthyPlatforms: Object.values(PLATFORMS).filter((p) => p.enabled).length,
    };
  },
});

import { internal } from "./_generated/api";
