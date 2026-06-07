import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

export const createVersion = mutation({
  args: { adminToken: v.string(), agentId: v.string(), config: v.any(), changelog: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const versions = await ctx.db.query("agent_version_control").withIndex("by_agent", (q) => q.eq("agentId", args.agentId)).take(100);
    const majorVersions = versions.filter((v) => v.version.startsWith("v")).length;
    const version = `v${majorVersions + 1}.0.0`;
    await ctx.db.insert("agent_version_control", {
      agentId: args.agentId, version, config: args.config, changelog: args.changelog,
      createdBy: "admin", isRollback: false, createdAt: Date.now(),
    });
    return { success: true, version };
  },
});

export const rollbackVersion = mutation({
  args: { adminToken: v.string(), agentId: v.string(), targetVersion: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };
    const target = await ctx.db.query("agent_version_control")
      .withIndex("by_version", (q) => q.eq("version", args.targetVersion))
      .filter((q) => q.eq(q.field("agentId"), args.agentId)).first();
    if (!target) return { error: "Version not found" };
    await ctx.db.insert("agent_version_control", {
      agentId: args.agentId, version: `v${Date.now()}`, config: target.config,
      changelog: `Rollback to ${args.targetVersion}`, createdBy: "admin", isRollback: true, createdAt: Date.now(),
    });
    return { success: true, restoredConfig: target.config };
  },
});

export const getVersionHistory = query({
  args: { agentId: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => await ctx.db.query("agent_version_control").withIndex("by_agent", (q) => q.eq("agentId", args.agentId)).order("desc").take(args.limit ?? 20),
});

export const getAllVersions = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => await ctx.db.query("agent_version_control").order("desc").take(100),
});
