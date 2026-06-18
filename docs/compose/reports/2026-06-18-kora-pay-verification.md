# Kora Pay Integration Verification Report

**Date:** 2026-06-18
**Status:** ⚠️ CRITICAL ISSUES FOUND

---

## Summary

| Section | Status | Notes |
|---------|--------|-------|
| Configuration | ⚠️ Partial | Live keys exposed, webhook secret missing |
| Admin Dashboard | ✅ Working | Payment monitor, receipts, payouts |
| Enterprise Portal | ✅ Working | Agentic payments, subscriptions |
| Client Dashboard | ✅ Working | Checkout redirect flow |
| Webhook Integration | ❌ Broken | Two endpoints, missing webhook secret |
| Auto-Renewal | ❌ Broken | Uses checkout URL instead of direct charge |
| Payouts | ❌ Broken | Simulated, not real Kora calls |
| Bulk Payouts | ❌ Bug | Only sends to first recipient |

---

## Critical Issues Found

### 1. Missing Webhook Secret
**File:** `convex/kora_webhook.ts:14`
**Issue:** `KORA_WEBHOOK_SECRET` not configured in production
**Impact:** Webhook signature verification fails silently

### 2. Dual Webhook Endpoints
**Files:** `convex/http.ts:194` and `convex/http.ts:459`
**Issue:** Two competing endpoints (`/api/webhooks/kora` and `/kora-webhook`)
**Impact:** Only one can be registered in Kora dashboard

### 3. Simulated Daily Sweep
**File:** `convex/payouts.ts:69`
**Issue:** `executeSecurePayout` doesn't call real Kora API
**Impact:** Daily sweeps don't move money

### 4. Bulk Payout Bug
**File:** `convex/admin_payouts.ts:267`
**Issue:** Only sends to first recipient's bank account
**Impact:** Other recipients get nothing

### 5. Hardcoded Customer Email
**File:** `convex/kdp_subscriptions.ts:177`
**Issue:** Uses `client@dutchkem.com` instead of actual user email
**Impact:** Kora checkout shows wrong customer

### 6. Auto-Renewal Uses Checkout URL
**File:** `convex/payments.ts:337`
**Issue:** Uses `charges/initialize` (requires user interaction)
**Impact:** Auto-renewals can't work without user present
