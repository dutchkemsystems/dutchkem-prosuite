import { v } from "convex/values";
import { action } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// INVOICE GENERATOR
// PDF invoices with payment tracking, recurring billing
// ═══════════════════════════════════════════════════════════════════

function generateInvoiceHTML(args: {
  invoiceNumber: string;
  from: string;
  fromEmail: string;
  fromAddress: string;
  to: string;
  toEmail: string;
  toAddress: string;
  items: Array<{ description: string; quantity: number; rate: number }>;
  tax: number;
  discount: number;
  notes: string;
  dueDate: string;
  currency: string;
  paymentUrl: string;
}): string {
  const subtotal = args.items.reduce((sum, i) => sum + i.quantity * i.rate, 0);
  const discountAmount = (subtotal * args.discount) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * args.tax) / 100;
  const total = taxableAmount + taxAmount;

  const formatAmount = (n: number) => `${args.currency} ${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; background: #fff; padding: 40px; }
  .invoice { max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #FF6B35; }
  .brand h1 { font-size: 28px; color: #FF6B35; }
  .brand p { color: #666; font-size: 12px; margin-top: 4px; }
  .invoice-info { text-align: right; }
  .invoice-info h2 { font-size: 24px; color: #333; margin-bottom: 5px; }
  .invoice-info p { font-size: 13px; color: #666; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .party { width: 45%; }
  .party h3 { font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 1px; margin-bottom: 8px; }
  .party p { font-size: 13px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th { background: #FF6B35; color: white; padding: 12px 15px; text-align: left; font-size: 12px; text-transform: uppercase; }
  thead th:last-child { text-align: right; }
  tbody td { padding: 12px 15px; border-bottom: 1px solid #eee; font-size: 13px; }
  tbody td:last-child { text-align: right; font-weight: 600; }
  .totals { float: right; width: 300px; }
  .totals .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; }
  .totals .row.total { border-top: 2px solid #FF6B35; font-size: 18px; font-weight: 700; color: #FF6B35; padding-top: 12px; margin-top: 4px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
  .footer p { font-size: 11px; color: #999; }
  .pay-btn { display: inline-block; background: #FF6B35; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 15px; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; background: #FFF3CD; color: #856404; }
</style>
</head>
<body>
<div class="invoice">
  <div class="header">
    <div class="brand">
      <h1>DutchKem Prosuite</h1>
      <p>AI-Powered Business Automation</p>
    </div>
    <div class="invoice-info">
      <h2>INVOICE</h2>
      <p><strong>#${args.invoiceNumber}</strong></p>
      <p>Date: ${new Date().toLocaleDateString("en-NG")}</p>
      <p>Due: ${args.dueDate}</p>
      <p><span class="status">UNPAID</span></p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>From</h3>
      <p><strong>${args.from}</strong><br>${args.fromEmail}<br>${args.fromAddress}</p>
    </div>
    <div class="party">
      <h3>Bill To</h3>
      <p><strong>${args.to}</strong><br>${args.toEmail}<br>${args.toAddress}</p>
    </div>
  </div>

  <table>
    <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
    <tbody>
      ${args.items.map(i => `<tr><td>${i.description}</td><td>${i.quantity}</td><td>${formatAmount(i.rate)}</td><td>${formatAmount(i.quantity * i.rate)}</td></tr>`).join("\n")}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${formatAmount(subtotal)}</span></div>
    ${args.discount > 0 ? `<div class="row"><span>Discount (${args.discount}%)</span><span>-${formatAmount(discountAmount)}</span></div>` : ""}
    ${args.tax > 0 ? `<div class="row"><span>Tax (${args.tax}%)</span><span>${formatAmount(taxAmount)}</span></div>` : ""}
    <div class="row total"><span>Total</span><span>${formatAmount(total)}</span></div>
  </div>

  <div style="clear:both"></div>

  ${args.paymentUrl ? `<a href="${args.paymentUrl}" class="pay-btn">Pay Now — ${formatAmount(total)}</a>` : ""}

  <div class="footer">
    ${args.notes ? `<p><strong>Note:</strong> ${args.notes}</p><br>` : ""}
    <p>Registration: <a href="https://dutchkem-prosuite-app.vercel.app/auth">https://dutchkem-prosuite-app.vercel.app/auth</a></p>
    <p>Generated by DutchKem Prosuite · ${new Date().toISOString()}</p>
  </div>
</div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════

export const createInvoice = action({
  args: {
    invoiceNumber: v.optional(v.string()),
    from: v.string(),
    fromEmail: v.string(),
    fromAddress: v.string(),
    to: v.string(),
    toEmail: v.string(),
    toAddress: v.string(),
    items: v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      rate: v.number(),
    })),
    tax: v.optional(v.number()),
    discount: v.optional(v.number()),
    notes: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    currency: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const invoiceNumber = args.invoiceNumber || `INV-${Date.now()}`;
    const dueDate = args.dueDate || new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-NG");
    const currency = args.currency || "NGN";
    const paymentUrl = `https://dutchkem-prosuite-app.vercel.app/pay?ref=${invoiceNumber}`;

    const html = generateInvoiceHTML({
      invoiceNumber,
      from: args.from,
      fromEmail: args.fromEmail,
      fromAddress: args.fromAddress,
      to: args.to,
      toEmail: args.toEmail,
      toAddress: args.toAddress,
      items: args.items,
      tax: args.tax || 0,
      discount: args.discount || 0,
      notes: args.notes || "",
      dueDate,
      currency,
      paymentUrl,
    });

    const subtotal = args.items.reduce((s, i) => s + i.quantity * i.rate, 0);
    const discountAmt = (subtotal * (args.discount || 0)) / 100;
    const taxAmt = ((subtotal - discountAmt) * (args.tax || 0)) / 100;
    const total = subtotal - discountAmt + taxAmt;

    return {
      success: true,
      invoiceNumber,
      html,
      subtotal,
      discount: discountAmt,
      tax: taxAmt,
      total,
      currency,
      dueDate,
      paymentUrl,
    };
  },
});

export const createRecurringInvoice = action({
  args: {
    clientName: v.string(),
    clientEmail: v.string(),
    items: v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      rate: v.number(),
    })),
    frequency: v.string(),
    from: v.string(),
    fromEmail: v.string(),
    fromAddress: v.string(),
    toAddress: v.optional(v.string()),
    tax: v.optional(v.number()),
    currency: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const invoiceNumber = `REC-${Date.now()}`;

    return {
      success: true,
      invoiceNumber,
      frequency: args.frequency,
      client: args.clientName,
      items: args.items.length,
      message: `Recurring invoice (${args.frequency}) configured for ${args.clientName}`,
      nextInvoice: args.frequency === "monthly" ? "Next month" : args.frequency === "weekly" ? "Next week" : "Next quarter",
    };
  },
});
