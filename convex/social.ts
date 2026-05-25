import { internalAction, internalMutation, mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

/**
 * SOCIAL MEDIA ENGINE
 */

export const generateAndSchedulePost = internalAction({
  args: { agentId: v.string() },
  returns: v.null(),
  handler: async (ctx, { agentId }) => {
    const nvidia = createOpenAI({
      apiKey: process.env.NVIDIA_NIM_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });

    // 1. Get agent details
    const services = await ctx.runQuery(api.updates.getAgentServices, { agent_id: agentId });
    const agentName = services[0]?.name || "Expert Agent";
    const agentDesc = services[0]?.description || "Professional service";

    // 2. Generate engaging content
    const platforms = ["X", "LinkedIn", "Facebook", "Instagram", "Threads"];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];

    const { text: content } = await generateText({
      model: nvidia.chat("meta/llama-3.1-405b-instruct"),
      prompt: `Generate a highly engaging social media post for ${platform} about our "${agentName}" service.
      Agent Description: ${agentDesc}
      Requirements:
      - Use professional yet catchy tone.
      - Include relevant hashtags.
      - Include a Call to Action (CTA) to visit prosuite.ng.
      - Platform specific: ${platform === 'X' ? 'Max 280 chars' : 'Detailed and informative'}.
      Return ONLY the post text.`,
    });

    // 3. Schedule the post in DB
    await ctx.runMutation(internal.social.saveScheduledPost, {
      agentId,
      platform,
      content: content.trim(),
      scheduledFor: Date.now() + (30 * 60 * 1000), // Schedule for 30 mins from now
    });
  },
});

export const saveScheduledPost = internalMutation({
  args: { agentId: v.string(), platform: v.string(), content: v.string(), scheduledFor: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("social_posts", {
      ...args,
      status: "scheduled",
    });
  },
});

export const processScheduledPosts = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const posts = await ctx.runQuery(internal.social.getPendingPosts, { now });

    for (const post of posts) {
      try {
        // Mocking Postiz API Call
        console.log(`[SOCIAL] Posting to ${post.platform}: ${post.content.substring(0, 50)}...`);
        
        const response = await fetch(`${process.env.POSTIZ_API_URL || 'https://api.postiz.com'}/api/v1/posts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.POSTIZ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: post.platform,
            content: post.content,
            imageUrl: post.imageUrl,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          await ctx.runMutation(internal.social.markPostSuccess, { 
            postId: post._id, 
            externalId: data.id || "mock-id" 
          });
        } else {
          throw new Error(`API Error: ${response.statusText}`);
        }
      } catch (err: any) {
        console.error(`Failed to post ${post._id}:`, err);
        await ctx.runMutation(internal.social.markPostFailed, { 
          postId: post._id, 
          error: err.message 
        });
      }
    }
  },
});

export const getPendingPosts = internalQuery({
  args: { now: v.number() },
  returns: v.any(),
  handler: async (ctx, { now }) => {
    return await ctx.db.query("social_posts")
      .withIndex("by_status_and_scheduled", q => q.eq("status", "scheduled").lte("scheduledFor", now))
      .collect();
  },
});

export const markPostSuccess = internalMutation({
  args: { postId: v.id("social_posts"), externalId: v.string() },
  returns: v.null(),
  handler: async (ctx, { postId, externalId }) => {
    await ctx.db.patch(postId, {
      status: "posted",
      postedAt: Date.now(),
      externalId,
    });
  },
});

export const markPostFailed = internalMutation({
  args: { postId: v.id("social_posts"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, { postId, error }) => {
    await ctx.db.patch(postId, {
      status: "failed",
      error,
    });
  },
});

/**
 * SOCIAL CRON HELPERS
 */

export const rotateSocialAgents = internalMutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const agents = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A11", "A12", "A13", "A14", "A15"];
    
    // Simple rotation: check last post
    const lastPost = await ctx.db.query("social_posts")
      .order("desc")
      .first();
    
    let nextIndex = 0;
    if (lastPost) {
      const lastIndex = agents.indexOf(lastPost.agentId);
      nextIndex = (lastIndex + 1) % agents.length;
    }

    const nextAgentId = agents[nextIndex];
    await ctx.scheduler.runAfter(0, internal.social.generateAndSchedulePost, { agentId: nextAgentId });
    return nextAgentId;
  },
});

export const getSocialStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const posts = await ctx.db.query("social_posts").collect();
    return {
      total: posts.length,
      posted: posts.filter(p => p.status === "posted").length,
      failed: posts.filter(p => p.status === "failed").length,
      scheduled: posts.filter(p => p.status === "scheduled").length,
      history: posts.slice(-20).reverse(),
    };
  },
});
