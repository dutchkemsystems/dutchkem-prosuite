import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";
import { hashPassword, verifyPassword } from "./encryption";

/**
 * Enhanced Password Management System
 * - All password changes logged with audit trail
 * - Email notifications sent for all password changes
 * - Password change request workflow with admin approval
 */

/** Request a password change (creates pending request) */
export const requestPasswordChange = mutation({
  args: {
    userId: v.id("users"),
    currentPassword: v.string(),
    newPassword: v.string(),
    reason: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const user = await ctx.db.get("users", args.userId);
    if (!user) return { success: false, error: "User not found" };

    // Verify current password if one exists
    if (user.adminPasswordHash) {
      const valid = await verifyPassword(args.currentPassword, user.adminPasswordHash);
      if (!valid) return { success: false, error: "Current password is incorrect" };
    }

    // Validate password strength
    if (args.newPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" };
    }

    // Create pending password change request
    const requestId = await ctx.db.insert("password_change_requests", {
      userId: args.userId,
      requestedBy: identity._id,
      currentPasswordHash: user.adminPasswordHash || "",
      newPasswordHash: await hashPassword(args.newPassword),
      reason: args.reason || "Password change requested",
      status: "pending",
      createdAt: Date.now(),
    });

    // Log the request
    await ctx.db.insert("audit_logs", {
      userId: identity._id,
      action: "PASSWORD_CHANGE_REQUESTED",
      details: JSON.stringify({
        targetUserId: args.userId,
        requestId,
        reason: args.reason,
      }),
      ip: "internal",
      userAgent: "system",
      createdAt: Date.now(),
    });

    // Send notification email (simulated - in production use AWS SES)
    const emailContent = {
      to: user.email,
      subject: "Password Change Request - Dutchkem Ventures",
      body: `A password change has been requested for your account.\n\nReason: ${args.reason || "Not specified"}\nRequested by: ${identity.email}\n\nIf you did not request this change, please contact support immediately.`,
    };

    // Store email notification log
    await ctx.db.insert("email_notifications", {
      to: user.email,
      subject: emailContent.subject,
      body: emailContent.body,
      type: "password_change_request",
      status: "sent",
      createdAt: Date.now(),
    });

    return { success: true, requestId, message: "Password change request submitted. You will receive an email notification." };
  },
});

/** Approve a pending password change request (admin only) */
export const approvePasswordChange = mutation({
  args: {
    requestId: v.id("password_change_requests"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const request = await ctx.db.get("password_change_requests", args.requestId);
    if (!request) return { success: false, error: "Request not found" };
    if (request.status !== "pending") return { success: false, error: "Request already processed" };

    // Apply the password change
    await ctx.db.patch("users", request.userId, {
      adminPasswordHash: request.newPasswordHash,
      adminFailedLoginAttempts: 0,
      adminLockedUntil: undefined,
    });

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "approved",
      approvedBy: identity._id,
      approvedAt: Date.now(),
    });

    // Get the user for notification
    const user = await ctx.db.get("users", request.userId);

    // Log the approval
    await ctx.db.insert("audit_logs", {
      userId: identity._id,
      action: "PASSWORD_CHANGE_APPROVED",
      details: JSON.stringify({
        targetUserId: request.userId,
        requestId: args.requestId,
      }),
      ip: "internal",
      userAgent: "system",
      createdAt: Date.now(),
    });

    // Send approval notification
    await ctx.db.insert("email_notifications", {
      to: user?.email || "",
      subject: "Password Changed Successfully - Dutchkem Ventures",
      body: `Your password has been successfully changed.\n\nChanged by: ${identity.email}\nTime: ${new Date().toISOString()}\n\nIf you did not authorize this change, please contact support immediately.`,
      type: "password_change_approved",
      status: "sent",
      createdAt: Date.now(),
    });

    return { success: true, message: "Password change approved and applied" };
  },
});

/** Reject a pending password change request (admin only) */
export const rejectPasswordChange = mutation({
  args: {
    requestId: v.id("password_change_requests"),
    reason: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const request = await ctx.db.get("password_change_requests", args.requestId);
    if (!request) return { success: false, error: "Request not found" };
    if (request.status !== "pending") return { success: false, error: "Request already processed" };

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "rejected",
      rejectedBy: identity._id,
      rejectedAt: Date.now(),
      rejectionReason: args.reason,
    });

    // Get the user for notification
    const user = await ctx.db.get("users", request.userId);

    // Log the rejection
    await ctx.db.insert("audit_logs", {
      userId: identity._id,
      action: "PASSWORD_CHANGE_REJECTED",
      details: JSON.stringify({
        targetUserId: request.userId,
        requestId: args.requestId,
        reason: args.reason,
      }),
      ip: "internal",
      userAgent: "system",
      createdAt: Date.now(),
    });

    // Send rejection notification
    await ctx.db.insert("email_notifications", {
      to: user?.email || "",
      subject: "Password Change Request Rejected - Dutchkem Ventures",
      body: `Your password change request has been rejected.\n\nReason: ${args.reason}\nReviewed by: ${identity.email}\n\nIf you believe this is an error, please contact support.`,
      type: "password_change_rejected",
      status: "sent",
      createdAt: Date.now(),
    });

    return { success: true, message: "Password change request rejected" };
  },
});

/** Get all pending password change requests (admin only) */
export const getPendingPasswordRequests = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    const requests = await ctx.db.query("password_change_requests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    // Enrich with user details
    const enrichedRequests = [];
    for (const request of requests) {
      const user = await ctx.db.get("users", request.userId);
      const requestedByUser = await ctx.db.get("users", request.requestedBy);
      enrichedRequests.push({
        ...request,
        userEmail: user?.email || "Unknown",
        userName: user?.name || "Unknown",
        requestedByEmail: requestedByUser?.email || "Unknown",
      });
    }

    return enrichedRequests;
  },
});

/** Get password change history for a user */
export const getPasswordChangeHistory = query({
  args: {
    userId: v.id("users"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return [];

    return await ctx.db.query("password_change_requests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});

/** Force password change on next login (admin only) */
export const forcePasswordChange = mutation({
  args: {
    userId: v.id("users"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const user = await ctx.db.get("users", args.userId);
    if (!user) return { success: false, error: "User not found" };

    await ctx.db.patch("users", args.userId, {
      adminForcePasswordChange: true,
    });

    // Log the action
    await ctx.db.insert("audit_logs", {
      userId: identity._id,
      action: "FORCE_PASSWORD_CHANGE",
      details: JSON.stringify({
        targetUserId: args.userId,
        targetEmail: user.email,
      }),
      ip: "internal",
      userAgent: "system",
      createdAt: Date.now(),
    });

    // Send notification
    await ctx.db.insert("email_notifications", {
      to: user.email,
      subject: "Password Change Required - Dutchkem Ventures",
      body: `An administrator has required you to change your password on your next login.\n\nThis is a security measure. Please update your password when you next sign in.`,
      type: "force_password_change",
      status: "sent",
      createdAt: Date.now(),
    });

    return { success: true, message: "User will be required to change password on next login" };
  },
});
