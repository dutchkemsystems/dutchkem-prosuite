import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// TRANSFER PASSKEY MANAGEMENT
// 6-digit passkey with 10-minute expiry
// ═══════════════════════════════════════════════════════════════════

const PASSKEY_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes as per spec

/**
 * Generate a 6-digit passkey for a specific transfer purpose
 */
export const generateTransferPasskey = mutation({
  args: {
    purpose: v.string(),
    amountNgn: v.optional(v.number()),
    relatedEntityId: v.optional(v.string()),
    designatedAccount: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const passkey = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();

    const id = await ctx.db.insert("transfer_passkeys", {
      passkey,
      purpose: args.purpose,
      relatedEntityId: args.relatedEntityId,
      amountNgn: args.amountNgn,
      designatedAccount: args.designatedAccount,
      createdAt: now,
      expiresAt: now + PASSKEY_EXPIRY_MS,
      isUsed: false,
      isExpired: false,
    });

    return {
      passkeyId: id,
      passkey,
      expiresAt: now + PASSKEY_EXPIRY_MS,
      expiresInMinutes: 10,
      purpose: args.purpose,
    };
  },
});

/**
 * Verify a passkey (and mark as used if valid)
 */
export const verifyTransferPasskey = mutation({
  args: {
    passkeyId: v.string(),
    passkey: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const record: any = await ctx.db
      .query("transfer_passkeys")
      .filter((q) => q.eq(q.field("_id"), args.passkeyId as any))
      .first();

    if (!record) return { success: false, error: "Passkey not found" };
    if (record.isUsed) return { success: false, error: "Passkey already used" };
    if (record.isExpired || Date.now() > record.expiresAt) {
      await ctx.db.patch(record._id, { isExpired: true });
      return { success: false, error: "Passkey expired" };
    }
    if (record.passkey !== args.passkey) {
      return { success: false, error: "Invalid passkey" };
    }

    await ctx.db.patch(record._id, { isUsed: true, usedAt: Date.now() });
    return { success: true, purpose: record.purpose, amountNgn: record.amountNgn };
  },
});

/**
 * Get all active passkeys
 */
export const getActivePasskeys = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const all = await ctx.db.query("transfer_passkeys").collect();
    const now = Date.now();
    return all
      .filter((p) => !p.isUsed && !p.isExpired && p.expiresAt > now)
      .map((p) => ({
        id: p._id,
        purpose: p.purpose,
        amountNgn: p.amountNgn,
        designatedAccount: p.designatedAccount,
        createdAt: p.createdAt,
        expiresAt: p.expiresAt,
        expiresInSeconds: Math.floor((p.expiresAt - now) / 1000),
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get passkey history
 */
export const getPasskeyHistory = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const all = await ctx.db.query("transfer_passkeys").collect();
    return all
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map((p) => ({
        id: p._id,
        purpose: p.purpose,
        amountNgn: p.amountNgn,
        designatedAccount: p.designatedAccount,
        createdAt: p.createdAt,
        expiresAt: p.expiresAt,
        usedAt: p.usedAt,
        isUsed: p.isUsed,
        isExpired: p.isExpired || Date.now() > p.expiresAt,
      }));
  },
});

/**
 * Cleanup expired passkeys
 */
export const cleanupExpiredPasskeys = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const all = await ctx.db.query("transfer_passkeys").collect();
    const now = Date.now();
    let cleaned = 0;

    for (const p of all) {
      if (!p.isExpired && now > p.expiresAt) {
        await ctx.db.patch("transfer_passkeys", p._id, { isExpired: true });
        cleaned++;
      }
    }
    console.log(`[PASSKEY] Marked ${cleaned} expired passkeys`);
    return null;
  },
});
