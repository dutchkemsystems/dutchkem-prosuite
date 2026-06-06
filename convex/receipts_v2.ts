import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// RECEIPT GENERATION SERVICE
// Generates downloadable JPG and PDF receipts for all transactions
// ═══════════════════════════════════════════════════════════════════

const COMPANY = {
  name: "Dutchkem Ventures Prosuite NG+",
  address: "26, Opeki Road, Ipaja, Ayobo, Lagos State, Nigeria",
  tel: "(+234)-911-339-3525",
  email: "contact@dutchkem.com",
  rc: "9489855",
  tin: "2512403526652",
  supportEmail: "support@dutchkem.com",
  slogan: "Stop Struggling. Start Winning.",
};

/**
 * Generate a unique receipt number
 */
function generateReceiptNumber(): string {
  return `DKV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * Format currency in Naira
 */
function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format date
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Create a receipt for any transaction type
 */
export const createReceipt = mutation({
  args: {
    transactionType: v.string(),
    transactionId: v.optional(v.string()),
    amountNgn: v.number(),
    fromAccount: v.string(),
    toAccount: v.string(),
    toBank: v.string(),
    toName: v.string(),
    koraReference: v.optional(v.string()),
    status: v.optional(v.union(v.literal("completed"), v.literal("pending"), v.literal("failed"))),
    metadata: v.optional(v.any()),
    createdBy: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const receiptNumber = generateReceiptNumber();
    const now = Date.now();

    const receiptData = {
      company: COMPANY,
      receiptNumber,
      transactionType: args.transactionType,
      transactionId: args.transactionId,
      amount: args.amountNgn,
      amountFormatted: formatNaira(args.amountNgn),
      fromAccount: args.fromAccount,
      toAccount: args.toAccount,
      toBank: args.toBank,
      toName: args.toName,
      koraReference: args.koraReference,
      status: args.status || "completed",
      date: now,
      dateFormatted: formatDate(now),
      metadata: args.metadata,
      footer: COMPANY.slogan,
    };

    const id = await ctx.db.insert("generated_receipts", {
      receiptNumber,
      transactionType: args.transactionType,
      transactionId: args.transactionId,
      amountNgn: args.amountNgn,
      fromAccount: args.fromAccount,
      toAccount: args.toAccount,
      toBank: args.toBank,
      toName: args.toName,
      koraReference: args.koraReference,
      date: now,
      status: args.status || "completed",
      receiptData,
      downloads: 0,
      createdBy: args.createdBy,
      createdAt: now,
    });

    return { receiptId: id, receiptNumber, receiptData };
  },
});

/**
 * Get receipt by number
 */
export const getReceiptByNumber = query({
  args: { receiptNumber: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("generated_receipts")
      .withIndex("by_receipt_number", (q) => q.eq("receiptNumber", args.receiptNumber))
      .first();
  },
});

/**
 * Get receipts by transaction
 */
export const getReceiptsByTransaction = query({
  args: { transactionType: v.string(), transactionId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("generated_receipts")
      .withIndex("by_transaction", (q) =>
        q.eq("transactionType", args.transactionType).eq("transactionId", args.transactionId)
      )
      .collect();
  },
});

/**
 * Get all receipts (admin)
 */
export const getAllReceipts = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("generated_receipts")
      .withIndex("by_date")
      .order("desc")
      .take(limit);
  },
});

/**
 * Generate JPG data URL for a receipt (client-side rendering)
 */
export const generateJpgDataUrl = query({
  args: { receiptNumber: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const receipt = await ctx.db
      .query("generated_receipts")
      .withIndex("by_receipt_number", (q) => q.eq("receiptNumber", args.receiptNumber))
      .first();

    if (!receipt) return null;

    const data = receipt.receiptData;

    // Build an HTML representation that the client can convert to JPG via canvas
    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Arial', sans-serif; padding: 40px; background: #fff; color: #1a1a1a; }
  .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #1a1a1a; padding: 30px; }
  .header { text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 20px; }
  .logo { font-size: 32px; font-weight: 900; color: #f97316; margin: 0; }
  .subtitle { font-size: 12px; color: #666; margin: 5px 0; }
  .rc-info { font-size: 11px; color: #888; margin-top: 10px; }
  .receipt-number { background: #f97316; color: white; padding: 8px 16px; display: inline-block; font-weight: bold; margin: 15px 0; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ddd; }
  .row-label { font-weight: bold; color: #555; }
  .row-value { color: #1a1a1a; }
  .amount { font-size: 28px; font-weight: 900; color: #f97316; text-align: center; margin: 20px 0; }
  .status { text-align: center; padding: 10px; font-weight: bold; color: #16a34a; background: #dcfce7; margin: 15px 0; }
  .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #f97316; font-style: italic; color: #f97316; }
</style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1 class="logo">${COMPANY.name}</h1>
      <p class="subtitle">${COMPANY.address}</p>
      <p class="subtitle">Tel: ${COMPANY.tel} | Email: ${COMPANY.email}</p>
      <p class="rc-info">RC: ${COMPANY.rc} | TIN: ${COMPANY.tin}</p>
      <div class="receipt-number">${data.receiptNumber}</div>
    </div>

    <div class="row">
      <span class="row-label">Date:</span>
      <span class="row-value">${data.dateFormatted}</span>
    </div>
    <div class="row">
      <span class="row-label">Transaction Type:</span>
      <span class="row-value">${data.transactionType.toUpperCase()}</span>
    </div>
    <div class="row">
      <span class="row-label">From:</span>
      <span class="row-value">${data.fromAccount}</span>
    </div>
    <div class="row">
      <span class="row-label">To:</span>
      <span class="row-value">${data.toName} (${data.toBank})</span>
    </div>
    <div class="row">
      <span class="row-label">Account Number:</span>
      <span class="row-value">${data.toAccount}</span>
    </div>
    ${data.koraReference ? `<div class="row">
      <span class="row-label">Kora Reference:</span>
      <span class="row-value">${data.koraReference}</span>
    </div>` : ''}

    <div class="amount">${data.amountFormatted}</div>
    <div class="status">✓ ${data.status.toUpperCase()}</div>

    <div class="footer">
      <p>"${COMPANY.slogan}"</p>
      <p style="font-size: 10px; color: #888;">For support: ${COMPANY.supportEmail}</p>
    </div>
  </div>
</body>
</html>`;

    return { html, receiptData: data };
  },
});

/**
 * Increment download counter
 */
export const incrementDownload = mutation({
  args: { receiptId: v.id("generated_receipts"), format: v.union(v.literal("jpg"), v.literal("pdf")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get("generated_receipts", args.receiptId);
    if (!receipt) return null;
    await ctx.db.patch("generated_receipts", args.receiptId, {
      downloads: receipt.downloads + 1,
      ...(args.format === "jpg" ? { jpgUrl: `downloaded_${Date.now()}` } : { pdfUrl: `downloaded_${Date.now()}` }),
    });
    return null;
  },
});

/**
 * Get receipt statistics
 */
export const getReceiptStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const all = await ctx.db.query("generated_receipts").collect();
    const now = Date.now();
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const byType: Record<string, number> = {};
    const recent = all.filter((r) => r.createdAt >= monthAgo);

    for (const r of all) {
      byType[r.transactionType] = (byType[r.transactionType] || 0) + 1;
    }

    return {
      total: all.length,
      thisMonth: recent.length,
      totalDownloads: all.reduce((sum, r) => sum + r.downloads, 0),
      byType,
      totalAmount: all.reduce((sum, r) => sum + r.amountNgn, 0),
    };
  },
});
