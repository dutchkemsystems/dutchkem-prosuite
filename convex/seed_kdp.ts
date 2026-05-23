import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";

export default mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Seed initial services for all agents
    await ctx.runMutation(internal.updates.seedInitialServices, {});

    // 2. Run service updates (this will pick up SPRING_2026 including KDP)
    await ctx.runMutation(api.updates.runServiceUpdates, {});

    console.log("KDP Service and standard services seeded successfully.");
  },
});
