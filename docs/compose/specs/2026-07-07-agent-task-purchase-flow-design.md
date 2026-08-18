# Agent Task Purchase Flow — Design Spec

> **Goal:** Enable clients to chat with agents, purchase deliverables via Kora Pay, and access generated tasks in the dashboard.

## [S1] Problem

Clients can chat with agents via the support orchestrator, but there is no way to purchase deliverables or get assigned tasks. The flow from chat → login → payment → deliverable access does not exist. The 15 agents in the orchestrator are purely conversational — they cannot produce ordered deliverables.

## [S2] Solution Overview

Extend the existing `CustomerSupportChat` + orchestrator with:
1. Per-agent hardcoded packages (prices, deliverable descriptions)
2. Pre-login chat with login prompt after agent satisfies the client
3. URL-based agent context preserved across login (`/dashboard?agent=A2`)
4. Post-login auto-popup of the agent with package selection
5. Payment via existing Kora Pay integration
6. Deliverable generation after payment
7. "My Tasks" dashboard section for deliverable access

## [S3] Per-Agent Packages (Hardcoded)

Each agent gets a `AGENT_PACKAGES` constant with 2-3 tiers:

```typescript
const AGENT_PACKAGES: Record<string, Array<{
  id: string;
  name: string;
  description: string;
  price: number;       // in NGN kobo (price * 100)
  deliverable: string; // type identifier
}>> = {
  A2: [ // Business Pro
    { id: "bp-basic", name: "Business Plan Basic", description: "Standard business plan", price: 500000, deliverable: "business_plan" },
    { id: "bp-pro", name: "Business Plan + Strategy", description: "Full plan with market analysis", price: 1500000, deliverable: "business_plan_strategy" },
  ],
  A4: [ // Career Pro
    { id: "cv-basic", name: "CV Writing", description: "Professional CV", price: 300000, deliverable: "cv" },
    { id: "cv-pro", name: "CV + Cover Letter + LinkedIn", description: "Full career package", price: 800000, deliverable: "career_package" },
  ],
  // ... all 15 agents
}
```

Location: `convex/agent_packages.ts` (exported constant).

## [S4] Pre-Login Flow

1. Client chats with agent via `CustomerSupportChat` (already works — userId defaults to "anonymous")
2. Agent answers questions helpfully using the orchestrator
3. After the conversation reaches a natural point, the orchestrator's response includes a structured login prompt with a styled button
4. Button links to `/auth?redirect=/dashboard?agent={agentId}`
5. Agent's last messages saved to `localStorage` for context restoration

Implementation:
- Add `LOGIN_PROMPT_THRESHOLD` constant (e.g., after 3 agent responses)
- Modify `processMessage` action to include `shouldPromptLogin: boolean` in return when threshold is reached and agent detects a paid service opportunity
- Frontend detects `shouldPromptLogin` and renders a styled login CTA button in the chat

## [S5] Post-Login Auto-Popup

1. Dashboard reads `agent` URL param on mount (`new URLSearchParams(window.location.search).get("agent")`)
2. If present and valid agent ID, auto-opens `CustomerSupportChat` pre-routed to that agent
3. URL param cleared after use: `window.history.replaceState({}, "", "/dashboard")`

Implementation:
- Modify `src/routes/dashboard.tsx` to read URL param on mount
- Pass `agentId` to `CustomerSupportChat` component
- Set `showOrchestrator` state to true when agent param detected

## [S6] Package Selection UI

When chat opens post-login:
1. Agent's first message presents available packages as inline cards
2. Each card shows: name, description, price (formatted as "5,000 NGN"), "Select" button
3. Client selects a package → triggers Kora Pay checkout

Implementation:
- New component: `PackageSelectionCards` rendered inside `CustomerSupportChat`
- Triggered when `agentId` is set AND user is authenticated AND no active subscription for that agent
- Cards styled consistent with existing UI (orange/slate theme)

## [S7] Payment Flow

1. New mutation: `initiateAgentPackagePurchase` in `convex/agent_packages.ts`
   - Creates pending transaction in `kora_pending_transactions`
   - Type: `agent_package`
   - Reference prefix: `PKG-`
2. Opens Kora Pay checkout URL in new tab
3. After payment callback (`/payment/callback`), verifies via `verifyPayment`
4. Creates `client_tasks` record linking client, agent, package, deliverable status

Implementation:
- Reuse existing `kora_checkout.ts` patterns for Kora API call
- Add `agent_package` case to `handleKoraWebhook`
- Payment callback route updated to handle `PKG-` references

## [S8] Deliverable Generation

1. After payment verification, a mutation `generateDeliverable` is called
2. Uses NVIDIA NIM to generate the deliverable content based on agent type and package
3. Stored in `client_tasks` table with: content, status (pending → delivered), timestamps
4. Client sees it in "My Tasks" dashboard section

Implementation:
- New mutation: `generateDeliverable` in `convex/agent_packages.ts`
- Calls NVIDIA NIM with agent-specific prompt + client's original request context
- Updates `client_tasks.status` to "delivered" with content

## [S9] My Tasks Section

New dashboard tab showing all purchased deliverables:
- Agent name/icon, package name, purchase date
- Status: pending (processing) → delivered (ready)
- Deliverable content displayed inline with copy/download buttons

Implementation:
- New component: `MyTasks` in `src/components/dashboard/MyTasks.tsx`
- New query: `getClientTasks` in `convex/agent_packages.ts`
- Add tab to dashboard tabs array

## [S10] New Database Tables

### `client_tasks`
```typescript
client_tasks: defineTable({
  userId: v.id("users"),
  agentId: v.string(),
  packageName: v.string(),
  packageId: v.string(),
  deliverable: v.string(),        // type: "business_plan", "cv", etc.
  status: v.union(v.literal("pending"), v.literal("generating"), v.literal("delivered"), v.literal("failed")),
  content: v.optional(v.string()), // generated deliverable text
  paymentReference: v.string(),
  amount: v.number(),             // in kobo
  createdAt: v.number(),
  deliveredAt: v.optional(v.number()),
}).index("by_user", ["userId"])
  .index("by_user_status", ["userId", "status"])
  .index("by_payment_ref", ["paymentReference"])
```

## [S11] File Changes Summary

| File | Action | Purpose |
|------|--------|---------|
| `convex/agent_packages.ts` | Create | Package definitions, purchase initiation, delivery |
| `convex/schema/core.ts` | Modify | Add `client_tasks` table |
| `convex/support_orchestrator.ts` | Modify | Add login prompt threshold logic |
| `convex/kora_webhook.ts` | Modify | Handle `PKG-` payment references |
| `src/components/CustomerSupportChat.tsx` | Modify | Login prompt, package selection, post-login flow |
| `src/components/dashboard/MyTasks.tsx` | Create | Deliverables dashboard section |
| `src/routes/dashboard.tsx` | Modify | URL param reading, My Tasks tab |
| `src/routes/payment/callback.tsx` | Modify | Handle `PKG-` payment verification |
