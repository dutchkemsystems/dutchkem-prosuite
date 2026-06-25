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
    const now = new Date();
    const freqDays = args.frequency === "weekly" ? 7 : args.frequency === "quarterly" ? 90 : 30;
    const nextDate = new Date(now.getTime() + freqDays * 86400000);

    const fmt = (n: number) => `${args.currency || "NGN"} ${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
    const subtotal = args.items.reduce((s, i) => s + i.quantity * i.rate, 0);
    const taxAmt = (subtotal * (args.tax || 0)) / 100;
    const total = subtotal + taxAmt;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Recurring Invoice ${invoiceNumber}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;padding:40px;color:#333}.inv{max-width:700px;margin:0 auto}
.hdr{display:flex;justify-content:space-between;border-bottom:3px solid #FF6B35;padding-bottom:15px;margin-bottom:25px}
.brand h1{color:#FF6B35;font-size:22px}.info h2{font-size:20px;text-align:right}.info p{font-size:12px;color:#666;text-align:right}
.badge{display:inline-block;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:700;background:#FFF3CD;color:#856404;margin-top:5px}
table{width:100%;border-collapse:collapse;margin:15px 0}thead th{background:#FF6B35;color:#fff;padding:10px;font-size:11px;text-transform:uppercase;text-align:left}
thead th:last-child{text-align:right}tbody td{padding:10px;border-bottom:1px solid #eee;font-size:13px}tbody td:last-child{text-align:right;font-weight:600}
.totals{float:right;width:250px}.row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px}
.row.total{border-top:2px solid #FF6B35;font-size:16px;font-weight:700;color:#FF6B35;padding-top:10px;margin-top:5px}
.footer{margin-top:30px;font-size:11px;color:#999;text-align:center}
</style></head><body><div class="inv">
<div class="hdr"><div class="brand"><h1>DutchKem Prosuite</h1><p>${args.from}</p><p>${args.fromEmail}</p></div>
<div class="info"><h2>RECURRING INVOICE</h2><p><strong>#${invoiceNumber}</strong></p><p>Frequency: ${args.frequency}</p>
<p>${now.toLocaleDateString("en-NG")}</p><span class="badge">🔄 ${args.frequency.toUpperCase()}</span></div></div>
<p style="margin-bottom:10px;font-size:13px"><strong>Bill To:</strong> ${args.clientName} — ${args.clientEmail}</p>
${args.toAddress ? `<p style="font-size:12px;color:#666;margin-bottom:15px">${args.toAddress}</p>` : ""}
<table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>
${args.items.map(i => `<tr><td>${i.description}</td><td>${i.quantity}</td><td>${fmt(i.rate)}</td><td>${fmt(i.quantity * i.rate)}</td></tr>`).join("")}
</tbody></table>
<div class="totals"><div class="row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
${args.tax ? `<div class="row"><span>Tax (${args.tax}%)</span><span>${fmt(taxAmt)}</span></div>` : ""}
<div class="row total"><span>Total</span><span>${fmt(total)}</span></div></div>
<div style="clear:both"></div>
<p style="margin-top:20px;padding:15px;background:#f8f9fa;border-radius:8px;font-size:13px;color:#555">
<strong>Next Invoice:</strong> ${nextDate.toLocaleDateString("en-NG")} · Auto-generated every ${freqDays} days</p>
<div class="footer"><p>Registration: <a href="https://dutchkem-prosuite-app.vercel.app/auth">dutchkem-prosuite-app.vercel.app</a></p>
<p>Generated by DutchKem Prosuite · ${now.toISOString()}</p></div>
</div></body></html>`;

    return {
      success: true,
      invoiceNumber,
      html,
      frequency: args.frequency,
      subtotal,
      tax: taxAmt,
      total,
      currency: args.currency || "NGN",
      nextInvoice: nextDate.toLocaleDateString("en-NG"),
      frequencyDays: freqDays,
      client: args.clientName,
    };
  },
});
