import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

/** Minimal test: just validate auth and insert ONE template */
export const testSeedOne = mutation({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      // Step 1: Test auth
      let identity;
      try {
        identity = await tryGetAdminSession(ctx, args.adminToken);
      } catch (authErr: any) {
        return { step: "auth", error: authErr.message };
      }
      if (!identity) return { step: "auth", error: "No identity returned", token: args.adminToken.substring(0, 10) + "..." };

      // Step 2: Test query
      let existing;
      try {
        existing = await ctx.db.query("agent_marketplace_templates")
          .withIndex("by_template_id", (q) => q.eq("templateId", "CS-TEST"))
          .first();
      } catch (queryErr: any) {
        return { step: "query", error: queryErr.message };
      }

      // Step 3: Test insert
      if (!existing) {
        try {
          await ctx.db.insert("agent_marketplace_templates", {
            templateId: "CS-TEST",
            name: "Test Template",
            description: "A test template for debugging",
            category: "Customer Service",
            author: "Dutchkem AI",
            version: "1.0.0",
            priceNgn: 4500,
            isFree: false,
            config: { bestFor: "All Sizes", tags: ["test"], type: "template" },
            tags: ["test"],
            installCount: 0,
            rating: 0,
            reviewCount: 0,
            isPublished: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        } catch (insertErr: any) {
          return { step: "insert", error: insertErr.message };
        }
      }

      return { success: true, message: "Test insert passed", identity: identity.email };
    } catch (e: any) {
      return { step: "unknown", error: e.message, stack: e.stack?.substring(0, 500) };
    }
  },
});

/** Count templates */
export const countTemplates = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const all = await ctx.db.query("agent_marketplace_templates").take(500);
    return { total: all.length };
  },
});
