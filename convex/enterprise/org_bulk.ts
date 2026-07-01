import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";

export const bulkSuspendOrganizations = mutation({
  args: {
    orgIds: v.array(v.id("enterprise_organizations")), days: v.number(),
    reason: v.string(), adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const results = [];
    for (const orgId of args.orgIds) {
      const org = await ctx.db.get("enterprise_organizations", orgId);
      if (org) {
        await ctx.db.patch(orgId, { status: "suspended" as any, updatedAt: Date.now() });
        results.push({ orgId, success: true });
        await ctx.db.insert("enterprise_audit_logs", {
          eventType: "ORG_BULK_SUSPENDED", actor: identity._id,
          action: "bulk_suspend", target: orgId,
          details: { name: org.name, days: args.days, reason: args.reason }, createdAt: Date.now(),
        });
        await ctx.db.insert("email_notifications", {
          to: org.email, subject: "Organization Suspended - Dutchkem Ventures",
          body: `Your organization "${org.name}" has been suspended for ${args.days} days.\n\nReason: ${args.reason}`,
          type: "org_suspended", status: "sent", createdAt: Date.now(),
        });
      } else {
        results.push({ orgId, success: false, error: "Not found" });
      }
    }
    return { success: true, results };
  },
});

export const bulkUpgradeOrganizations = mutation({
  args: {
    orgIds: v.array(v.id("enterprise_organizations")),
    newPlan: v.union(v.literal("trial"), v.literal("growth"), v.literal("enterprise"), v.literal("scale")),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };
    const results = [];
    for (const orgId of args.orgIds) {
      const org = await ctx.db.get("enterprise_organizations", orgId);
      if (org) {
        await ctx.db.patch(orgId, { plan: args.newPlan, status: "active" as any, updatedAt: Date.now() });
        results.push({ orgId, success: true });
        await ctx.db.insert("enterprise_audit_logs", {
          eventType: "ORG_BULK_UPGRADED", actor: identity._id,
          action: "bulk_upgrade", target: orgId,
          details: { name: org.name, fromPlan: org.plan, toPlan: args.newPlan }, createdAt: Date.now(),
        });
        await ctx.db.insert("email_notifications", {
          to: org.email, subject: "Organization Upgraded - Dutchkem Ventures",
          body: `Your organization "${org.name}" has been upgraded to the ${args.newPlan} plan.`,
          type: "org_upgraded", status: "sent", createdAt: Date.now(),
        });
      } else {
        results.push({ orgId, success: false, error: "Not found" });
      }
    }
    return { success: true, results };
  },
});

export const getAuditLogs = query({
  args: { orgId: v.id("enterprise_organizations"), limit: v.optional(v.number()), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];
    return await ctx.db.query("enterprise_audit_logs")
      .filter((q) => q.eq(q.field("target"), args.orgId))
      .order("desc").take(args.limit || 100);
  },
});

export const getNotifications = query({
  args: { orgId: v.id("enterprise_organizations"), limit: v.optional(v.number()), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return [];
    return await ctx.db.query("email_notifications")
      .withIndex("by_to", (q) => q.eq("to", org.email))
      .order("desc").take(args.limit || 50);
  },
});
