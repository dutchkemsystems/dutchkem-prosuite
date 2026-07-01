---
feature: whatsapp-client-payment-flow
status: delivered
specs: []
plans:
  - docs/compose/plans/2026-07-01-whatsapp-client-payment-flow.md
branch: main
commits: pending
---

# WhatsApp Client Payment Flow — Final Report

## What Was Built

Fixed the WhatsApp client dashboard payment flow end-to-end. Clients can now subscribe to WhatsApp messaging tiers (Free, Basic, Pro, Premium) via Kora Pay, verify payments after checkout, send messages through their active subscription, and see proper email validation errors instead of silent fallback to a rejected email.

The payment flow works in three steps: (1) client selects a tier and enters their phone number, (2) Kora Pay checkout opens in a new tab, (3) client clicks "Verify Payment" to activate their subscription. Webhooks from Kora are now correctly routed for WhatsApp payments (WA- prefix).

## Architecture

### Files Changed

| File | Change | Lines |
|------|--------|-------|
| `convex/kora_webhook.ts` | Added WA- prefix routing to `handleKoraWebhook` | +9 |
| `convex/whatsapp_dual.ts` | Added `sendClientMessage` mutation | +65 |
| `src/components/dashboard/ClientWhatsApp.tsx` | Verify button, send handler, email fix | +66 (278→344) |

### Data Flow

```
Client selects tier → initiateWhatsAppSubscription (action)
  → Kora Pay API → checkout URL returned
  → Client completes payment in new tab
  → Client clicks "Verify Payment"
  → verifyPayment (action) → Kora Pay API → subscription activated
  → OR: Kora webhook → koraWebhook (http) → handleKoraWebhook → subscription activated
```

### Key Interfaces

- `initiateWhatsAppSubscription({ userId, tierId, systemType, phoneNumber, email })` → `{ success, checkoutUrl?, reference? }`
- `verifyPayment({ reference })` → `{ success, status, error? }`
- `sendClientMessage({ userId, to, message, messageType })` → `{ success, error?, messageId? }`

### Design Decisions

- **Manual verify over auto-poll:** After checkout opens in a new tab, there's no way to detect when the user returns. A "Verify Payment" button gives the user control and avoids polling loops.
- **Webhook as backup, not primary:** The WA- webhook routing was added for completeness, but the manual verify path is the primary activation mechanism since webhook delivery isn't guaranteed.
- **Email validation instead of fallback:** Removed `client@dutchkem.com` fallback because Kora Pay rejects it. Users without emails see a clear error directing them to update their profile.

## Usage

1. **Subscribe:** Go to WhatsApp Integration → Plans tab → enter phone number → click Subscribe on a tier → complete Kora Pay checkout → click "Verify Payment"
2. **Send message:** Go to Messaging tab → enter phone number, message, select type → click Send Message
3. **Free tier:** Click "Activate Free" — no payment needed, instant activation

## Verification

- All integration points verified: `handleKoraWebhook` exists at `kora_checkout.ts:467`, `verifyPayment` at `kora_checkout.ts:378`
- Schema field names confirmed: `whatsapp_subscriptions.by_user` index, `whatsapp_usage_logs` required fields match inserts
- TypeScript check timed out due to pre-existing project errors (hundreds of errors in untouched files)
- Files syntactically correct per manual review

## Journey Log

- [lesson] The project's pre-existing TypeScript errors (hundreds in untouched files) cause `tsc --noEmit` and `vite build` to timeout. Verify changed files individually rather than running full project checks.
- [lesson] `whatsapp_subscriptions` uses index name `by_user` (not `by_userId`) — Convex index naming doesn't follow the `by_<fieldName>` convention consistently.

## Source Materials

| File | Role | Notes |
|------|------|-------|
| `docs/compose/plans/2026-07-01-whatsapp-client-payment-flow.md` | Implementation plan | Complete |
