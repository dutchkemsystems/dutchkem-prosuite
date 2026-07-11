import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

export const getMyKycStatus = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const submission = await ctx.db.query("client_kyc_submissions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();
    if (!submission) return { status: "not_submitted" as const, submission: null };
    return { status: submission.status, submission };
  },
});

export const getKycSubmission = query({
  args: { submissionId: v.id("client_kyc_submissions") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.submissionId);
  },
});

export const submitKyc = mutation({
  args: {
    userId: v.id("users"),
    legalName: v.string(),
    businessName: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    identityDocId: v.optional(v.id("_storage")),
    proofOfAddressId: v.optional(v.id("_storage")),
    certificateOfIncorporationId: v.optional(v.id("_storage")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("client_kyc_submissions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.or(q.eq(q.field("status"), "pending"), q.eq(q.field("status"), "approved")))
      .first();
    if (existing) return { error: "KYC already pending or approved" };

    const user = await ctx.db.get(args.userId);
    if (!user) return { error: "User not found" };

    const now = Date.now();
    const submissionId = await ctx.db.insert("client_kyc_submissions", {
      userId: args.userId,
      legalName: args.legalName,
      businessName: args.businessName,
      registrationNumber: args.registrationNumber,
      countryOfIncorporation: "Nigeria",
      email: user.email || "",
      phoneNumber: args.phoneNumber,
      address: args.address,
      city: args.city,
      state: args.state,
      country: args.country || "Nigeria",
      identityDocId: args.identityDocId,
      proofOfAddressId: args.proofOfAddressId,
      certificateOfIncorporationId: args.certificateOfIncorporationId,
      status: "pending",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, submissionId };
  },
});

export const adminApproveKyc = mutation({
  args: {
    adminToken: v.string(),
    submissionId: v.id("client_kyc_submissions"),
    notes: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) return { error: "Submission not found" };

    const now = Date.now();
    await ctx.db.patch(args.submissionId, {
      status: "approved",
      adminNotes: args.notes,
      reviewedBy: identity.name || "admin",
      reviewedAt: now,
      updatedAt: now,
    });

    const existingWallet = await ctx.db.query("client_wallets")
      .withIndex("by_user", (q) => q.eq("userId", submission.userId))
      .first();
    if (!existingWallet) {
      await ctx.db.insert("client_wallets", {
        userId: submission.userId,
        balance: 0,
        pendingWithdrawals: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        lastUpdated: now,
      });
    }

    return { success: true };
  },
});

export const adminRejectKyc = mutation({
  args: {
    adminToken: v.string(),
    submissionId: v.id("client_kyc_submissions"),
    reason: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true };

    const now = Date.now();
    await ctx.db.patch(args.submissionId, {
      status: "rejected",
      rejectionReason: args.reason,
      reviewedBy: identity.name || "admin",
      reviewedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const adminListKycSubmissions = query({
  args: { adminToken: v.string(), status: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      const identity = await tryGetAdminSession(ctx, args.adminToken);
      if (!identity) return [];

      let q = ctx.db.query("client_kyc_submissions").order("desc");
      if (args.status) q = q.withIndex("by_status", (iq) => iq.eq("status", args.status as any));
      return await q.take(100);
    } catch (e) {
      console.error("[client_kyc] adminListKycSubmissions error:", e);
      return [];
    }
  },
});

export const getDocumentUrl = query({
  args: { storageId: v.id("_storage") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
