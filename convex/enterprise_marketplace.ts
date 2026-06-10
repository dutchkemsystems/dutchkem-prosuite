import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

/** List all available agents */
export const listAgents = query({
  args: { category: v.optional(v.string()), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const agents = await ctx.db.query("enterprise_agents").collect();
    let filtered = agents;

    if (args.category && args.category !== "all") {
      filtered = agents.filter((a: any) => a.category === args.category);
    }

    return filtered.map((a: any) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      category: a.category,
      price: a.price,
      complexity: a.complexity,
      estimatedTime: a.estimatedTime,
      capabilities: a.capabilities,
    }));
  },
});

/** Get installed agents for an org */
export const getInstalledAgents = query({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_marketplace_installs")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

/** Install an agent/template */
export const installAgent = mutation({
  args: {
    templateId: v.string(),
    templateName: v.string(),
    orgId: v.id("enterprise_organizations"),
    customConfig: v.optional(v.any()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.query("enterprise_marketplace_installs")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("templateId"), args.templateId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "active",
        customConfig: args.customConfig,
        installedAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { success: true, installed: true, existing: true };
    }

    const now = Date.now();
    const installId = await ctx.db.insert("enterprise_marketplace_installs", {
      orgId: args.orgId,
      templateId: args.templateId,
      templateName: args.templateName,
      status: "active",
      customConfig: args.customConfig,
      installedAt: now,
      createdAt: now,
    });

    return { success: true, installId };
  },
});

/** Uninstall an agent */
export const uninstallAgent = mutation({
  args: {
    installId: v.id("enterprise_marketplace_installs"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.delete(args.installId);
    return { success: true };
  },
});