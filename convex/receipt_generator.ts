import { v } from "convex/values";
import { action } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// RECEIPT GENERATOR
// Auto-generate professional receipts for payments
// ═══════════════════════════════════════════════════════════════════

export const generateReceipt = action({
  args: {
    receiptNumber: v.optional(v.string()),
    businessName: v.string(),
    businessEmail: v.string(),
    businessAddress: v.optional(v.string()),
    businessPhone: v.optional(v.string()),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    items: v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
    })),
    tax: v.optional(v.number()),
    discount: v.optional(v.number()),
    paymentMethod: v.string(),
    currency: v.optional(v.string()),
    notes: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const receiptNumber = args.receiptNumber || `RCT-${Date.now()}`;
    const currency = args.currency || "NGN";
    const now = new Date();

    const subtotal = args.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const discountAmt = (subtotal * (args.discount || 0)) / 100;
    const taxableAmt = subtotal - discountAmt;
    const taxAmt = (taxableAmt * (args.tax || 0)) / 100;
    const total = taxableAmt + taxAmt;

    const fmt = (n: number) => `${currency} ${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Receipt ${receiptNumber}</title>
<style>
  @media print { body { padding: 0; } .no-print { display: none; } }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f0f0f0; color: #333; }
  .receipt { max-width: 500px; margin: 20px auto; background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 2px 15px rgba(0,0,0,0.1); }
  .header { text-align: center; padding-bottom: 20px; border-bottom: 2px dashed #ddd; }
  .header h1 { color: #FF6B35; font-size: 22px; margin-bottom: 5px; }
  .header p { font-size: 12px; color: #666; }
  .badge { display: inline-block; background: #28a745; color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-top: 10px; letter-spacing: 1px; }
  .meta { display: flex; justify-content: space-between; padding: 15px 0; font-size: 12px; color: #666; border-bottom: 1px solid #f0f0f0; }
  .meta div span { display: block; font-weight: 600; color: #333; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  thead th { text-align: left; padding: 8px 0; font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; border-bottom: 1px solid #eee; }
  thead th:last-child { text-align: right; }
  tbody td { padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
  tbody td:last-child { text-align: right; font-weight: 600; }
  .totals { margin-top: 15px; padding-top: 10px; border-top: 2px solid #FF6B35; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .totals .row.total { font-size: 18px; font-weight: 700; color: #FF6B35; padding-top: 10px; border-top: 1px solid #eee; margin-top: 5px; }
  .payment-info { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; }
  .payment-info h3 { font-size: 11px; text-transform: uppercase; color: #999; margin-bottom: 8px; }
  .payment-info p { font-size: 13px; line-height: 1.6; }
  .footer { text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px dashed #ddd; }
  .footer p { font-size: 11px; color: #999; line-height: 1.6; }
  .actions { text-align: center; margin-top: 20px; }
  .actions button { padding: 10px 25px; margin: 5px; border-radius: 6px; border: none; font-size: 13px; cursor: pointer; font-weight: 600; }
  .print-btn { background: #FF6B35; color: #fff; }
  .print-btn:hover { background: #E85A2A; }
  .download-btn { background: #333; color: #fff; }
  .download-btn:hover { background: #555; }
</style>
</head>
<body>
<div class="receipt">
  <div class="header">
    <h1>${args.businessName}</h1>
    ${args.businessAddress ? `<p>${args.businessAddress}</p>` : ""}
    ${args.businessPhone ? `<p>${args.businessPhone}</p>` : ""}
    <p>${args.businessEmail}</p>
    <div class="badge">PAYMENT RECEIVED</div>
  </div>

  <div class="meta">
    <div><span>${receiptNumber}</span>Receipt #</div>
    <div><span>${now.toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}</span>Date</div>
    <div><span>${now.toLocaleTimeString("en-NG")}</span>Time</div>
  </div>

  <div class="meta">
    <div><span>${args.customerName}</span>Customer</div>
    ${args.customerEmail ? `<div><span>${args.customerEmail}</span>Email</div>` : ""}
  </div>

  <table>
    <thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead>
    <tbody>
      ${args.items.map(i => `<tr><td>${i.description}</td><td>${i.quantity}</td><td>${fmt(i.unitPrice)}</td><td>${fmt(i.quantity * i.unitPrice)}</td></tr>`).join("\n")}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
    ${args.discount ? `<div class="row"><span>Discount (${args.discount}%)</span><span>-${fmt(discountAmt)}</span></div>` : ""}
    ${args.tax ? `<div class="row"><span>Tax (${args.tax}%)</span><span>${fmt(taxAmt)}</span></div>` : ""}
    <div class="row total"><span>Total Paid</span><span>${fmt(total)}</span></div>
  </div>

  <div class="payment-info">
    <h3>Payment Details</h3>
    <p><strong>Method:</strong> ${args.paymentMethod}</p>
    <p><strong>Status:</strong> <span style="color:#28a745;font-weight:700;">PAID</span></p>
    <p><strong>Date:</strong> ${now.toLocaleDateString("en-NG")}</p>
  </div>

  ${args.notes ? `<div class="footer"><p><strong>Notes:</strong> ${args.notes}</p></div>` : ""}

  <div class="footer">
    <p>Thank you for your payment!</p>
    <p>For questions, contact ${args.businessEmail}</p>
    <p style="margin-top:10px;">Registration: <a href="https://dutchkem-prosuite-app.vercel.app/auth">dutchkem-prosuite-app.vercel.app</a></p>
  </div>

  <div class="actions no-print">
    <button class="print-btn" onclick="window.print()">🖨 Print Receipt</button>
  </div>
</div>
</body>
</html>`;

    return {
      success: true,
      receiptNumber,
      html,
      subtotal,
      discount: discountAmt,
      tax: taxAmt,
      total,
      currency,
      date: now.toISOString(),
    };
  },
});

export const generateBulkReceipts = action({
  args: {
    businessName: v.string(),
    businessEmail: v.string(),
    payments: v.array(v.object({
      customerName: v.string(),
      customerEmail: v.optional(v.string()),
      items: v.array(v.object({
        description: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
      })),
      paymentMethod: v.string(),
      currency: v.optional(v.string()),
    })),
    tax: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const results = args.payments.map((p, i) => {
      const subtotal = p.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
      const taxAmt = (subtotal * (args.tax || 0)) / 100;
      return {
        receiptNumber: `RCT-${Date.now()}-${i + 1}`,
        customerName: p.customerName,
        subtotal,
        tax: taxAmt,
        total: subtotal + taxAmt,
        currency: p.currency || "NGN",
      };
    });

    return {
      success: true,
      count: results.length,
      receipts: results,
      totalRevenue: results.reduce((s, r) => s + r.total, 0),
    };
  },
});
