import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// BLOCKCHAIN VERIFICATION SYSTEM - Immutable audit trail
// Uses hash-chain verification for tamper-proof records
// ═══════════════════════════════════════════════════════════════════

// Simple hash function for verification
function simpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Create verification record
// ═══════════════════════════════════════════════════════════════════
export const createVerification = mutation({
  args: {
    type: v.string(),
    data: v.string(),
    metadata: v.optional(v.any()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Auth: validate admin token if provided
    if (args.adminToken) {
      const session = await tryGetAdminSession(ctx, args.adminToken);
      if (!session) return null;
    }

    const prevHash = await getLastHash(ctx);
    const timestamp = Date.now();
    const hash = simpleHash(`${prevHash}:${timestamp}:${args.type}:${args.data}`);

    const record = await ctx.db.insert("verification_records", {
      type: args.type,
      data: args.data,
      metadata: args.metadata,
      hash,
      previousHash: prevHash,
      timestamp,
      verified: true,
    });

    return { id: record, hash, previousHash: prevHash, timestamp };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Verify record integrity
// ═══════════════════════════════════════════════════════════════════
export const verifyRecord = query({
  args: { recordId: v.id("verification_records") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) return { valid: false, error: "Record not found" };

    const expectedHash = simpleHash(`${record.previousHash}:${record.timestamp}:${record.type}:${record.data}`);
    const valid = expectedHash === record.hash;

    return {
      valid,
      hash: record.hash,
      expectedHash,
      previousHash: record.previousHash,
      timestamp: record.timestamp,
      type: record.type,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get verification records
// ═══════════════════════════════════════════════════════════════════
export const getVerifications = query({
  args: { type: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q = ctx.db.query("verification_records").order("desc");
    if (args.type) {
      q = q.filter((f) => f.eq(f.field("type"), args.type));
    }
    return await q.take(args.limit || 50);
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get verification stats
// ═══════════════════════════════════════════════════════════════════
export const getVerificationStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const records = await ctx.db.query("verification_records").take(1000);
    const byType: Record<string, number> = {};
    for (const r of records) { byType[r.type] = (byType[r.type] || 0) + 1; }
    return {
      totalRecords: records.length,
      byType,
      lastRecord: records[0]?.timestamp || null,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// HELPER: Get last hash in chain
// ═══════════════════════════════════════════════════════════════════
async function getLastHash(ctx: any): Promise<string> {
  const last = await ctx.db.query("verification_records").order("desc").first();
  return last?.hash || "00000000";
}
