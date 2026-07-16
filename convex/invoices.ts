import { v } from "convex/values";
import { action, mutation, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// INVOICE GENERATION
// Auto-generate PDF invoices for payments
// ═══════════════════════════════════════════════════════════════════

const COMPANY_INFO = {
  name: "Dutchkem Ventures",
  address: "Lagos, Nigeria",
  email: "billing@dutchkem.com",
  phone: "+234 800 000 0000",
  website: "https://dutchkem.com",
};

// ─── GENERATE INVOICE ───
export const generateInvoice = action({
  args: {
    reference: v.string(),
    adminToken: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    invoiceId: v.optional(v.string()),
    invoiceUrl: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Verify admin session
    const session = await ctx.runQuery(internal.auth_helpers.validateAdminSession, {
      adminToken: args.adminToken,
    });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the transaction
    const pending = await ctx.runQuery(internal.kora_checkout.getPendingByReference, {
      reference: args.reference,
    });
    if (!pending) {
      return { success: false, error: "Transaction not found" };
    }

    // Generate invoice ID
    const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Store invoice record
    await ctx.runMutation(internal.invoices.storeInvoice, {
      invoiceId,
      reference: args.reference,
      userId: pending.userId,
      email: pending.email,
      amount: pending.amount,
      type: pending.type,
      packageId: pending.packageId,
      credits: pending.credits,
      billingCycle: pending.billingCycle,
      status: "generated",
    });

    // Generate invoice HTML
    const invoiceHtml = generateInvoiceHtml({
      invoiceId,
      reference: args.reference,
      email: pending.email,
      amount: pending.amount,
      type: pending.type,
      packageId: pending.packageId,
      credits: pending.credits,
      billingCycle: pending.billingCycle,
      createdAt: pending.createdAt,
    });

    return {
      success: true,
      invoiceId,
      invoiceUrl: `data:text/html;base64,${btoa(invoiceHtml)}`,
    };
  },
});

// ─── STORE INVOICE ───
export const storeInvoice = internalMutation({
  args: {
    invoiceId: v.string(),
    reference: v.string(),
    userId: v.string(),
    email: v.string(),
    amount: v.number(),
    type: v.string(),
    packageId: v.string(),
    credits: v.number(),
    billingCycle: v.optional(v.string()),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("invoices", {
      invoiceId: args.invoiceId,
      reference: args.reference,
      userId: args.userId,
      email: args.email,
      amount: args.amount,
      type: args.type,
      packageId: args.packageId,
      credits: args.credits,
      billingCycle: args.billingCycle,
      status: args.status,
      createdAt: Date.now(),
    });
    return null;
  },
});

// ─── GET INVOICES ───
export const getInvoices = query({
  args: {
    limit: v.optional(v.number()),
    userId: v.optional(v.string()),
    adminToken: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    let invoicesQuery = ctx.db.query("invoices");

    if (args.userId) {
      invoicesQuery = invoicesQuery.filter((q) => q.eq(q.field("userId"), args.userId));
    }

    const invoices = await invoicesQuery.collect();
    invoices.sort((a, b) => b.createdAt - a.createdAt);

    return invoices.slice(0, limit).map((inv: any) => ({
      id: inv._id,
      invoiceId: inv.invoiceId,
      reference: inv.reference,
      email: inv.email,
      amount: inv.amount,
      type: inv.type,
      packageId: inv.packageId,
      credits: inv.credits,
      status: inv.status,
      createdAt: inv.createdAt,
    }));
  },
});

// ─── HELPER: Generate Invoice HTML ───
function generateInvoiceHtml(data: {
  invoiceId: string;
  reference: string;
  email: string;
  amount: number;
  type: string;
  packageId: string;
  credits: number;
  billingCycle?: string;
  createdAt: number;
}): string {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const typeName = data.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${data.invoiceId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 40px; }
    .invoice { background: white; max-width: 800px; margin: 0 auto; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #059669; padding-bottom: 20px; }
    .company { font-size: 24px; font-weight: bold; color: #059669; }
    .invoice-title { font-size: 32px; color: #333; }
    .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .bill-to, .invoice-info { font-size: 14px; color: #666; }
    .bill-to p, .invoice-info p { margin: 5px 0; }
    .bill-to strong, .invoice-info strong { color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    th { background: #059669; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #eee; }
    .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; color: #059669; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .status.paid { background: #d1fae5; color: #065f46; }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div>
        <div class="company">${COMPANY_INFO.name}</div>
        <div style="font-size: 12px; color: #666;">${COMPANY_INFO.address}</div>
        <div style="font-size: 12px; color: #666;">${COMPANY_INFO.email}</div>
      </div>
      <div style="text-align: right;">
        <div class="invoice-title">INVOICE</div>
        <div style="font-size: 14px; color: #666;">${data.invoiceId}</div>
      </div>
    </div>

    <div class="details">
      <div class="bill-to">
        <strong>Bill To:</strong>
        <p>${data.email}</p>
      </div>
      <div class="invoice-info">
        <p><strong>Invoice Date:</strong> ${formatDate(data.createdAt)}</p>
        <p><strong>Reference:</strong> ${data.reference}</p>
        <p><strong>Status:</strong> <span class="status paid">PAID</span></p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Details</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${typeName}</td>
          <td>
            Plan: ${data.packageId}<br>
            ${data.credits > 0 ? `Credits: ${data.credits.toLocaleString()}` : ''}
            ${data.billingCycle ? `<br>Billing: ${data.billingCycle}` : ''}
          </td>
          <td style="text-align: right;">${formatAmount(data.amount)}</td>
        </tr>
      </tbody>
    </table>

    <div class="total">
      Total: ${formatAmount(data.amount)}
    </div>

    <div class="footer">
      <p>Thank you for your payment!</p>
      <p>${COMPANY_INFO.name} | ${COMPANY_INFO.website} | ${COMPANY_INFO.phone}</p>
      <p style="margin-top: 10px;">This is a computer-generated invoice.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// ─── SEND INVOICE EMAIL ───
export const sendInvoiceEmail = action({
  args: {
    invoiceId: v.string(),
    adminToken: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Verify admin session
    const session = await ctx.runQuery(internal.auth_helpers.validateAdminSession, {
      adminToken: args.adminToken,
    });
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Get invoice using index
    const invoice = await ctx.db.query("invoices")
      .withIndex("by_invoice_id", (q) => q.eq("invoiceId", args.invoiceId))
      .first();
    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    // Create email notification for external email service pickup
    const subject = `Invoice ${invoice.invoiceId} - Dutchkem Ventures`;
    const body = `Dear ${invoice.customerName || 'Customer'},\n\nPlease find your invoice details below:\n\nInvoice ID: ${invoice.invoiceId}\nAmount: ${invoice.currency || 'NGN'} ${(invoice.totalAmount || 0).toLocaleString()}\nStatus: ${invoice.status}\n\nThank you for your business.\n\nBest regards,\nDutchkem Ventures`;

    await ctx.runMutation(internal.invoices.logInvoiceEmail, {
      invoiceId: args.invoiceId,
      to: invoice.customerEmail || invoice.email || "",
      subject,
      body,
    });

    // Mark as sent
    await ctx.runMutation(internal.invoices.markInvoiceSent, {
      invoiceId: args.invoiceId,
    });

    return { success: true };
  },
});

// ─── MARK INVOICE SENT ───
export const markInvoiceSent = internalMutation({
  args: {
    invoiceId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invoice = await ctx.db.query("invoices")
      .withIndex("by_invoice_id", (q) => q.eq("invoiceId", args.invoiceId))
      .first();
    if (invoice) {
      await ctx.db.patch(invoice._id, {
        status: "sent",
        sentAt: Date.now(),
      });
    }
    return null;
  },
});

// ─── LOG INVOICE EMAIL ───
export const logInvoiceEmail = internalMutation({
  args: {
    invoiceId: v.string(),
    to: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("email_notifications", {
      to: args.to,
      subject: args.subject,
      body: args.body,
      type: "invoice",
      status: "pending",
      createdAt: Date.now(),
    });
    return null;
  },
});
