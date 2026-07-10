import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

// ═══════════════════════════════════════════════════════════════════
// OAUTH STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════
export const storeOAuthState = internalMutation({
  args: {
    state: v.string(), platform: v.string(), adminId: v.string(),
    codeVerifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("oauth_states", {
      state: args.state, platform: args.platform, adminId: args.adminId,
      codeVerifier: args.codeVerifier,
      expiresAt: Date.now() + 10 * 60 * 1000, createdAt: Date.now(),
    });
  },
});

export const getOAuthState = internalQuery({
  args: { state: v.string() },
  handler: async (ctx, { state }) => {
    const doc = await ctx.db
      .query("oauth_states")
      .withIndex("by_state", (q) => q.eq("state", state))
      .first();
    if (!doc) return null;
    if (doc.expiresAt <= Date.now()) return null;
    return doc;
  },
});

export const deleteOAuthState = internalMutation({
  args: { stateId: v.id("oauth_states") },
  handler: async (ctx, { stateId }) => { await ctx.db.delete("oauth_states", stateId); },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Generate OAuth URL for any platform
// ═══════════════════════════════════════════════════════════════════