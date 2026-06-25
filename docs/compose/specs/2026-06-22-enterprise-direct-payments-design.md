# Enterprise Direct Payment Feature — Design Spec

> **Status:** Approved
> **Date:** 2026-06-22

## [S1] Problem

Enterprise companies currently **cannot** receive payments from their own customers. The `enterprise_org_payment_configs` table stores gateway keys but no code uses them. The `enterprise_org_transactions` table exists but is dead code. Admin has full read-write access to everything — no read-only mode exists for enterprise payment data.

## [S2] Solution Overview

Build a payment collection system where enterprise companies can:
1. Create invoices for their customers
2. Collect payments via multiple gateways (Kora Pay, Stripe, Flutterwave)
3. View their transaction history
4. Request payouts to their bank accounts

Admin sees all enterprise payment transactions in **read-only** mode. Enterprise has full autonomy.

## [S3] Database Schema

### New Table: `enterprise_client_payments`

```typescript
enterprise_client_payments: defineTable({
  orgId: v.id("enterprise_organizations"),
  companyId: v.optional(v.string()),
  customerName: v.string(),
  customerEmail: v.string(),
  amount: v.number(),
  currency: v.string(), // "NGN", "USD"
  description: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("refunded")
  ),
  gateway: v.string(), // "kora", "stripe", "flutterwave"
  gatewayReference: v.optional(v.string()),
  invoiceNumber: v.optional(v.string()),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_org", ["orgId"])
  .index("by_status", ["status"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_gateway_ref", ["gatewayReference"])
```

### New Table: `enterprise_org_bank_accounts`

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
  .index("by_org", ["orgId"])
```

## [S4] Payment Flow

1. **Enterprise creates invoice**: Calls `createClientInvoice` mutation with customer details, amount, description
2. **System initializes payment**: Calls the appropriate gateway API using the org's stored API keys from `enterprise_org_payment_configs`
3. **Customer pays**: Redirected to gateway checkout or pays via embedded form
4. **Webhook confirms**: Gateway calls back, system marks payment as "completed"
5. **Enterprise sees transaction**: In their dashboard under "Client Payments"
6. **Admin sees read-only**: In admin dashboard, all enterprise client payments visible but cannot modify

## [S5] Gateway Integration

Wire the existing `enterprise_org_payment_configs` table (which stores `gateway`, `apiKey`, `secretKey`, `webhookSecret` per org) to actual payment processing:

- **Kora Pay**: Use org's `secretKey` to call `/merchant/api/v1/charges/initialize`
- **Stripe**: Use org's `apiKey` to create Checkout Sessions
- **Flutterwave**: Use org's `secretKey` to initialize transactions

Each org configures their own gateway. The system looks up the org's config before processing.

## [S6] API Endpoints

### Mutations (Enterprise-only)
- `createClientInvoice` — Create an invoice and initialize payment
- `confirmClientPayment` — Internal: called by webhook to mark payment complete
- `requestOrgPayout` — Enterprise requests withdrawal to bank account

### Queries
- `listClientPayments` — Enterprise: list their payments (org-scoped)
- `getClientPaymentStats` — Enterprise: stats for their payments
- `adminListAllEnterprisePayments` — Admin: read-only view of ALL enterprise payments across ALL orgs
- `getOrgBankAccounts` — Enterprise: list their bank accounts

### Admin Read-Only
- `adminListAllEnterprisePayments` — Returns all payments with org name, no mutation access
- No admin mutation for creating/editing/deleting enterprise client payments

## [S7] UI Components

### Enterprise Dashboard
- New tab: "Client Payments" in the enterprise dashboard sidebar
- Shows: invoice creation form, payment history, stats (total collected, pending, failed)
- Bank account management section

### Admin Dashboard
- New section in admin panel: "Enterprise Payments" (read-only)
- Shows: all enterprise payments across all orgs, filterable by org
- No edit/delete actions — purely observational

## [S8] Testing Strategy

- Unit tests for payment creation, webhook handling, gateway initialization
- Integration tests for the full flow: create invoice → simulate payment → verify status
- Admin read-only verification: admin queries return data but admin cannot mutate enterprise payments
- Gateway mocking: test each gateway path without real API calls

## [S9] Non-Goals (YAGNI)

- No revenue sharing/platform fees (can be added later)
- No automated payout disbursement (enterprise requests, admin approves — same as existing client_payouts)
- No invoice PDF generation (can be added later)
- No multi-currency conversion (each payment is in a single currency)
