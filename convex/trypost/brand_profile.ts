import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";

export const getBrandProfile = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    // Allow public read access for brand profile
    const profile = await ctx.db.query("trypost_brand_profile").order("desc").first();
    if (!profile) {
      // Return default profile if none exists
      return {
        authError: false,
        profile: {
          brandName: "DutchKem Ventures",
          voice: "Professional",
          toneKeywords: ["innovative", "reliable", "African"],
          targetAudience: "African SMEs, entrepreneurs, and developers",
          active: true,
        },
      };
    }
    return { authError: false, profile };
  },
});

export const upsertBrandProfile = mutation({
  args: {
    adminToken: v.string(),
    brandName: v.string(),
    voice: v.string(),
    toneKeywords: v.array(v.string()),
    targetAudience: v.string(),
    colorPalette: v.optional(v.array(v.string())),
    logoUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    autoHashtags: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db.query("trypost_brand_profile").first();
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        brandName: args.brandName,
        voice: args.voice,
        toneKeywords: args.toneKeywords,
        targetAudience: args.targetAudience,
        colorPalette: args.colorPalette,
        logoUrl: args.logoUrl,
        websiteUrl: args.websiteUrl,
        autoHashtags: args.autoHashtags,
        active: true,
        updatedAt: now,
      });
      return { success: true, id: existing._id, updated: true };
    } else {
      const id = await ctx.db.insert("trypost_brand_profile", {
        brandName: args.brandName,
        voice: args.voice,
        toneKeywords: args.toneKeywords,
        targetAudience: args.targetAudience,
        colorPalette: args.colorPalette,
        logoUrl: args.logoUrl,
        websiteUrl: args.websiteUrl,
        autoHashtags: args.autoHashtags,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, id, updated: false };
    }
  },
});
