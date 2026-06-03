// convex/social.ts
// ✅ CRITICAL: This uses ACTION (not mutation) for HTTP calls
import { action, internalAction, internalMutation, query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
// ✅ ACTION - makes HTTP request to Postiz (ALLOWED)
export const generateOAuthUrl = action({
  args: {
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[OAuth] Starting for ${args.platform}`);
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const POSTIZ_API_KEY = process.env.POSTIZ_API_KEY;
    const POSTIZ_API_URL = process.env.POSTIZ_API_URL || "https://api.postiz.com/v1";
    const APP_URL = process.env.APP_URL || "http://localhost:3000";
    const response = await fetch(`${POSTIZ_API_URL}/oauth/initiate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${POSTIZ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform: args.platform,
        redirect_uri: `${APP_URL}/api/postiz/callback/${args.platform}`,
      }),
    });
    if (!response.ok) {
      return { success: false, error: `Postiz error: ${response.status}` };
    }
    const data = await response.json();
    await ctx.runAction(internal.social.storeOAuthStateInternal, {
      state: data.state,
      platform: args.platform,
      adminId: identity.subject,
    });
    return {
      success: true,
      authUrl: data.auth_url,
      platform: args.platform,
    };
  },
});
export const storeOAuthStateInternal = internalAction({
  args: {
    state: v.string(),
    platform: v.string(),
    adminId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.social.storeOAuthStateMutation, {
      state: args.state,
      platform: args.platform,
      adminId: args.adminId,
    });
  },
});
export const storeOAuthStateMutation = internalMutation({
  args: {
    state: v.string(),
    platform: v.string(),
    adminId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("oauth_states", {
      state: args.state,
      platform: args.platform,
      adminId: args.adminId,
      expiresAt: Date.now() + 10 * 60 * 1000,
      createdAt: Date.now(),
    });
  },
});
export const getConnections = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query("platform_connections")
      .withIndex("by_admin", (q) => q.eq("adminId", identity.subject))
      .collect();
  },
});
export const disconnectPlatform = mutation({
  args: { platformId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const connection = await ctx.db
      .query("platform_connections")
      .withIndex("by_admin_platform", (q) =>
        q.eq("adminId", identity.subject).eq("platformId", args.platformId)
      )
      .first();
    if (connection) {
      await ctx.db.patch(connection._id, { 
        isConnected: false, 
        updatedAt: Date.now() 
      });
    }
  },
});
