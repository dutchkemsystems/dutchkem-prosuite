# Enterprise Direct Payment Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable enterprise companies to receive payments directly from their own customers via multiple gateways, with admin read-only visibility.

**Architecture:** New Convex module (`enterprise_client_payments.ts`) with mutations/queries/actions. New schema tables. Webhook handler extension. Enterprise dashboard UI tab. Admin read-only section.

**Tech Stack:** Convex (TypeScript), React, Kora Pay / Stripe / Flutterwave APIs

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `convex/schema.ts` | Modify | Add 2 new tables |
| `convex/enterprise_client_payments.ts` | Create | Backend: mutations, queries, actions |
| `convex/enterprise_client_payments.test.ts` | Create | Tests |
| `convex/webhook_handlers.ts` | Modify | Extend webhook for enterprise payments |
| `src/components/enterprise/capabilities/ClientPaymentsTab.tsx` | Create | Enterprise UI |
| `src/routes/enterprise/dashboard.tsx` | Modify | Add new tab |
| `src/components/admin/EnterprisePaymentsReadOnly.tsx` | Create | Admin read-only view |
| `src/routes/admin/dashboard.tsx` | Modify | Add admin tab |

---

### Task 1: Add Schema Tables

**Covers:** [S3]

**Files:**
- Modify: `convex/schema.ts` (add tables after `enterprise_org_payment_configs`)

- [ ] **Step 1: Add enterprise_client_payments table**

In `convex/schema.ts`, after the `enterprise_org_payment_configs` table definition (around line 4251), add:

```typescript
  enterprise_client_payments: defineTable({
    orgId: v.id("enterprise_organizations"),
    companyId: v.optional(v.string()),
    customerName: v.string(),
    customerEmail: v.string(),
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    gateway: v.string(),
    gatewayReference: v.optional(v.string()),
    invoiceNumber: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_org", ["orgId"])
    .index("by_status", ["status"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_gateway_ref", ["gatewayReference"]),
```

- [ ] **Step 2: Add enterprise_org_bank_accounts table**

Right after the above, add:

```typescript
  enterprise_org_bank_accounts: defineTable({
    orgId: v.id("enterprise_organizations"),
    bankName: v.string(),
    bankCode: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    isDefault: v.boolean(),
    isVerified: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"]),
```

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add enterprise_client_payments and enterprise_org_bank_accounts tables"
```

---

### Task 2: Create Backend Module — Queries & Mutations

**Covers:** [S4, S5, S6]

**Files:**
- Create: `convex/enterprise_client_payments.ts`

- [ ] **Step 1: Create the module with auth helper and mutations**

Create `convex/enterprise_client_payments.ts`:

```typescript
import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { tryResolveEnterpriseAuth, tryGetAdminSessionInAction } from "./auth_helpers";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

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
// MUTATION: Create a client invoice and initialize payment
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

    // Only enterprise org users can create invoices (not admin)
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
// MUTATION: Initialize payment with gateway
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

    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");
    if (payment.status !== "pending") throw new Error("Payment already processed");

    // Get org's payment config
    const configs = await ctx.db.query("enterprise_org_payment_configs")
      .withIndex("by_org", (q) => q.eq("orgId", payment.orgId))
      .collect();

    if (configs.length === 0) {
      return { error: "No payment gateway configured. Please set up a gateway in Settings." };
    }

    const config = configs[0]; // Use first configured gateway
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
        gatewayRef = data.data?.reference || payment.invoiceNumber;
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

      // Update payment with gateway info
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
  handler: async (ctx, args) => {
    await ctx.db.patch(args.paymentId, {
      gateway: args.gateway,
      gatewayReference: args.gatewayReference,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// INTERNAL MUTATION: Confirm payment (called by webhook)
// ═══════════════════════════════════════════════════════════════════
export const confirmPayment = mutation({
  args: {
    invoiceNumber: v.string(),
    gatewayReference: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.query("enterprise_client_payments")
      .withIndex("by_gateway_ref", (q) => q.eq("gatewayReference", args.gatewayReference || args.invoiceNumber))
      .first();

    if (!payment) {
      // Try by invoiceNumber
      const byInvoice = await ctx.db.query("enterprise_client_payments")
        .filter((q) => q.eq(q.field("invoiceNumber"), args.invoiceNumber))
        .first();
      if (!byInvoice) return { error: "Payment not found" };
      if (byInvoice.status === "completed") return { success: true, alreadyProcessed: true };

      await ctx.db.patch(byInvoice._id, {
        status: "completed",
        completedAt: Date.now(),
        metadata: args.metadata,
      });
      return { success: true };
    }

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
// MUTATION: Fail payment (called by webhook on failure)
// ═══════════════════════════════════════════════════════════════════
export const failPayment = mutation({
  args: {
    invoiceNumber: v.string(),
    reason: v.optional(v.string()),
  },
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
    if (!resolvedOrgId) return { totalCollected: 0, totalPending: 0, totalFailed: 0, totalCount: 0 };

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
    const identity = await (await import("./auth_helpers")).tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated as admin");

    const limit = args.limit || 100;
    const payments = await ctx.db.query("enterprise_client_payments")
      .order("desc")
      .take(limit);

    // Enrich with org names
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

    // If this is the first account, make it default
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
```

- [ ] **Step 2: Commit**

```bash
git add convex/enterprise_client_payments.ts
git commit -m "feat: enterprise client payments backend - mutations, queries, gateway integration"
```

---

### Task 3: Create Tests

**Covers:** [S8]

**Files:**
- Create: `convex/enterprise_client_payments.test.ts`

- [ ] **Step 1: Write tests**

Create `convex/enterprise_client_payments.test.ts`:

```typescript
import { describe, test, expect } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = {
  enterprise_client_payments: await import("./enterprise_client_payments"),
  enterprise_auth: await import("./enterprise_auth"),
  auth_helpers: await import("./auth_helpers"),
};

describe("enterprise_client_payments", () => {
  test("listClientPayments returns empty for unknown org", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.enterprise_client_payments.listClientPayments, {});
    expect(result).toEqual([]);
  });

  test("getClientPaymentStats returns zero stats for unknown org", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.enterprise_client_payments.getClientPaymentStats, {});
    expect(result.totalCollected).toBe(0);
    expect(result.totalPending).toBe(0);
    expect(result.totalFailed).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  test("createClientInvoice fails without auth", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.enterprise_client_payments.createClientInvoice, {
        customerName: "Test",
        customerEmail: "test@example.com",
        amount: 1000,
        currency: "NGN",
        description: "Test invoice",
      })
    ).rejects.toThrow("Not authenticated");
  });

  test("adminListAllEnterprisePayments fails without admin token", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.query(api.enterprise_client_payments.adminListAllEnterprisePayments, {
        adminToken: "invalid",
      })
    ).rejects.toThrow("Not authenticated");
  });

  test("getOrgBankAccounts returns empty for unknown org", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.enterprise_client_payments.getOrgBankAccounts, {});
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npx vitest run convex/enterprise_client_payments.test.ts
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add convex/enterprise_client_payments.test.ts
git commit -m "test: enterprise client payments backend tests"
```

---

### Task 4: Extend Webhook Handler

**Covers:** [S4]

**Files:**
- Modify: `convex/http.ts` (or wherever Kora/Stripe webhooks are handled)

- [ ] **Step 1: Add enterprise payment webhook endpoint**

In `convex/http.ts`, add a new route for enterprise payment webhooks. Find where existing webhook routes are defined and add:

```typescript
// Enterprise client payment webhook
app.post("/api/webhooks/enterprise-payment", async (ctx) => {
  const body = await ctx.req.json();

  // Kora Pay webhook
  if (body.event === "charge.success") {
    const invoiceNumber = body.data?.reference || body.data?.metadata?.invoice_number;
    if (invoiceNumber) {
      await ctx.runMutation(internal.enterprise_client_payments.confirmPayment, {
        invoiceNumber,
        gatewayReference: body.data?.reference,
        metadata: body.data,
      });
    }
  }

  // Stripe webhook
  if (body.type === "checkout.session.completed") {
    const invoiceNumber = body.data?.object?.metadata?.invoice_number;
    if (invoiceNumber) {
      await ctx.runMutation(internal.enterprise_client_payments.confirmPayment, {
        invoiceNumber,
        gatewayReference: body.data?.object?.id,
        metadata: body.data?.object,
      });
    }
  }

  // Flutterwave webhook
  if (body.event === "charge.completed") {
    const invoiceNumber = body.data?.tx_ref;
    if (invoiceNumber) {
      await ctx.runMutation(internal.enterprise_client_payments.confirmPayment, {
        invoiceNumber,
        gatewayReference: body.data?.transaction_id,
        metadata: body.data,
      });
    }
  }

  // Handle failures
  if (body.event === "charge.failed" || body.type === "checkout.session.expired") {
    const invoiceNumber = body.data?.reference || body.data?.metadata?.invoice_number || body.data?.tx_ref;
    if (invoiceNumber) {
      await ctx.runMutation(internal.enterprise_client_payments.failPayment, {
        invoiceNumber,
        reason: body.data?.message || "Payment failed",
      });
    }
  }

  return new Response("ok");
});
```

- [ ] **Step 2: Commit**

```bash
git add convex/http.ts
git commit -m "feat: add enterprise payment webhook handler for kora, stripe, flutterwave"
```

---

### Task 5: Create Enterprise Dashboard UI

**Covers:** [S7]

**Files:**
- Create: `src/components/enterprise/capabilities/ClientPaymentsTab.tsx`
- Modify: `src/routes/enterprise/dashboard.tsx` (add tab)

- [ ] **Step 1: Create ClientPaymentsTab component**

Create `src/components/enterprise/capabilities/ClientPaymentsTab.tsx`:

```tsx
import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function ClientPaymentsTab({ token }: { token: string }) {
  const payments = useQuery(api.enterprise_client_payments.listClientPayments, token ? { token } : 'skip') || []
  const stats = useQuery(api.enterprise_client_payments.getClientPaymentStats, token ? { token } : 'skip') || { totalCollected: 0, totalPending: 0, totalFailed: 0, totalCount: 0 }
  const bankAccounts = useQuery(api.enterprise_client_payments.getOrgBankAccounts, token ? { token } : 'skip') || []
  const createInvoice = useMutation(api.enterprise_client_payments.createClientInvoice)
  const initPayment = useAction(api.enterprise_client_payments.initializeGatewayPayment)
  const addBankAccount = useMutation(api.enterprise_client_payments.addBankAccount)

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ customerName: '', customerEmail: '', amount: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showBank, setShowBank] = useState(false)
  const [bankForm, setBankForm] = useState({ bankName: '', bankCode: '', accountNumber: '', accountName: '' })

  const showToast = (msg: string, isError = false) => {
    if (isError) setError(msg)
    else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 3000)
  }

  const handleCreateInvoice = async () => {
    if (!form.customerName || !form.customerEmail || !form.amount || !form.description) {
      showToast('All fields required', true)
      return
    }
    setLoading(true)
    try {
      const result = await createInvoice({
        token,
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        amount: Number(form.amount),
        currency: 'NGN',
        description: form.description,
      })
      if (result.error) { showToast(result.error, true); return }

      // Initialize payment with gateway
      const payResult = await initPayment({ paymentId: result.paymentId, token })
      if (payResult.error) {
        showToast(`Invoice created (${result.invoiceNumber}) but gateway init failed: ${payResult.error}`, true)
      } else {
        showToast(`Invoice ${result.invoiceNumber} created! Redirecting to payment...`)
        if (payResult.checkoutUrl) {
          window.open(payResult.checkoutUrl, '_blank')
        }
      }
      setShowCreate(false)
      setForm({ customerName: '', customerEmail: '', amount: '', description: '' })
    } catch (e: any) {
      showToast(e.message || 'Failed to create invoice', true)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBank = async () => {
    if (!bankForm.bankName || !bankForm.bankCode || !bankForm.accountNumber || !bankForm.accountName) {
      showToast('All fields required', true)
      return
    }
    setLoading(true)
    try {
      await addBankAccount({ token, ...bankForm })
      showToast('Bank account added!')
      setShowBank(false)
      setBankForm({ bankName: '', bankCode: '', accountNumber: '', accountName: '' })
    } catch (e: any) {
      showToast(e.message || 'Failed to add bank account', true)
    } finally {
      setLoading(false)
    }
  }

  const statusColors: Record<string, string> = {
    completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    pending: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    failed: 'text-red-400 bg-red-500/10 border-red-500/20',
    refunded: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  }

  return (
    <div className="space-y-6">
      {(error || success) && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${error ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {error || success}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Client Payments</h2>
          <p className="text-sm text-slate-400 mt-1">Collect payments directly from your customers</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setShowCreate(!showCreate); setShowBank(false) }}
            className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-sm rounded-xl hover:scale-105 transition-all">
            Create Invoice
          </button>
          <button onClick={() => { setShowBank(!showBank); setShowCreate(false) }}
            className="px-5 py-3 bg-white/5 border border-white/10 text-white font-black text-sm rounded-xl hover:bg-white/10 transition-all">
            Bank Accounts
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Total Collected</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">₦{stats.totalCollected.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Pending</p>
          <p className="text-2xl font-black text-orange-400 mt-1">₦{stats.totalPending.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Completed</p>
          <p className="text-2xl font-black text-white mt-1">{stats.completedCount}</p>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Failed</p>
          <p className="text-2xl font-black text-red-400 mt-1">{stats.totalFailed}</p>
        </div>
      </div>

      {/* Create Invoice Form */}
      {showCreate && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <h3 className="font-black">Create Invoice</h3>
          <div className="grid grid-cols-2 gap-4">
            <input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })}
              placeholder="Customer Name"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium" />
            <input value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })}
              placeholder="Customer Email"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">₦</span>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="Amount"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium" />
            </div>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Description"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium" />
          </div>
          <button onClick={handleCreateInvoice} disabled={loading}
            className="px-6 py-3 bg-emerald-600 text-white font-black text-sm rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50">
            {loading ? 'Processing...' : 'Create & Send Invoice'}
          </button>
        </div>
      )}

      {/* Bank Account Form */}
      {showBank && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <h3 className="font-black">Add Bank Account</h3>
          <div className="grid grid-cols-2 gap-4">
            <input value={bankForm.bankName} onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}
              placeholder="Bank Name (e.g. GTBank)"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium" />
            <input value={bankForm.bankCode} onChange={e => setBankForm({ ...bankForm, bankCode: e.target.value })}
              placeholder="Bank Code (e.g. 058)"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input value={bankForm.accountNumber} onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })}
              placeholder="Account Number"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium" />
            <input value={bankForm.accountName} onChange={e => setBankForm({ ...bankForm, accountName: e.target.value })}
              placeholder="Account Name"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium" />
          </div>
          <button onClick={handleAddBank} disabled={loading}
            className="px-6 py-3 bg-emerald-600 text-white font-black text-sm rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50">
            {loading ? 'Saving...' : 'Add Bank Account'}
          </button>

          {/* Existing accounts */}
          {bankAccounts.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Saved Accounts</p>
              {bankAccounts.map((acc: any) => (
                <div key={acc._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <p className="text-sm font-bold">{acc.bankName} - {acc.accountNumber}</p>
                    <p className="text-xs text-slate-400">{acc.accountName}</p>
                  </div>
                  {acc.isDefault && <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">DEFAULT</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment History */}
      <div>
        <h3 className="font-black mb-4">Payment History</h3>
        {payments.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="text-4xl mb-2">💳</p>
            <p className="font-bold">No payments yet</p>
            <p className="text-sm mt-1">Create an invoice to start collecting payments</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((p: any) => (
              <div key={p._id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex-1">
                  <p className="font-bold">{p.customerName}</p>
                  <p className="text-xs text-slate-400">{p.customerEmail} • {p.description}</p>
                  <p className="text-xs text-slate-500 mt-1">{p.invoiceNumber} • {new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-lg">₦{p.amount.toLocaleString()}</p>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${statusColors[p.status] || ''}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add tab to enterprise dashboard**

In `src/routes/enterprise/dashboard.tsx`, add the new tab to the `tabs` array (after `'wallet'`):

```typescript
const tabs = [
  // ... existing tabs ...
  { id: 'wallet', icon: '💰', label: 'My Wallet' },
  { id: 'client_payments', icon: '💳', label: 'Client Payments' },  // ADD THIS
]
```

Add the import at the top:

```typescript
import { ClientPaymentsTab } from '~/components/enterprise/capabilities/ClientPaymentsTab'
```

Add the tab content in the render (after the wallet tab):

```typescript
{activeTab === 'client_payments' && <ClientPaymentsTab token={token} />}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/enterprise/capabilities/ClientPaymentsTab.tsx src/routes/enterprise/dashboard.tsx
git commit -m "feat: enterprise client payments dashboard UI"
```

---

### Task 6: Create Admin Read-Only View

**Covers:** [S6]

**Files:**
- Create: `src/components/admin/EnterprisePaymentsReadOnly.tsx`
- Modify: `src/routes/admin/dashboard.tsx`

- [ ] **Step 1: Create admin read-only component**

Create `src/components/admin/EnterprisePaymentsReadOnly.tsx`:

```tsx
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export function EnterprisePaymentsReadOnly({ adminToken }: { adminToken: string }) {
  const payments = useQuery(
    api.enterprise_client_payments.adminListAllEnterprisePayments,
    adminToken ? { adminToken, limit: 100 } : 'skip'
  ) || []

  const statusColors: Record<string, string> = {
    completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    pending: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    failed: 'text-red-400 bg-red-500/10 border-red-500/20',
    refunded: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  }

  const totalCollected = payments.filter((p: any) => p.status === 'completed').reduce((sum: number, p: any) => sum + p.amount, 0)
  const totalPending = payments.filter((p: any) => p.status === 'pending').reduce((sum: number, p: any) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Enterprise Client Payments</h2>
        <p className="text-sm text-slate-400 mt-1">Read-only view of all enterprise payment transactions</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Total Collected</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">₦{totalCollected.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Pending</p>
          <p className="text-2xl font-black text-orange-400 mt-1">₦{totalPending.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Total Transactions</p>
          <p className="text-2xl font-black text-white mt-1">{payments.length}</p>
        </div>
      </div>

      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-sm font-bold">
        🔒 Read-only mode — You can view enterprise transactions but cannot modify them
      </div>

      {payments.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <p className="text-4xl mb-2">📊</p>
          <p className="font-bold">No enterprise payments yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((p: any) => (
            <div key={p._id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex-1">
                <p className="font-bold">{p.orgName}</p>
                <p className="text-xs text-slate-400">{p.customerName} • {p.customerEmail}</p>
                <p className="text-xs text-slate-500 mt-1">{p.invoiceNumber} • {p.gateway} • {new Date(p.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-lg">₦{p.amount.toLocaleString()}</p>
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${statusColors[p.status] || ''}`}>
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add to admin dashboard**

In `src/routes/admin/dashboard.tsx`, add the new tab and import. Find where tabs are defined and add:

```typescript
// Add import at top
import { EnterprisePaymentsReadOnly } from '~/components/admin/EnterprisePaymentsReadOnly'

// Add tab content in the render (where other tabs are rendered)
{activeTab === "enterprise_payments" && <EnterprisePaymentsReadOnly adminToken={adminToken} />}
```

Add a button/tab in the admin sidebar for "Enterprise Payments" with a read-only icon.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/EnterprisePaymentsReadOnly.tsx src/routes/admin/dashboard.tsx
git commit -m "feat: admin read-only view for enterprise client payments"
```

---

### Task 7: Run Tests and Verify

**Covers:** [S8]

- [ ] **Step 1: Run all tests**

```bash
npx vitest run convex/enterprise_client_payments.test.ts convex/social.test.ts convex/autoPosting.test.ts
```

Expected: All new tests pass. Pre-existing failures remain unchanged.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit final state**

```bash
git add -A
git commit -m "chore: verify enterprise payments and social engine fixes pass tests"
```
