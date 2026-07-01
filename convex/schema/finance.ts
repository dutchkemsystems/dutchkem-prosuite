import { defineTable } from "convex/server";
import { v } from "convex/values";

export const financeTables = {
  tax_wallet: defineTable({
    balance: v.number(),
    total_deducted_lifetime: v.number(),
    total_remitted: v.number(),
    last_deduction_date: v.number(),
    last_interest_date: v.number(),
  }),
  tax_transactions: defineTable({
    type: v.union(v.literal("DAILY_DEDUCTION"), v.literal("WEEKLY_DEDUCTION"), v.literal("MONTHLY_DEDUCTION"), v.literal("YEARLY_FILING")),
    amount: v.number(),
    from_wallet: v.string(),
    to_wallet: v.string(),
    date: v.number(),
    earnings_period_start: v.number(),
    earnings_period_end: v.number(),
    earnings_amount: v.number(),
    tax_rate_applied: v.number(),
    notes: v.optional(v.string()),
    reference: v.string(),
  }).index("by_date", ["date"]),
  interest_earnings: defineTable({
    date: v.number(),
    tax_wallet_balance_before: v.number(),
    interest_rate_daily: v.number(),
    interest_earned: v.number(),
    paid_to_wallet: v.string(),
    status: v.union(v.literal("PAID"), v.literal("PENDING")),
  }).index("by_date", ["date"]),
  annual_tax_filing: defineTable({
    tax_year: v.number(),
    total_earnings: v.number(),
    total_tax_owed: v.number(),
    total_tax_paid_via_deductions: v.number(),
    balance_due: v.number(),
    development_levy: v.number(),
    vat_collected: v.number(),
    filing_date: v.number(),
    payment_date: v.optional(v.number()),
    status: v.union(v.literal("FILED"), v.literal("PAID"), v.literal("PENDING")),
  }).index("by_year", ["tax_year"]),
  charity_wallet: defineTable({
    balance: v.number(),
    totalSetAsideLifetime: v.number(),
    totalTransferred: v.number(),
    lastDeductionDate: v.optional(v.number()),
    lastTransferDate: v.optional(v.number()),
    currentMonth: v.string(),
    monthlyEarningsSoFar: v.number(),
    dailyDeductionAmount: v.number(),
    daysInMonth: v.number(),
    isPaused: v.boolean(),
  }),
  charity_transactions: defineTable({
    type: v.union(v.literal("DAILY_DEDUCTION"), v.literal("MONTHLY_TRANSFER")),
    amount: v.number(),
    balanceBefore: v.number(),
    balanceAfter: v.number(),
    date: v.number(),
    monthlyEarnings: v.number(),
    dailyDeductionAmount: v.optional(v.number()),
    status: v.union(v.literal("completed"), v.literal("failed")),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_date", ["date"]),
  tithe_transactions: defineTable({
    type: v.union(
      v.literal("DAILY_DEDUCTION"),
      v.literal("MONTHLY_TRANSFER"),
      v.literal("MANUAL_TRANSFER"),
      v.literal("AUTO_TRANSFER")
    ),
    amountNgn: v.number(),
    balanceBefore: v.number(),
    balanceAfter: v.number(),
    date: v.number(),
    monthYear: v.string(), // "2026-06" for grouping
    daysInMonth: v.number(),
    currentDay: v.number(),
    monthlyEarnings: v.number(),
    dailyDeductionAmount: v.number(),
    percentage: v.number(), // 10%
    designatedAccount: v.string(), // 8121161202
    koraReference: v.optional(v.string()),
    status: v.union(v.literal("completed"), v.literal("pending"), v.literal("failed")),
    receiptId: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_date", ["date"])
    .index("by_month", ["monthYear"])
    .index("by_type", ["type"])
    .index("by_status", ["status"]),
  cac_tax_transactions: defineTable({
    type: v.union(
      v.literal("MONTHLY_DEDUCTION"),
      v.literal("ANNUAL_FILING"),
      v.literal("ANNUAL_PAYMENT"),
      v.literal("YEAR_END_REMITTANCE")
    ),
    amountNgn: v.number(),
    balanceBefore: v.number(),
    balanceAfter: v.number(),
    date: v.number(),
    monthYear: v.string(), // "2026-06"
    taxYear: v.number(), // 2026
    annualCacFee: v.number(), // 100000
    monthlyFraction: v.number(), // 8333.33
    cumulativePaid: v.number(), // total paid this year
    designatedAccount: v.string(), // 8121161202
    koraReference: v.optional(v.string()),
    status: v.union(v.literal("completed"), v.literal("pending"), v.literal("failed")),
    receiptId: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_date", ["date"])
    .index("by_month", ["monthYear"])
    .index("by_tax_year", ["taxYear"])
    .index("by_type", ["type"]),
  expense_categories: defineTable({
    name: v.string(),
    description: v.string(),
    deductiblePercentage: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_name", ["name"]),
  business_expenses: defineTable({
    category: v.string(),
    description: v.string(),
    amountNgn: v.number(),
    receiptUrl: v.optional(v.string()),
    receiptData: v.optional(v.string()),
    expenseDate: v.number(),
    isDeductible: v.boolean(),
    deductibleAmount: v.number(),
    taxYear: v.number(),
    verifiedBy: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("verified"), v.literal("rejected")),
    createdAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_tax_year", ["taxYear"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
  tax_calculations: defineTable({
    taxYear: v.number(),
    totalIncome: v.number(),
    totalDeductibleExpenses: v.number(),
    taxableIncome: v.number(),
    taxFreeThreshold: v.number(),
    effectiveRate: v.number(),
    taxOwed: v.number(),
    citOwed: v.number(),
    turnover: v.number(),
    isSmallBusiness: v.boolean(),
    breakdown: v.any(),
    calculatedBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_tax_year", ["taxYear"])
    .index("by_created", ["createdAt"]),
  tax_payment_schedule: defineTable({
    taxYear: v.number(),
    quarter: v.string(),
    dueDate: v.string(),
    estimatedAmount: v.number(),
    paidAmount: v.number(),
    status: v.union(v.literal("upcoming"), v.literal("paid"), v.literal("overdue"), v.literal("deferred")),
    paymentRef: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    reminderSent: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_tax_year", ["taxYear"])
    .index("by_status", ["status"])
    .index("by_due_date", ["dueDate"]),
};
