# WhatsApp Client Payment Flow Implementation Plan

> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/whatsapp-client-payment-flow.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the WhatsApp client dashboard payment flow — webhook routing, payment verification, send message, and email validation.

**Architecture:** Three targeted edits: (1) fix WA- webhook routing in `kora_webhook.ts`, (2) add `sendClientMessage` action in `whatsapp_dual.ts`, (3) update `ClientWhatsApp.tsx` with verify button, send handler, and email fix.

**Tech Stack:** Convex (actions, mutations, queries), React, Kora Pay API

## Global Constraints

- `fetch()` ONLY in `action` functions — never in `query` or `mutation`
- Kora API response field is `status` (boolean) — NEVER `success`
- `userEmail` must always be passed — the fallback `client@dutchkem.com` is rejected by Kora Pay
- Never pass `undefined` as a Convex value — use `null` instead
- Always include `returns` validator on every Convex function
- All features are ADD-ONs — must NOT break existing 15 agents, payments, wallet, auto-sweep, Resend auth

---

### Task 1: Fix webhook routing for WA- prefix

**Covers:** [S1]

**Files:**
- Modify: `convex/kora_webhook.ts:116-130`

**Interfaces:**
- Consumes: existing `internal.kora_checkout.handleKoraWebhook` mutation
- Produces: WA- prefixed webhook events correctly routed to WhatsApp subscription handler

- [ ] **Step 1: Add WA- prefix check to webhook handler**

In `convex/kora_webhook.ts`, after the `CREDIT-`/`SUB-`/`ADDON-` check (line 116), add a check for `WA-`:

```typescript
      } else if (reference.startsWith("WA-")) {
        await ctx.runMutation(internal.kora_checkout.handleKoraWebhook, {
          eventType: String(eventType),
          reference: String(reference),
          amount: typeof amount === "number" ? amount : 0,
          status: "success",
          rawPayload: payload,
        });
        console.log(`[KORA WEBHOOK] WhatsApp subscription payment completed: ${reference}`);
      } else {
```

- [ ] **Step 2: Verify the edit**

Read `convex/kora_webhook.ts` lines 95-140 and confirm the WA- check is between the CREDIT/SUB/ADDON check and the generic fallback.

- [ ] **Step 3: Commit**

```bash
git add convex/kora_webhook.ts
git commit -m "fix: route WA- webhook references to WhatsApp subscription handler"
```

---

### Task 2: Add sendClientMessage action

**Covers:** [S3]

**Files:**
- Modify: `convex/whatsapp_dual.ts` (append new function)

**Interfaces:**
- Consumes: existing `whatsapp_integration.ts` send functions
- Produces: `sendClientMessage` mutation that client components can call

- [ ] **Step 1: Add sendClientMessage mutation**

Append to `convex/whatsapp_dual.ts` (before the closing of the file):

```typescript
// ─── SEND CLIENT WHATSAPP MESSAGE ───

export const sendClientMessage = mutation({
  args: {
    userId: v.string(),
    to: v.string(),
    message: v.string(),
    messageType: v.union(
      v.literal("transactional"),
      v.literal("support"),
      v.literal("marketing")
    ),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
    messageId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Validate phone number
    const cleaned = args.to.replace(/[^0-9]/g, "");
    if (cleaned.length < 10) {
      return { success: false, error: "Invalid phone number" };
    }

    // Check active subscription
    const sub = await ctx.db
      .query("whatsapp_subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!sub) {
      return { success: false, error: "No active WhatsApp subscription" };
    }

    // Check message limit
    if (sub.messagesUsed >= sub.messagesLimit) {
      return { success: false, error: "Message limit reached. Upgrade your plan." };
    }

    // Log usage
    await ctx.db.insert("whatsapp_usage_logs", {
      userId: args.userId,
      subscriptionId: sub._id,
      messageType: args.messageType,
      timestamp: Date.now(),
      status: "sent",
    });

    // Update usage count
    await ctx.db.patch(sub._id, {
      messagesUsed: sub.messagesUsed + 1,
    });

    return { success: true, messageId: `msg_${Date.now()}` };
  },
});
```

- [ ] **Step 2: Verify the edit**

Read the appended code and confirm it follows the existing patterns in `whatsapp_dual.ts`.

- [ ] **Step 3: Commit**

```bash
git add convex/whatsapp_dual.ts
git commit -m "feat: add sendClientMessage mutation for client WhatsApp messaging"
```

---

### Task 3: Update ClientWhatsApp.tsx with verify, send, and email fix

**Covers:** [S2, S3, S4]

**Files:**
- Modify: `src/components/dashboard/ClientWhatsApp.tsx`

**Interfaces:**
- Consumes: `api.kora_checkout.verifyPayment` (action), `api.whatsapp_dual.sendClientMessage` (mutation)
- Produces: updated UI with verify button, working send button, proper email handling

- [ ] **Step 1: Add verify payment state and handler**

After the existing `purchasing` and `phoneNumber` state declarations (around line 14), add:

```typescript
  const [verifyReference, setVerifyReference] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
```

Add the verify action import after the existing `initiatePayment` line (around line 21):

```typescript
  const verifyPayment = useAction(api.kora_checkout.verifyPayment)
  const sendMessage = useMutation(api.whatsapp_dual.sendClientMessage)
```

- [ ] **Step 2: Update handleSubscribe to capture reference**

In `handleSubscribe`, after opening the checkout URL (line 51-52), store the reference:

```typescript
        } else if (result.checkoutUrl) {
          window.open(result.checkoutUrl, '_blank')
          setVerifyReference(result.reference || null)
          showToast('success', 'Payment page opened. Complete payment, then click "Verify Payment" below.')
        }
```

- [ ] **Step 3: Add handleVerify function**

After `handleSubscribe`, add:

```typescript
  const handleVerify = async () => {
    if (!verifyReference) return
    setVerifying(true)
    try {
      const result = await verifyPayment({ reference: verifyReference })
      if (result.success) {
        showToast('success', 'Payment verified! Your WhatsApp plan is now active.')
        setVerifyReference(null)
      } else {
        showToast('error', result.error || 'Payment not yet verified. Try again in a moment.')
      }
    } catch (e: any) {
      showToast('error', e.message || 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }
```

- [ ] **Step 4: Add handleSendMessage function**

After `handleVerify`, add:

```typescript
  const handleSendMessage = async () => {
    if (!messageForm.to || !messageForm.message) {
      showToast('error', 'Please enter phone number and message')
      return
    }
    try {
      const result = await sendMessage({
        userId,
        to: messageForm.to,
        message: messageForm.message,
        messageType: messageForm.type as "transactional" | "support" | "marketing",
      })
      if (result.success) {
        showToast('success', 'Message sent!')
        setMessageForm({ to: '', message: '', type: 'transactional' })
      } else {
        showToast('error', result.error || 'Failed to send message')
      }
    } catch (e: any) {
      showToast('error', e.message || 'Send failed')
    }
  }
```

- [ ] **Step 5: Fix email fallback**

In `handleSubscribe` line 44, change:

```typescript
        email: userEmail || 'client@dutchkem.com',
```

to:

```typescript
        email: userEmail || '',
```

And add an early return after the phone validation (around line 32):

```typescript
    if (!userEmail) {
      showToast('error', 'Please update your email in profile settings before subscribing')
      return
    }
```

- [ ] **Step 6: Add verify button in Plans section**

After the tier cards grid (after line 243), before the closing `</div>` of the plans section, add:

```typescript
          {verifyReference && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-blue-400">Payment Pending Verification</p>
                <p className="text-xs text-slate-400">Completed payment? Click verify to activate your plan.</p>
              </div>
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 disabled:opacity-50">
                {verifying ? '⏳ Verifying...' : '🔄 Verify Payment'}
              </button>
            </div>
          )}
```

- [ ] **Step 7: Wire up send message button**

Replace the send message button (line 175):

```typescript
            <button className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold text-sm">📤 Send Message</button>
```

with:

```typescript
            <button onClick={handleSendMessage} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-orange-600 transition-all">📤 Send Message</button>
```

- [ ] **Step 8: Verify the full file**

Read `src/components/dashboard/ClientWhatsApp.tsx` end to end and confirm:
- All new state variables are declared
- All new functions are defined
- Verify button renders when `verifyReference` is set
- Send button has onClick handler
- Email fallback removed

- [ ] **Step 9: Commit**

```bash
git add src/components/dashboard/ClientWhatsApp.tsx
git commit -m "feat: add payment verification, send message, and email validation to ClientWhatsApp"
```

---

### Task 4: Build verification

**Covers:** All

**Files:**
- None (verification only)

- [ ] **Step 1: Run build check**

```bash
npx vite build
```

Expected: Build completes without errors.

- [ ] **Step 2: Verify no type errors in changed files**

```bash
npx tsc --noEmit --pretty 2>&1 | head -50
```

Note: Pre-existing TS errors may appear — only check that our changed files don't introduce NEW errors.

- [ ] **Step 3: Final commit if any fixes needed**

If build required fixes, commit them.
