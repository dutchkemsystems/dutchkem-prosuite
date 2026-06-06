import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const seedKdp = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // 1. Seed initial services for all agents
    await ctx.runMutation(internal.updates.seedInitialServices, {});

    // 2. Run service updates (this will pick up SPRING_2026 including KDP)
    await ctx.runMutation(api.updates.runServiceUpdates, {});

    console.log("KDP Service and standard services seeded successfully.");
  },
});