import { defineTable } from "convex/server";
import { v } from "convex/values";

export const walletsTables = {
  client_kyc_submissions: defineTable({
    userId: v.id("users"),
    legalName: v.string(),
    businessName: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    countryOfIncorporation: v.optional(v.string()),
    email: v.string(),
    phoneNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    identityDocId: v.optional(v.id("_storage")),
    proofOfAddressId: v.optional(v.id("_storage")),
    certificateOfIncorporationId: v.optional(v.id("_storage")),
    status: v.union(v.literal("not_submitted"), v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("expired")),
    adminNotes: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    version: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"]),
  client_wallets: defineTable({
    userId: v.id("users"),
    balance: v.number(),
    pendingWithdrawals: v.number(),
    totalEarned: v.number(),
    totalWithdrawn: v.number(),
    lastUpdated: v.number(),
  }).index("by_user", ["userId"]),
  client_wallet_transactions: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("credit"), v.literal("debit"), v.literal("withdrawal"), v.literal("refund")),
    amount: v.number(),
    balanceBefore: v.number(),
    balanceAfter: v.number(),
    description: v.string(),
    reference: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_type", ["type"]),
  client_bank_accounts: defineTable({
    userId: v.id("users"),
    bankCode: v.string(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    isVerified: v.boolean(),
    isDefault: v.boolean(),
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
  client_payout_requests: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    currency: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("processing"), v.literal("completed"), v.literal("failed"), v.literal("rejected")),
    bankCode: v.string(),
    bankName: v.optional(v.string()),
    accountNumber: v.string(),
    accountName: v.string(),
    adminNotes: v.optional(v.string()),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    rejectedBy: v.optional(v.string()),
    rejectedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    koraReference: v.optional(v.string()),
    batchReference: v.optional(v.string()),
    processedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_status_and_created", ["status", "createdAt"]),
  bulk_payout_batches: defineTable({
    batchReference: v.string(),
    totalAmount: v.number(),
    totalPayouts: v.number(),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    koraResponse: v.optional(v.any()),
    initiatedBy: v.string(),
    processedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_reference", ["batchReference"])
    .index("by_status", ["status"]),
  escrow_wallet: defineTable({
    balance: v.number(),
    totalHeld: v.number(),
    totalReleased: v.number(),
    lastUpdated: v.number(),
  }),
  usd_wallets: defineTable({
    userId: v.string(),
    balance: v.number(),
    sweepEnabled: v.boolean(),
    sweepThreshold: v.number(),
    isEncrypted: v.boolean(),
    lastSweepAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_sweep_enabled", ["sweepEnabled"]),

  system_wallet_transactions: defineTable({
    walletType: v.string(),
    type: v.string(),
    amount: v.number(),
    description: v.string(),
    reference: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_wallet", ["walletType"])
    .index("by_type", ["type"])
    .index("by_reference", ["reference"]),

  // ═══════════════════════════════════════════════════════════════════
  // MULTI-AGENT ORCHESTRATOR — Support tables
  // ═══════════════════════════════════════════════════════════════════

  // (support_interactions and support_escalations defined below — line 1785+)

  // ═══════════════════════════════════════════════════════════════════
  // AI SALES AGENT
  // ═══════════════════════════════════════════════════════════════════
  auto_transfer_config: defineTable({
    adminId: v.string(),
    currency: v.string(),
    destinationAccountName: v.string(),
    destinationAccountNumber: v.string(),
    destinationBankCode: v.string(),
    scheduledFrequency: v.string(),
    isActivated: v.boolean(),
    activationCode: v.string(),
    manualPasteRequired: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_admin", ["adminId"]),

  // Admin Workflows
};
