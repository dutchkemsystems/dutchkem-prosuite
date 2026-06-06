import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const seedAutomation = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // 1. Seed Holidays
    await ctx.runMutation(internal.holidays.seedHolidays, {});
    console.log("✅ Holidays seeded.");

    // 2. Refresh active status based on today's date
    await ctx.runMutation(api.holidays.refreshActiveDiscounts, {});
    console.log("✅ Holiday status refreshed.");

    // 3. Seed Initial Services
    await ctx.runMutation(internal.updates.seedInitialServices, {});
    console.log("✅ Initial services seeded.");

    // 4. Check if any updates should be applied (e.g. if today is after May 1 2026)
    await ctx.runMutation(api.updates.runServiceUpdates, {});
    console.log("✅ Service updates check complete.");
  }
});
