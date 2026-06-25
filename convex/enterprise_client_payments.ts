import { v } from "convex/values";
import { action, mutation, query, internalQuery } from "./_generated/server";
import { tryResolveEnterpriseAuth, tryGetAdminSession } from "./auth_helpers";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════
// INTERNAL QUERY: Get payment by ID (for use in actions)
// ═══════════════════════════════════════════════════════════════════
export const _getPaymentById = internalQuery({
  args: { paymentId: v.id("enterprise_client_payments") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.paymentId);
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL QUERY: Get payment config for an org
// ═══════════════════════════════════════════════════════════════════
export const _getPaymentConfigForOrg = internalQuery({
  args: { orgId: v.id("enterprise_organizations") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const configs = await ctx.db.query("enterprise_org_payment_configs")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    return configs.length > 0 ? configs[0] : null;
  },
});

async function resolveOrgId(
  ctx: any,
  args: { adminToken?: string; token?: string; orgId?: Id<"enterprise_organizations"> }
): Promise<Id<"enterprise_organizations"> | null> {
  if (args.orgId) return args.orgId;
  if (args.token) {
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    if (session && session.isCurrent) return session.orgId;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Create a client invoice
// ═══════════════════════════════════════════════════════════════════
export const createClientInvoice = mutation({
  args: {
    orgId: v.optional(v.id("enterprise_organizations")),
    token: v.optional(v.string()),
    adminToken: v.optional(v.string()),
    customerName: v.string(),
    customerEmail: v.string(),
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    companyId: v.optional(v.string()),
    invoiceNumber: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await tryResolveEnterpriseAuth(ctx, args);
    if (!auth) throw new Error("Not authenticated");

    const resolvedOrgId = await resolveOrgId(ctx, args);
    if (!resolvedOrgId) throw new Error("Organization not found");

    if (auth.isAdmin) throw new Error("Admin cannot create client invoices — use enterprise account");

    const now = Date.now();
    const invoiceNum = args.invoiceNumber || `INV-${now}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const paymentId = await ctx.db.insert("enterprise_client_payments", {
      orgId: resolvedOrgId,
      companyId: args.companyId,
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      amount: args.amount,
      currency: args.currency,
      description: args.description,
      status: "pending",
      gateway: "pending",
      invoiceNumber: invoiceNum,
      createdAt: now,
    });

    return { success: true, paymentId, invoiceNumber: invoiceNum };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Initialize payment with gateway
// ═══════════════════════════════════════════════════════════════════
export const initializeGatewayPayment = action({
  args: {
    paymentId: v.id("enterprise_client_payments"),
    token: v.optional(v.string()),
    adminToken: v.optional(v.string()),
    returnUrl: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await tryResolveEnterpriseAuth(ctx, { ...args, orgId: undefined });
    if (!auth) throw new Error("Not authenticated");

    const payment = await ctx.runQuery(internal.enterprise_client_payments._getPaymentById, {
      paymentId: args.paymentId,
    });
    if (!payment) throw new Error("Payment not found");
    if (payment.status !== "pending") throw new Error("Payment already processed");

    const config = await ctx.runQuery(internal.enterprise_client_payments._getPaymentConfigForOrg, {
      orgId: payment.orgId,
    });

    if (!config) {
      return { error: "No payment gateway configured. Please set up a gateway in Settings." };
    }
    const siteUrl = process.env.SITE_URL || "https://dutchkem-prosuite-app.vercel.app";
    const returnUrl = args.returnUrl || `${siteUrl}/enterprise/dashboard?payments=success&ref=${payment.invoiceNumber}`;

    try {
      let checkoutUrl = "";
      let gatewayRef = "";

      if (config.gateway === "kora") {
        const res = await fetch("https://api.korapay.com/merchant/api/v1/charges/initialize", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: payment.amount,
            currency: payment.currency,
            reference: payment.invoiceNumber,
            customer: { name: payment.customerName, email: payment.customerEmail },
            redirect_url: returnUrl,
          }),
        });
        const data = await res.json();
        if (!data.status) return { error: data.message || "Kora Pay initialization failed" };
        checkoutUrl = data.data?.checkout_url || "";
        gatewayRef = data.data?.reference || payment.invoiceNumber || "";
      } else if (config.gateway === "stripe") {
        const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            "payment_method_types[]": "card",
            "line_items[0][price_data][currency]": payment.currency.toLowerCase(),
            "line_items[0][price_data][unit_amount]": String(payment.amount * 100),
            "line_items[0][price_data][product_data][name]": payment.description,
            "line_items[0][quantity]": "1",
            mode: "payment",
            success_url: returnUrl,
            cancel_url: `${siteUrl}/enterprise/dashboard?payments=cancelled`,
            "metadata[invoice_number]": payment.invoiceNumber || "",
          }).toString(),
        });
        const data = await res.json();
        if (data.error) return { error: data.error.message };
        checkoutUrl = data.url || "";
        gatewayRef = data.id || "";
      } else if (config.gateway === "flutterwave") {
        const res = await fetch("https://api.flutterwave.com/v3/payments", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tx_ref: payment.invoiceNumber,
            amount: payment.amount,
            currency: payment.currency,
            customer: { name: payment.customerName, email: payment.customerEmail },
            redirect_url: returnUrl,
          }),
        });
        const data = await res.json();
        if (data.status !== "success") return { error: data.message || "Flutterwave initialization failed" };
        checkoutUrl = data.data?.link || "";
        gatewayRef = payment.invoiceNumber || "";
      }

      await ctx.runMutation(internal.enterprise_client_payments._updatePaymentGateway, {
        paymentId: args.paymentId,
        gateway: config.gateway,
        gatewayReference: gatewayRef,
      });

      return { success: true, checkoutUrl, gateway: config.gateway };
    } catch (err: any) {
      return { error: err?.message || "Payment initialization failed" };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL MUTATION: Update payment gateway info
// ═══════════════════════════════════════════════════════════════════
export const _updatePaymentGateway = mutation({
  args: {
    paymentId: v.id("enterprise_client_payments"),
    gateway: v.string(),
    gatewayReference: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.paymentId, {
      gateway: args.gateway,
      gatewayReference: args.gatewayReference,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Confirm payment (called by webhook)
// ═══════════════════════════════════════════════════════════════════
export const confirmPayment = mutation({
  args: {
    invoiceNumber: v.string(),
    gatewayReference: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let payment = await ctx.db.query("enterprise_client_payments")
      .withIndex("by_gateway_ref", (q) => q.eq("gatewayReference", args.gatewayReference || args.invoiceNumber))
      .first();

    if (!payment) {
      payment = await ctx.db.query("enterprise_client_payments")
        .filter((q) => q.eq(q.field("invoiceNumber"), args.invoiceNumber))
        .first();
    }

    if (!payment) return { error: "Payment not found" };
    if (payment.status === "completed") return { success: true, alreadyProcessed: true };

    await ctx.db.patch(payment._id, {
      status: "completed",
      completedAt: Date.now(),
      metadata: args.metadata,
    });
    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Fail payment
// ═══════════════════════════════════════════════════════════════════
export const failPayment = mutation({
  args: {
    invoiceNumber: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const payment = await ctx.db.query("enterprise_client_payments")
      .filter((q) => q.eq(q.field("invoiceNumber"), args.invoiceNumber))
      .first();

    if (!payment) return { error: "Payment not found" };
    if (payment.status === "completed") return { success: true, alreadyProcessed: true };

    await ctx.db.patch(payment._id, {
      status: "failed",
      metadata: { failureReason: args.reason },
    });
    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: List client payments (enterprise-scoped)
// ═══════════════════════════════════════════════════════════════════
export const listClientPayments = query({
  args: {
    orgId: v.optional(v.id("enterprise_organizations")),
    token: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    if (!resolvedOrgId) return [];

    return await ctx.db.query("enterprise_client_payments")
      .withIndex("by_org", (q) => q.eq("orgId", resolvedOrgId))
      .order("desc")
      .collect();
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get payment stats (enterprise-scoped)
// ═══════════════════════════════════════════════════════════════════
export const getClientPaymentStats = query({
  args: {
    orgId: v.optional(v.id("enterprise_organizations")),
    token: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    if (!resolvedOrgId) return { totalCollected: 0, totalPending: 0, totalFailed: 0, totalCount: 0, completedCount: 0 };

    const payments = await ctx.db.query("enterprise_client_payments")
      .withIndex("by_org", (q) => q.eq("orgId", resolvedOrgId))
      .collect();

    return {
      totalCollected: payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0),
      totalPending: payments.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0),
      totalFailed: payments.filter((p) => p.status === "failed").length,
      totalCount: payments.length,
      completedCount: payments.filter((p) => p.status === "completed").length,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Admin read-only — list ALL enterprise payments
// ═══════════════════════════════════════════════════════════════════
export const adminListAllEnterprisePayments = query({
  args: {
    adminToken: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated as admin");

    const limit = args.limit || 100;
    const payments = await ctx.db.query("enterprise_client_payments")
      .order("desc")
      .take(limit);

    const enriched = [];
    for (const payment of payments) {
      const org = await ctx.db.get("enterprise_organizations", payment.orgId);
      enriched.push({
        ...payment,
        orgName: org?.name || "Unknown",
        orgEmail: org?.email || "",
      });
    }

    return enriched;
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Add bank account
// ═══════════════════════════════════════════════════════════════════
export const addBankAccount = mutation({
  args: {
    orgId: v.optional(v.id("enterprise_organizations")),
    token: v.optional(v.string()),
    bankName: v.string(),
    bankCode: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await tryResolveEnterpriseAuth(ctx, args);
    if (!auth) throw new Error("Not authenticated");
    if (auth.isAdmin) throw new Error("Admin cannot add bank accounts");

    const resolvedOrgId = await resolveOrgId(ctx, args);
    if (!resolvedOrgId) throw new Error("Organization not found");

    const existing = await ctx.db.query("enterprise_org_bank_accounts")
      .withIndex("by_org", (q) => q.eq("orgId", resolvedOrgId))
      .collect();

    const accountId = await ctx.db.insert("enterprise_org_bank_accounts", {
      orgId: resolvedOrgId,
      bankName: args.bankName,
      bankCode: args.bankCode,
      accountNumber: args.accountNumber,
      accountName: args.accountName,
      isDefault: existing.length === 0,
      isVerified: false,
      createdAt: Date.now(),
    });

    return { success: true, accountId };
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: List bank accounts
// ═══════════════════════════════════════════════════════════════════
export const getOrgBankAccounts = query({
  args: {
    orgId: v.optional(v.id("enterprise_organizations")),
    token: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const resolvedOrgId = await resolveOrgId(ctx, args);
    if (!resolvedOrgId) return [];

    return await ctx.db.query("enterprise_org_bank_accounts")
      .withIndex("by_org", (q) => q.eq("orgId", resolvedOrgId))
      .collect();
  },
});
