import { mutation, query, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Feature 10: CRM Hygiene & Data Quality Reports

export const runHygieneScan = internalAction({
  args: {},
  returns: v.array(v.object({
    type: v.string(),
    severity: v.string(),
    affectedCount: v.number(),
    details: v.any(),
  })),
  handler: async (ctx, args) => {
    const results = [];

    // 1. Check for duplicate emails
    const duplicateEmails = await ctx.runQuery(internal.crm_hygiene.findDuplicateEmails);
    if (duplicateEmails.length > 0) {
      results.push({
        type: "duplicate_email",
        severity: "high",
        affectedCount: duplicateEmails.length,
        details: duplicateEmails,
      });
    }

    // 2. Check for duplicate phones
    const duplicatePhones = await ctx.runQuery(internal.crm_hygiene.findDuplicatePhones);
    if (duplicatePhones.length > 0) {
      results.push({
        type: "duplicate_phone",
        severity: "high",
        affectedCount: duplicatePhones.length,
        details: duplicatePhones,
      });
    }

    // 3. Check for incomplete profiles
    const incompleteProfiles = await ctx.runQuery(internal.crm_hygiene.findIncompleteProfiles);
    if (incompleteProfiles.length > 0) {
      results.push({
        type: "incomplete_profile",
        severity: "medium",
        affectedCount: incompleteProfiles.length,
        details: incompleteProfiles,
      });
    }

    // Log results
    for (const result of results) {
      await ctx.runMutation(internal.crm_hygiene.logHygieneReport, {
        type: result.type as any,
        severity: result.severity as any,
        affectedUsers: result.details.flatMap((d: any) => d.userIds),
        details: result.details,
      });
    }

    return results;
  },
});

export const findDuplicateEmails = query({
  args: {},
  returns: v.array(v.object({
    email: v.string(),
    userIds: v.array(v.id("users")),
    count: v.number(),
  })),
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const emailGroups: Record<string, Id<"users">[]> = {};

    for (const user of users) {
      if (user.email) {
        if (!emailGroups[user.email]) {
          emailGroups[user.email] = [];
        }
        emailGroups[user.email].push(user._id);
      }
    }

    return Object.entries(emailGroups)
      .filter(([_, userIds]) => userIds.length > 1)
      .map(([email, userIds]) => ({
        email,
        userIds,
        count: userIds.length,
      }));
  },
});

export const findDuplicatePhones = query({
  args: {},
  returns: v.array(v.object({
    phone: v.string(),
    userIds: v.array(v.id("users")),
    count: v.number(),
  })),
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const phoneGroups: Record<string, Id<"users">[]> = {};

    for (const user of users) {
      if (user.phone) {
        if (!phoneGroups[user.phone]) {
          phoneGroups[user.phone] = [];
        }
        phoneGroups[user.phone].push(user._id);
      }
    }

    return Object.entries(phoneGroups)
      .filter(([_, userIds]) => userIds.length > 1)
      .map(([phone, userIds]) => ({
        phone,
        userIds,
        count: userIds.length,
      }));
  },
});

export const findIncompleteProfiles = query({
  args: {},
  returns: v.array(v.object({
    userId: v.id("users"),
    missingFields: v.array(v.string()),
    completionPercentage: v.number(),
  })),
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const incomplete: Array<{userId: Id<"users">; missingFields: string[]; completionPercentage: number}> = [];

    for (const user of users) {
      const missingFields: string[] = [];
      let filledFields = 0;
      const totalFields = 6; // name, email, phone, image, bankAccount, referralCode

      if (!user.name) missingFields.push("name");
      else filledFields++;

      if (!user.email) missingFields.push("email");
      else filledFields++;

      if (!user.phone) missingFields.push("phone");
      else filledFields++;

      if (!user.image) missingFields.push("image");
      else filledFields++;

      if (!user.bankAccount) missingFields.push("bankAccount");
      else filledFields++;

      if (!user.referralCode) missingFields.push("referralCode");
      else filledFields++;

      // Only include if less than 50% complete
      const completionPercentage = (filledFields / totalFields) * 100;
      if (completionPercentage < 50) {
        incomplete.push({ userId: user._id, missingFields, completionPercentage });
      }
    }

    return incomplete;
  },
});

export const logHygieneReport = mutation({
  args: {
    type: v.union(v.literal("duplicate_email"), v.literal("duplicate_phone"), v.literal("incomplete_profile")),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    affectedUsers: v.array(v.id("users")),
    details: v.any(),
  },
  returns: v.id("hygiene_reports"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("hygiene_reports", {
      type: args.type,
      severity: args.severity,
      affectedUsers: args.affectedUsers,
      details: args.details,
      reportDate: Date.now(),
    });
  },
});

export const getHygieneReports = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    _id: v.id("hygiene_reports"),
    type: v.string(),
    severity: v.string(),
    affectedUsers: v.array(v.id("users")),
    details: v.any(),
    actionTaken: v.optional(v.string()),
    reportDate: v.number(),
    resolvedAt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    return await ctx.db
      .query("hygiene_reports")
      .withIndex("by_date")
      .order("desc")
      .take(limit);
  },
});

export const resolveHygieneIssue = mutation({
  args: {
    reportId: v.id("hygiene_reports"),
    actionTaken: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reportId, {
      actionTaken: args.actionTaken,
      resolvedAt: Date.now(),
    });
    return null;
  },
});

export const mergeUsers = mutation({
  args: {
    primaryUserId: v.id("users"),
    secondaryUserId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get secondary user data
    const secondaryUser = await ctx.db.get(args.secondaryUserId);
    if (!secondaryUser) throw new Error("Secondary user not found");

    // Merge subscriptions
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.secondaryUserId))
      .collect();
    for (const sub of subscriptions) {
      await ctx.db.patch(sub._id, { userId: args.primaryUserId });
    }

    // Merge projects
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.secondaryUserId))
      .collect();
    for (const proj of projects) {
      await ctx.db.patch(proj._id, { userId: args.primaryUserId });
    }

    // Merge payouts
    const payouts = await ctx.db
      .query("payouts")
      .withIndex("by_user", (q) => q.eq("userId", args.secondaryUserId))
      .collect();
    for (const payout of payouts) {
      await ctx.db.patch(payout._id, { userId: args.primaryUserId });
    }

    // Merge notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.secondaryUserId))
      .collect();
    for (const notif of notifications) {
      await ctx.db.patch(notif._id, { userId: args.primaryUserId });
    }

    // Log the merge
    await ctx.db.insert("admin_audit_log", {
      adminId: args.primaryUserId,
      action: "USER_MERGE",
      targetType: "users",
      targetId: args.secondaryUserId,
      changes: {
        mergedInto: args.primaryUserId,
        mergedAt: Date.now(),
      },
      ipAddress: "system",
      userAgent: "crm_hygiene_system",
      timestamp: Date.now(),
    });

    // Delete secondary user
    await ctx.db.delete(args.secondaryUserId);

    return null;
  },
});

export const getHygieneSummary = query({
  args: {},
  returns: v.object({
    totalIssues: v.number(),
    highSeverity: v.number(),
    mediumSeverity: v.number(),
    lowSeverity: v.number(),
    resolved: v.number(),
    latestScanDate: v.optional(v.number()),
    score: v.number(), // 0-100 CRM health score
  }),
  handler: async (ctx, args) => {
    const reports = await ctx.db.query("hygiene_reports").collect();
    const users = await ctx.db.query("users").collect();

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const recentReports = reports.filter(r => r.reportDate > weekAgo);
    const highSeverity = recentReports.filter(r => r.severity === "high").length;
    const mediumSeverity = recentReports.filter(r => r.severity === "medium").length;
    const lowSeverity = recentReports.filter(r => r.severity === "low").length;
    const resolved = recentReports.filter(r => r.resolvedAt).length;

    // Calculate health score (100 - weighted penalty)
    const totalUsers = users.length;
    const totalIssues = highSeverity * 10 + mediumSeverity * 5 + lowSeverity * 1;
    const score = Math.max(0, 100 - (totalIssues / Math.max(totalUsers, 1)) * 10);

    return {
      totalIssues: recentReports.length,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      resolved,
      latestScanDate: reports.length > 0 ? reports[0].reportDate : undefined,
      score: Math.round(score),
    };
  },
});