import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

export const listTemplates = query({
  args: { category: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q: any = ctx.db.query("agent_marketplace_templates").filter((q: any) => q.eq(q.field("isPublished"), true));
    if (args.category) q = q.filter((q: any) => q.eq(q.field("category"), args.category));
    return await q.order("desc").take(args.limit ?? 50);
  },
});

export const getTemplate = query({
  args: { templateId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => await ctx.db.query("agent_marketplace_templates").withIndex("by_template_id", (q) => q.eq("templateId", args.templateId)).first(),
});

export const createTemplate = mutation({
  args: { adminToken: v.string(), name: v.string(), description: v.string(), category: v.string(), priceNgn: v.number(), isFree: v.boolean(), config: v.any(), tags: v.array(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const templateId = `tpl-${Date.now()}`;
    const id = await ctx.db.insert("agent_marketplace_templates", {
      templateId, name: args.name, description: args.description, category: args.category,
      author: "Dutchkem", version: "1.0.0", priceNgn: args.priceNgn, isFree: args.isFree,
      config: args.config, tags: args.tags, installCount: 0, rating: 0, reviewCount: 0,
      isPublished: true, createdAt: Date.now(), updatedAt: Date.now(),
    });
    return { success: true, templateId, id };
  },
});

export const updateTemplate = mutation({
  args: { adminToken: v.string(), templateId: v.string(), name: v.optional(v.string()), description: v.optional(v.string()), priceNgn: v.optional(v.number()), config: v.optional(v.any()), tags: v.optional(v.array(v.string())) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const tpl = await ctx.db.query("agent_marketplace_templates").withIndex("by_template_id", (q) => q.eq("templateId", args.templateId)).first();
    if (!tpl) return { error: "Not found" };
    const patch: any = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.description !== undefined) patch.description = args.description;
    if (args.priceNgn !== undefined) patch.priceNgn = args.priceNgn;
    if (args.config !== undefined) patch.config = args.config;
    if (args.tags !== undefined) patch.tags = args.tags;
    await ctx.db.patch(tpl._id, patch);
    return { success: true };
  },
});

export const deleteTemplate = mutation({
  args: { adminToken: v.string(), templateId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const tpl = await ctx.db.query("agent_marketplace_templates").withIndex("by_template_id", (q) => q.eq("templateId", args.templateId)).first();
    if (!tpl) return { error: "Not found" };
    await ctx.db.delete(tpl._id);
    return { success: true };
  },
});

export const installTemplate = mutation({
  args: { adminToken: v.string(), templateId: v.string(), agentId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const tpl = await ctx.db.query("agent_marketplace_templates").withIndex("by_template_id", (q) => q.eq("templateId", args.templateId)).first();
    if (!tpl) return { error: "Template not found" };
    await ctx.db.insert("agent_marketplace_installations", {
      templateId: args.templateId, installedBy: "admin", agentId: args.agentId,
      status: "active", installedAt: Date.now(),
    });
    await ctx.db.patch(tpl._id, { installCount: tpl.installCount + 1, updatedAt: Date.now() });
    return { success: true };
  },
});

export const uninstallTemplate = mutation({
  args: { adminToken: v.string(), templateId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const inst = await ctx.db.query("agent_marketplace_installations").withIndex("by_template", (q) => q.eq("templateId", args.templateId)).first();
    if (!inst) return { error: "Not found" };
    await ctx.db.patch(inst._id, { status: "uninstalled", uninstalledAt: Date.now() });
    return { success: true };
  },
});

export const addReview = mutation({
  args: { templateId: v.string(), reviewerId: v.string(), reviewerName: v.string(), rating: v.number(), title: v.string(), comment: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("agent_marketplace_reviews", {
      ...args, helpful: 0, createdAt: Date.now(),
    });
    const tpl = await ctx.db.query("agent_marketplace_templates").withIndex("by_template_id", (q) => q.eq("templateId", args.templateId)).first();
    if (tpl) {
      const reviews = await ctx.db.query("agent_marketplace_reviews").withIndex("by_template", (q) => q.eq("templateId", args.templateId)).take(100);
      const avgRating = reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length;
      await ctx.db.patch(tpl._id, { rating: Math.round(avgRating * 10) / 10, reviewCount: reviews.length });
    }
    return { success: true, id };
  },
});

export const getReviews = query({
  args: { templateId: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => await ctx.db.query("agent_marketplace_reviews").withIndex("by_template", (q) => q.eq("templateId", args.templateId)).order("desc").take(args.limit ?? 20),
});

export const getMarketplaceStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const templates = await ctx.db.query("agent_marketplace_templates").take(200);
    const installations = await ctx.db.query("agent_marketplace_installations").take(200);
    return {
      totalTemplates: templates.length, publishedTemplates: templates.filter((t) => t.isPublished).length,
      totalInstalls: installations.length, activeInstalls: installations.filter((i) => i.status === "active").length,
      categories: [...new Set(templates.map((t) => t.category))],
    };
  },
});

export const bulkInstall = mutation({
  args: { adminToken: v.string(), templateIds: v.array(v.string()), agentPrefix: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    let installed = 0;
    for (let i = 0; i < args.templateIds.length; i++) {
      const tpl = await ctx.db.query("agent_marketplace_templates").withIndex("by_template_id", (q) => q.eq("templateId", args.templateIds[i])).first();
      if (tpl) {
        await ctx.db.insert("agent_marketplace_installations", {
          templateId: args.templateIds[i], installedBy: "admin",
          agentId: `${args.agentPrefix}-${i + 1}`, status: "active", installedAt: Date.now(),
        });
        await ctx.db.patch(tpl._id, { installCount: tpl.installCount + 1, updatedAt: Date.now() });
        installed++;
      }
    }
    return { success: true, installed };
  },
});
