# ═══════════════════════════════════════════════════════════════════
# DUTCHKEM VENTURES — SUBSCRIPTION SYSTEM IMPLEMENTATION GUIDE
# Complete specification for backend/frontend engineers
# ═══════════════════════════════════════════════════════════════════

## 1. IMPLEMENTATION CHECKLIST (1-Page Summary)

### Backend (Priority Order)
- [ ] Add subscription fields to User schema in MongoDB
- [ ] Create Kora Pay plans for each tier (see Section 4)
- [ ] Build POST /api/subscriptions/create endpoint
- [ ] Build GET /api/subscriptions/active endpoint
- [ ] Build POST /api/subscriptions/cancel endpoint
- [ ] Build POST /api/subscriptions/pause endpoint
- [ ] Build POST /api/subscriptions/upgrade endpoint
- [ ] Build POST /api/subscriptions/renew (cron job)
- [ ] Set up Kora Pay webhook at /api/payments/webhook
- [ ] Add subscription check middleware to all agent routes
- [ ] Create daily cron: renewal processor
- [ ] Create daily cron: renewal reminder emails (7 days before)
- [ ] Create daily cron: failed payment retry (3 days grace)
- [ ] Build referral code generation and tracking
- [ ] Build discount calculation engine

### Frontend (Priority Order)
- [ ] Add SubscriptionBanner to Dashboard (shows active plan)
- [ ] Create SubscriptionPlans page (all tiers with pricing)
- [ ] Create BundleBuilder component (select agents, see price)
- [ ] Add PaymentModal (Kora Pay checkout)
- [ ] Add UpgradePrompt (when user hits limit)
- [ ] Add SubscriptionHistory table
- [ ] Add CancelFlow with retention offer
- [ ] Add ReferralDashboard (share link, see rewards)
- [ ] Update each agent chat to show "Subscribed ✅" or "Pay per use"

### Testing
- [ ] Test subscription creation with Kora Pay test keys
- [ ] Test auto-renewal cron
- [ ] Test failed payment → retry → cancel flow
- [ ] Test upgrade proration math
- [ ] Test discount stacking rules
- [ ] Test referral credit distribution

---

## 2. DATABASE SCHEMA (Text Diagram)

```
┌─────────────────────────────────────────────────────────────┐
│                    USERS COLLECTION                          │
├─────────────────────────────────────────────────────────────┤
│ _id                    ObjectId                             │
│ phone                  String (primary identifier)          │
│ name                   String                               │
│ email                  String (optional)                     │
│ createdAt              Date                                 │
│ lastLogin              Date                                 │
│ loginCount             Number                               │
│ deviceFingerprint      String                               │
│ blocked                Boolean                              │
│                                                             │
│ ┌─── subscription ──────────────────────────────────────┐   │
│ │ plan                 String (free/student/pro/enterprise)│  │
│ │ tier                 String (weekly/monthly/quarterly/   │  │
│ │                              bimonthly/yearly)           │  │
│ │ status               String (active/paused/cancelled/   │  │
│ │                              expired/trial)              │  │
│ │ agents               [String] (agent IDs included)      │  │
│ │ bundleName           String (if bundle)                  │  │
│ │ startDate            Date                                │  │
│ │ endDate              Date                                │  │
│ │ nextBillingDate      Date                                │  │
│ │ autoRenew            Boolean                             │  │
│ │ pricePaid            Number (₦)                          │  │
│ │ discountApplied      Number (%)                          │  │
│ │ discountReason       String                              │  │
│ │ creditsPerPeriod     Number                              │  │
│ │ creditsUsed          Number                              │  │
│ │ koraSubscriptionId   String                              │  │
│ │ pausedAt             Date (null if not paused)           │  │
│ │ pauseResumeDate      Date                                │  │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ credits                Number (pay-per-use balance)          │
│ referralCode           String (unique 8-char code)          │
│ referredBy             String (referrer's code)             │
│ referralCredits        Number (earned from referrals)       │
│ referralCount          Number                               │
│                                                             │
│ subscriptionHistory    [{                                   │
│   action: String (created/upgraded/downgraded/cancelled/    │
│                    paused/resumed/renewed/failed)           │
│   fromPlan: String                                         │
│   toPlan: String                                           │
│   amount: Number                                           │
│   date: Date                                               │
│   reason: String                                           │
│ }]                                                         │
│                                                             │
│ transactions           [{                                   │
│   id: String (Kora reference)                              │
│   type: String (subscription/one-time/refund/reversal)     │
│   amount: Number                                           │
│   status: String (success/pending/failed/reversed)         │
│   agent: String                                            │
│   service: String                                          │
│   date: Date                                               │
│ }]                                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 SUBSCRIPTIONS COLLECTION                     │
├─────────────────────────────────────────────────────────────┤
│ _id                    ObjectId                             │
│ userId                 ObjectId (ref: Users)                │
│ planId                 String                               │
│ tier                   String                               │
│ agents                 [String]                             │
│ status                 String                               │
│ amount                 Number                               │
│ currency               String (NGN)                         │
│ startDate              Date                                 │
│ endDate                Date                                 │
│ nextBillingDate        Date                                 │
│ autoRenew              Boolean                              │
│ koraReference          String                               │
│ renewalAttempts        Number (0-3)                         │
│ lastRenewalAttempt     Date                                 │
│ createdAt              Date                                 │
│ updatedAt              Date                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  TRANSACTIONS COLLECTION                     │
├─────────────────────────────────────────────────────────────┤
│ _id                    ObjectId                             │
│ userId                 ObjectId                             │
│ type                   String (subscription/pay-per-use/    │
│                                refund/reversal/credit)      │
│ amount                 Number                               │
│ currency               String (NGN)                         │
│ status                 String (success/pending/failed/      │
│                                reversed)                    │
│ koraReference          String                               │
│ agentId                String                               │
│ serviceName            String                               │
│ subscriptionId         ObjectId (if subscription payment)   │
│ reversalDetected       Boolean                              │
│ reversalDate           Date                                 │
│ metadata               Object (any extra data)              │
│ createdAt              Date                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   REFERRALS COLLECTION                        │
├─────────────────────────────────────────────────────────────┤
│ _id                    ObjectId                             │
│ referrerUserId         ObjectId                             │
│ referrerCode           String                               │
│ refereeUserId          ObjectId                             │
│ refereePhone           String                               │
│ status                 String (pending/qualified/rewarded)  │
│ rewardAmount           Number (₦5,000)                     │
│ refereeDiscount        Number (10%)                         │
│ qualifiedAt            Date (after referee's 1st month)    │
│ rewardedAt             Date                                 │
│ createdAt              Date                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. SUBSCRIPTION TIERS & PRICING

### Individual Agent Subscriptions

| Tier | Duration | Price Range | Credits | Auto-Renew |
|------|----------|------------|---------|------------|
| **Weekly** | 7 days | ₦2,000 - ₦8,000 | 5 tasks | Yes |
| **Monthly** | 30 days | ₦5,000 - ₦25,000 | 20 tasks | Yes |
| **Bi-Monthly** | 60 days | ₦9,000 - ₦45,000 | 45 tasks | Yes |
| **Quarterly** | 90 days | ₦12,000 - ₦60,000 | 70 tasks | Yes |
| **Yearly** | 365 days | ₦40,000 - ₦200,000 | Unlimited | Yes |

### Per-Agent Monthly Prices

| Agent | Weekly | Monthly | Quarterly | Yearly |
|-------|--------|---------|-----------|--------|
| A1 Academic Pro | ₦5,000 | ₦15,000 | ₦38,000 | ₦120,000 |
| A2 FormatPro | ₦2,000 | ₦5,000 | ₦12,000 | ₦40,000 |
| A3 LitReview Pro | ₦3,000 | ₦8,000 | ₦20,000 | ₦65,000 |
| A4 Plagiarism Pro | ₦2,000 | ₦6,000 | ₦15,000 | ₦50,000 |
| A5 StatsPro | ₦4,000 | ₦12,000 | ₦30,000 | ₦100,000 |
| A6 Presentation Pro | ₦3,000 | ₦8,000 | ₦20,000 | ₦65,000 |
| A7 Grant Pro | ₦3,000 | ₦10,000 | ₦25,000 | ₦80,000 |
| A8 MediaStudio Pro | ₦8,000 | ₦25,000 | ₦60,000 | ₦200,000 |
| A9 DataPro | ₦5,000 | ₦15,000 | ₦38,000 | ₦120,000 |
| A10 PhoneGuard Pro | ₦2,000 | ₦5,000 | ₦12,000 | ₦40,000 |
| A11 ContentPro | ₦4,000 | ₦12,000 | ₦30,000 | ₦100,000 |
| A12 BusinessPro | ₦5,000 | ₦15,000 | ₦38,000 | ₦120,000 |
| A13 ServiceMart NG | ₦3,000 | ₦8,000 | ₦20,000 | ₦65,000 |

### Bundle Packages

| Bundle | Agents Included | Monthly | Quarterly | Yearly | Savings |
|--------|----------------|---------|-----------|--------|---------|
| **Student Bundle** | A1, A2, A4, A6, A13 | ₦20,000 | ₦50,000 | ₦160,000 | 40% off |
| **Business Bundle** | A8, A11, A12, A9 | ₦30,000 | ₦75,000 | ₦240,000 | 35% off |
| **Career Bundle** | A1, A7, A13 | ₦15,000 | ₦38,000 | ₦120,000 | 40% off |
| **Creator Bundle** | A8, A11, A3 | ₦20,000 | ₦50,000 | ₦160,000 | 35% off |
| **All-Access Pass** | ALL 13 AGENTS | ₦50,000 | ₦120,000 | ₦400,000 | 60% off |

---

## 4. KORA PAY PLAN SETUP GUIDE

Create these plans in Kora Pay dashboard (dashboard.korapay.com):

### Plan Naming Convention
Format: `DK-{AGENT_OR_BUNDLE}-{TIER}`

### Plans to Create

```
Individual Agent Plans (13 agents × 5 tiers = 65 plans):

DK-A1-WEEKLY      ₦5,000    interval: weekly
DK-A1-MONTHLY     ₦15,000   interval: monthly
DK-A1-BIMONTHLY   ₦27,000   interval: 60 days (custom)
DK-A1-QUARTERLY   ₦38,000   interval: quarterly
DK-A1-YEARLY      ₦120,000  interval: annually

... repeat for A2 through A13 ...

Bundle Plans (5 bundles × 3 tiers = 15 plans):

DK-STUDENT-BUNDLE-MONTHLY     ₦20,000   interval: monthly
DK-STUDENT-BUNDLE-QUARTERLY   ₦50,000   interval: quarterly
DK-STUDENT-BUNDLE-YEARLY      ₦160,000  interval: annually

DK-BUSINESS-BUNDLE-MONTHLY    ₦30,000   interval: monthly
DK-BUSINESS-BUNDLE-QUARTERLY  ₦75,000   interval: quarterly
DK-BUSINESS-BUNDLE-YEARLY     ₦240,000  interval: annually

DK-CAREER-BUNDLE-MONTHLY      ₦15,000   interval: monthly
DK-CAREER-BUNDLE-QUARTERLY    ₦38,000   interval: quarterly
DK-CAREER-BUNDLE-YEARLY       ₦120,000  interval: annually

DK-CREATOR-BUNDLE-MONTHLY     ₦20,000   interval: monthly
DK-CREATOR-BUNDLE-QUARTERLY   ₦50,000   interval: quarterly
DK-CREATOR-BUNDLE-YEARLY      ₦160,000  interval: annually

DK-ALLACCESS-MONTHLY          ₦50,000   interval: monthly
DK-ALLACCESS-QUARTERLY        ₦120,000  interval: quarterly
DK-ALLACCESS-YEARLY           ₦400,000  interval: annually

Total plans: 80
```

### Webhook URL
Set in Kora Pay dashboard → Settings → Webhooks:
```
https://dutchkem-api.onrender.com/api/payments/webhook
```

### Events to Listen For
- `charge.success` → Credit user, activate subscription
- `charge.failed` → Log failure, notify user, retry in 3 days
- `transfer.reversed` → REVOKE access immediately, flag account

---

## 5. NOTIFICATION TEMPLATES

### Template 1: Renewal Reminder (7 days before)
```
Subject: Your {Agent Name} subscription renews in 7 days

Hi {name},

Your {plan_name} subscription (₦{amount}/month) will auto-renew 
on {renewal_date}.

Current usage this period: {credits_used}/{credits_total} tasks

If you'd like to:
✅ Continue — no action needed
⏸️ Pause — reply PAUSE
❌ Cancel — reply CANCEL
⬆️ Upgrade — visit dutchkem.com/subscriptions

— Dutchkem Ventures AI Team
```

### Template 2: Renewal Success
```
Subject: ✅ Subscription renewed — ₦{amount}

Hi {name},

Your {plan_name} has been renewed successfully!

💳 Amount: ₦{amount}
📅 Next renewal: {next_date}
🤖 Agents included: {agent_list}
📊 Credits refreshed: {credits} tasks

Keep winning! Your agents are ready 24/7.

— Dutchkem Ventures
```

### Template 3: Payment Failed
```
Subject: ⚠️ Subscription payment failed

Hi {name},

We couldn't process your ₦{amount} payment for {plan_name}.

💳 Card ending: ****{last4}
❌ Reason: {failure_reason}

We'll retry in 3 days. To avoid service interruption:
→ Update payment method: dutchkem.com/billing
→ Or add credits: dutchkem.com/credits

Your access continues for {grace_days} more days.

— Dutchkem Ventures
```

### Template 4: Subscription Cancelled
```
Subject: Subscription cancelled — we'll miss you

Hi {name},

Your {plan_name} subscription has been cancelled.

✅ You still have access until: {end_date}
💰 No further charges will be made

Changed your mind? Resubscribe anytime:
→ dutchkem.com/subscriptions
🎁 Come back within 30 days and get 20% off!

— Dutchkem Ventures
```

### Template 5: Reversal Detected (Fraud Alert)
```
Subject: 🚨 Payment reversed — access suspended

Hi {name},

A payment reversal (chargeback) was detected on your account:

💳 Transaction: {reference}
💰 Amount: ₦{amount}
📅 Date: {date}

Your access to {agent_list} has been SUSPENDED.

To restore access:
1. Contact your bank to resolve the reversal
2. Make a new payment at dutchkem.com/billing
3. Contact support: +234 913 393 5256

— Dutchkem Ventures Security Team
```

---

## 6. DASHBOARD UI (ASCII Mockup)

### Client Dashboard — Subscription View
```
┌─────────────────────────────────────────────────────────────┐
│  📊 My Dashboard                                     🔔 👤  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🎫 ACTIVE SUBSCRIPTION                              │    │
│  │                                                     │    │
│  │  Student Bundle (Monthly)         ₦20,000/month     │    │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │    │
│  │  Agents: 🎓A1  📝A2  🔍A4  🎨A6  🚀A13            │    │
│  │  Status: ✅ Active    Auto-renew: ON                │    │
│  │  Next billing: Jan 15, 2025                         │    │
│  │  Credits used: 12/20 tasks     ████████░░ 60%       │    │
│  │                                                     │    │
│  │  [⏸️ Pause]  [⬆️ Upgrade]  [❌ Cancel]              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ ₦45,200  │  │  12/20   │  │   5      │  │  ₦2,500  │   │
│  │ Total    │  │  Tasks   │  │ Projects │  │ Referral │   │
│  │ Spent    │  │  Used    │  │ Done     │  │ Credits  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  📋 RECENT TRANSACTIONS                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Date       │ Type          │ Amount  │ Status       │    │
│  │────────────│───────────────│─────────│──────────────│    │
│  │ Jan 8      │ Subscription  │ ₦20,000 │ ✅ Success   │    │
│  │ Jan 5      │ Pay-per-use   │ ₦5,000  │ ✅ Success   │    │
│  │ Dec 8      │ Subscription  │ ₦20,000 │ ✅ Success   │    │
│  │ Nov 8      │ Subscription  │ ₦20,000 │ ✅ Success   │    │
│  └─────────────────────────────────────────────────────┘    │
│  [📥 Export CSV]  [🖨️ Print Report]                         │
│                                                             │
│  🎁 REFERRAL PROGRAM                                        │
│  Your code: DUTCH-A8X2                                      │
│  Share: dutchkem.com/ref/DUTCH-A8X2                        │
│  Earned: ₦15,000 (3 referrals)                             │
│  [📋 Copy Link]  [📱 Share on WhatsApp]                     │
└─────────────────────────────────────────────────────────────┘
```

### Admin Dashboard — Subscription Analytics
```
┌─────────────────────────────────────────────────────────────┐
│  🏛️ ADMIN DASHBOARD — Subscription Analytics        🌙 ⚙️  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ ₦2.4M    │  │   847    │  │  3.2%    │  │ ₦28,500  │   │
│  │ MRR      │  │ Active   │  │  Churn   │  │ ARPU     │   │
│  │ ↑ 18%    │  │ Subs     │  │  ↓ 0.5%  │  │ ↑ 12%    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  📊 REVENUE BY PLAN                                         │
│  All-Access  ████████████████████████████  ₦850K (35%)     │
│  Student     ██████████████████           ₦520K (22%)     │
│  Business    ███████████████              ₦440K (18%)     │
│  Pay-per-use ████████████                 ₦350K (15%)     │
│  Career      ████████                     ₦240K (10%)     │
│                                                             │
│  🔄 AUTO-PROCESSED TODAY                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ✅ 23 renewals processed automatically (₦485,000)   │    │
│  │ ⚠️  3 failed payments (retrying in 3 days)          │    │
│  │ 🚨 1 reversal detected (access revoked: user #4521)│    │
│  │ ⬆️  5 upgrades (weekly → monthly)                   │    │
│  │ ❌ 2 cancellations                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [📥 Export All Transactions]  [🖨️ Print Revenue Report]    │
│  [📊 Generate Monthly Report]  [📧 Send Digest to Email]    │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. REVERSAL DETECTION LOGIC

When Kora Pay sends a `transfer.reversed` webhook:

```
1. IMMEDIATELY revoke all agent access for that user
2. Set user.subscription.status = 'suspended'
3. Log to audit trail with timestamp and transaction reference
4. Send SMS to user: "Payment reversed. Access suspended."
5. Send notification to admin dashboard (high priority alert)
6. Flag account for review (user.flagged = true)
7. If user tries to access any agent: show "Payment issue" screen
8. To restore: user must make a NEW payment (not dispute the reversal)
9. After 3 reversals: permanently ban the account
```

---

## 8. AGENT BEHAVIOR MODIFICATION

### Before Payment (current)
```
User: "Write my thesis introduction"
Agent: "Sure! Here's what I can do... [shows pricing]... 
       Please pay to proceed."
```

### After Payment Auto-Confirms (new)
```
User: "Write my thesis introduction"
System: [checks subscription status]
  → If SUBSCRIBED: Agent immediately starts working
  → If NOT SUBSCRIBED: Agent shows pricing + "Pay Now" button
  → If PAYMENT PROCESSING: "Your payment is being confirmed..."
  → If REVERSED: "Your account has a payment issue. Contact support."
```

### Human Tone Instructions (added to ALL agent system prompts)
```
TONE RULES:
- Write like a knowledgeable Nigerian friend, not a robot
- Use "I" not "the system" — personalize everything
- Show empathy: "I understand this is stressful..."
- Be encouraging: "You're making a smart choice..."
- Use Nigerian context where appropriate
- NEVER say "As an AI language model..."
- NEVER be condescending or overly formal
- If the client is frustrated, acknowledge it first
- End with clear next steps, never leave them hanging
- Use emoji sparingly (2-3 per message max)
```

---

## 9. DISCOUNT CALCULATION ENGINE

### Priority Order (highest discount wins, no stacking)
```
1. Seasonal Promotion (if active)     → 20-30% off
2. Early Bird (first 7 days)          → 15% off yearly
3. Loyalty (12+ months continuous)    → 15-25% off
4. Bulk Bundle (6+ agents)            → 30-40% off
5. Referral (friend's code used)      → 10% off first month
6. Comeback (cancelled, returning)    → 20% off 3 months
```

### Seasonal Calendar
```
January    → "New Year, New You"     → 20% off all yearly plans
March      → "Women's Month"         → 15% off Career Bundle
May        → "Exam Season"           → 30% off Student Bundle
June       → "Mid-Year Reset"        → 20% off Business Bundle
September  → "Back to School"        → 25% off Student + Career
October    → "Japa Season"           → 20% off All-Access
December   → "End of Year Blowout"   → 25% off everything
```

---

## 10. ADMIN EXPORT & REPORTING

### Reports the Admin Can Generate

| Report | Data Included | Format |
|--------|--------------|--------|
| **Daily Revenue** | All transactions, grouped by agent | CSV, PDF |
| **Monthly Summary** | MRR, new subs, cancellations, upgrades | PDF |
| **Agent Performance** | Usage per agent, revenue per agent | CSV |
| **Client History** | Full transaction + usage history per user | PDF |
| **Churn Analysis** | Why users cancelled, retention rates | CSV |
| **Referral Report** | Active referrers, rewards distributed | CSV |
| **Failed Payments** | All failed charges with retry status | CSV |
| **Reversal Log** | All detected reversals with user info | PDF |

### Export Buttons (add to Admin Dashboard)
- 📥 Export CSV — downloads data as spreadsheet
- 🖨️ Print Report — formats for A4 printing
- 📧 Email Report — sends PDF to admin email
- 📊 Dashboard PDF — screenshot-style full dashboard export

---

## 11. ADDITIONAL FEATURES

### For Agents
- **Smart Pricing**: If user asks about pricing, agent checks their subscription and shows personalized pricing (subscribed services show "Included ✅")
- **Usage Alerts**: When user hits 80% of credits, agent warns "You have 4 tasks remaining this period"
- **Upgrade Suggestions**: When user hits limit, agent suggests upgrade with prorated pricing
- **Cross-Agent Referral**: If A1 can't do something, it recommends the right agent AND checks if user has access

### For Admin
- **Revenue Forecasting**: Based on current MRR and growth rate, project next 3/6/12 months
- **Churn Prediction**: Flag users who haven't used their subscription in 14+ days
- **Auto-Engagement**: Send "We miss you!" message to inactive subscribers
- **Bulk Operations**: Admin can gift credits, extend subscriptions, apply discounts to multiple users
- **Live Transaction Feed**: Real-time scrolling list of all payments as they come in
- **Fraud Score**: Each user gets a risk score based on reversal history, login patterns, usage patterns

### For Users
- **Subscription Calculator**: "Which plan saves me the most?" interactive tool
- **Usage Dashboard**: Visual chart showing which agents they use most
- **Receipt History**: Download receipts for any transaction (for tax/expense purposes)
- **Pause & Resume**: Pause subscription for up to 30 days without losing position
- **Gift Subscriptions**: Buy a subscription as a gift for someone else
- **Student Verification**: Upload student ID for additional 15% student discount
