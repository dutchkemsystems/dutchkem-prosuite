import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";

export const createTemplate = mutation({
  args: {
    adminToken: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    content: v.string(),
    hashtags: v.optional(v.array(v.string())),
    platforms: v.optional(v.array(v.string())),
    variables: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true, templateId: null };

    const variables: string[] = args.variables ?? [];
    if (variables.length === 0) {
      const matches = args.content.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) ?? [];
      variables.push(...Array.from(new Set(matches.map((m) => m.slice(2, -2)))));
    }

    const id = await ctx.db.insert("trypost_templates", {
      name: args.name,
      description: args.description,
      category: args.category,
      content: args.content,
      hashtags: args.hashtags,
      platforms: args.platforms,
      variables,
      useCount: 0,
      createdBy: identity._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { authError: false, templateId: id };
  },
});

export const listTemplates = query({
  args: { adminToken: v.optional(v.string()), category: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken, category }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, templates: [] };
    const templates = await ctx.db.query("trypost_templates").order("desc").take(200);
    const filtered = category ? templates.filter((t) => t.category === category) : templates;
    return { authError: false, templates: filtered };
  },
});

export const deleteTemplate = mutation({
  args: { adminToken: v.string(), templateId: v.id("trypost_templates") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true, success: false };
    await ctx.db.delete(args.templateId);
    return { authError: false, success: true };
  },
});

export const useTemplate = mutation({
  args: { adminToken: v.string(), templateId: v.id("trypost_templates") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true, template: null };
    const tpl = await ctx.db.get(args.templateId);
    if (!tpl) return { authError: false, template: null };
    await ctx.db.patch(args.templateId, { useCount: tpl.useCount + 1, updatedAt: Date.now() });
    return { authError: false, template: tpl };
  },
});
