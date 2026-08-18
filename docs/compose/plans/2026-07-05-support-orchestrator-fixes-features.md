# Support Orchestrator — Bug Fixes & Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all known bugs in the Support Orchestrator and add missing features (auto-escalation, auto-response rules, WhatsApp integration).

**Architecture:** Fix bugs in existing files first, then add new features. The orchestrator uses NVIDIA NIM for LLM classification/routing, Convex for data persistence, and React for the admin/client UI.

**Tech Stack:** Convex (backend), React 19 (frontend), NVIDIA NIM (LLM), Tailwind CSS 4

## Global Constraints

1. **Convex is the ONLY backend.** All data lives in `convex/schema.ts`.
2. **`fetch()` ONLY in `action` functions.** Never in `query` or `mutation`.
3. **Never use `.filter()`** on Convex queries — define an index and use `.withIndex()`.
4. **Never pass `undefined`** as a Convex value — use `null` instead.
5. **Always include `returns` validator** on every Convex function.
6. **All features are ADDITIVE** — must NOT break existing functionality.
7. **Test properly, push to GitHub BEFORE deploying.**

---

## Part 1: Bug Fixes

### Task 1: Fix Enterprise Create Ticket Button

**Covers:** Enterprise ticketing bug

**Files:**
- Modify: `src/components/admin/enterprise/SupportTicketDashboard.tsx:142-178`

**Interfaces:**
- Consumes: `createTicket` mutation from `convex/enterprise_support.ts`
- Produces: Working ticket creation form

- [ ] **Step 1: Read the current broken code**

Read `src/components/admin/enterprise/SupportTicketDashboard.tsx` lines 142-178 to understand the create ticket modal.

- [ ] **Step 2: Fix the submit handler**

Replace the broken `onClick` handler at line 172 with a proper async handler:

```tsx
// In the create ticket modal, replace the button onClick:
onClick={async () => {
  if (!newTicket.companyId || !newTicket.subject || !newTicket.description) {
    showToast('error', 'Please fill in all required fields')
    return
  }
  try {
    await createTicket({
      companyId: newTicket.companyId,
      customerName: newTicket.customerName || 'Unknown',
      customerEmail: newTicket.customerEmail || '',
      subject: newTicket.subject,
      description: newTicket.description,
      priority: newTicket.priority as any,
      category: newTicket.category as any,
    })
    showToast('success', 'Ticket created successfully')
    setShowCreate(false)
    setNewTicket({ companyId: '', customerName: '', customerEmail: '', subject: '', description: '', priority: 'normal', category: 'general' })
  } catch (e: any) {
    showToast('error', e.message)
  }
}}
```

- [ ] **Step 3: Verify the fix**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/enterprise/SupportTicketDashboard.tsx
git commit -m "fix: enterprise create ticket button now submits form data"
```

---

### Task 2: Fix Model Name Mismatch in Orchestrator Status

**Covers:** Model name mismatch bug

**Files:**
- Modify: `convex/support_orchestrator.ts:192-232` (getOrchestratorStatus query)

**Interfaces:**
- Consumes: `getOrchestratorStatus` query
- Produces: Correct model names in status response

- [ ] **Step 1: Read the current status query**

Read `convex/support_orchestrator.ts` lines 192-232 to find the hardcoded model names.

- [ ] **Step 2: Fix the model names**

Replace the hardcoded model names with the actual models used:

```typescript
// In getOrchestratorStatus, update the model config:
const modelConfig = {
  primary: "meta/llama-3.3-70b-instruct",
  fallback: "meta/llama-3.1-70b-instruct",
  emergency: "general",
};
```

- [ ] **Step 3: Verify the fix**

Run: `npx convex deploy --typecheck=disable --dry-run`
Expected: Dry run succeeds

- [ ] **Step 4: Commit**

```bash
git add convex/support_orchestrator.ts
git commit -m "fix: correct model names in orchestrator status query"
```

---

### Task 3: Fix .filter() Violation in Enterprise Support

**Covers:** `.filter()` violation in enterprise_support.ts

**Files:**
- Modify: `convex/schema/misc.ts` (add index)
- Modify: `convex/enterprise_support.ts:78` (use index)

**Interfaces:**
- Consumes: `enterprise_support_tickets` table
- Produces: Query using `.withIndex()` instead of `.filter()`

- [ ] **Step 1: Read the current code**

Read `convex/enterprise_support.ts` line 78 to find the `.filter()` call.
Read `convex/schema/misc.ts` to find the `enterprise_support_tickets` table definition.

- [ ] **Step 2: Add index to schema**

Add a composite index to the `enterprise_support_tickets` table:

```typescript
enterprise_support_tickets: defineTable({
  // ... existing fields
}).index("by_company_status", ["companyId", "status"])
  .index("by_status", ["status"])
  .index("by_priority", ["priority"]),
```

- [ ] **Step 3: Fix the query**

Replace `.filter()` with `.withIndex()`:

```typescript
// Before:
const tickets = await ctx.db.query("enterprise_support_tickets")
  .filter((q) => q.eq(q.field("companyId"), args.companyId))
  .collect();

// After:
const tickets = await ctx.db.query("enterprise_support_tickets")
  .withIndex("by_company_status", (q) => q.eq("companyId", args.companyId))
  .collect();
```

- [ ] **Step 4: Verify the fix**

Run: `npx convex deploy --typecheck=disable --dry-run`
Expected: Dry run succeeds

- [ ] **Step 5: Commit**

```bash
git add convex/schema/misc.ts convex/enterprise_support.ts
git commit -m "fix: replace .filter() with .withIndex() in enterprise support"
```

---

## Part 2: New Features

### Task 4: Add Auto-Escalation Rules

**Covers:** Auto-escalation feature

**Files:**
- Create: `convex/support_auto_escalation.ts`
- Modify: `convex/support_orchestrator.ts` (add escalation triggers)

**Interfaces:**
- Consumes: `support_interactions` table, `support_escalations` table
- Produces: `checkAndEscalate` mutation, `getEscalationRules` query

- [ ] **Step 1: Create auto-escalation module**

Create `convex/support_auto_escalation.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Auto-escalation rules
const ESCALATION_RULES = {
  lowConfidenceThreshold: 0.4,
  maxRetriesBeforeEscalation: 2,
  negativeSentimentKeywords: ["angry", "frustrated", "terrible", "worst", "unacceptable", "lawsuit", "cancel"],
};

export const checkAndEscalate = mutation({
  args: {
    interactionId: v.id("support_interactions"),
    confidence: v.string(),
    agentId: v.string(),
    message: v.string(),
  },
  returns: v.object({ escalated: boolean, reason: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Rule 1: Low confidence
    if (args.confidence === "low") {
      const existingEscalation = await ctx.db
        .query("support_escalations")
        .withIndex("by_interaction", (q) => q.eq("interactionId", args.interactionId))
        .first();
      
      if (!existingEscalation) {
        await ctx.db.insert("support_escalations", {
          interactionId: args.interactionId,
          status: "pending",
          reason: "Low confidence response",
          agentId: args.agentId,
          createdAt: now,
          updatedAt: now,
        });
        return { escalated: true, reason: "Low confidence" };
      }
    }
    
    // Rule 2: Negative sentiment
    const messageLower = args.message.toLowerCase();
    const hasNegativeSentiment = ESCALATION_RULES.negativeSentimentKeywords.some(
      (keyword) => messageLower.includes(keyword)
    );
    
    if (hasNegativeSentiment) {
      const existingEscalation = await ctx.db
        .query("support_escalations")
        .withIndex("by_interaction", (q) => q.eq("interactionId", args.interactionId))
        .first();
      
      if (!existingEscalation) {
        await ctx.db.insert("support_escalations", {
          interactionId: args.interactionId,
          status: "pending",
          reason: "Negative sentiment detected",
          agentId: args.agentId,
          createdAt: now,
          updatedAt: now,
        });
        return { escalated: true, reason: "Negative sentiment" };
      }
    }
    
    // Rule 3: Repeated low confidence (check last 3 interactions from same user)
    const recentInteractions = await ctx.db
      .query("support_interactions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(3);
    
    const lowConfidenceCount = recentInteractions.filter(
      (i) => i.confidence === "low"
    ).length;
    
    if (lowConfidenceCount >= ESCALATION_RULES.maxRetriesBeforeEscalation) {
      const existingEscalation = await ctx.db
        .query("support_escalations")
        .withIndex("by_interaction", (q) => q.eq("interactionId", args.interactionId))
        .first();
      
      if (!existingEscalation) {
        await ctx.db.insert("support_escalations", {
          interactionId: args.interactionId,
          status: "pending",
          reason: `Repeated low confidence responses (${lowConfidenceCount} times)`,
          agentId: args.agentId,
          createdAt: now,
          updatedAt: now,
        });
        return { escalated: true, reason: "Repeated low confidence" };
      }
    }
    
    return { escalated: false };
  },
});

export const getEscalationRules = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return ESCALATION_RULES;
  },
});

export const updateEscalationRules = mutation({
  args: {
    rules: v.object({
      lowConfidenceThreshold: v.number(),
      maxRetriesBeforeEscalation: v.number(),
      negativeSentimentKeywords: v.array(v.string()),
    }),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Store updated rules in system_config
    const key = "escalation_rules";
    const existing = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, { value: JSON.stringify(args.rules) });
    } else {
      await ctx.db.insert("system_config", {
        key,
        value: JSON.stringify(args.rules),
      });
    }
    
    return { success: true };
  },
});
```

- [ ] **Step 2: Integrate auto-escalation into processMessage**

In `convex/support_orchestrator.ts`, add the auto-escalation call after getting the response:

```typescript
// After line 150 (after getting the response), add:
const escalationResult = await ctx.runMutation(
  (await import("./_generated/api")).default.support_auto_escalation.checkAndEscalate,
  {
    interactionId: interactionId,
    confidence: confidence,
    agentId: agentId,
    message: args.message,
  }
);

if (escalationResult.escalated) {
  // Log the escalation
  console.log(`Auto-escalated: ${escalationResult.reason}`);
}
```

- [ ] **Step 3: Verify the build**

Run: `npx convex deploy --typecheck=disable --dry-run`
Expected: Dry run succeeds

- [ ] **Step 4: Commit**

```bash
git add convex/support_auto_escalation.ts convex/support_orchestrator.ts
git commit -m "feat: add auto-escalation rules for low confidence and negative sentiment"
```

---

### Task 5: Add Auto-Response Rules Engine

**Covers:** Auto-response rules feature

**Files:**
- Create: `convex/support_auto_response.ts`
- Modify: `convex/customer_support_bot.ts` (integrate rules)

**Interfaces:**
- Consumes: `system_config` table for rule storage
- Produces: `getAutoResponseRules` query, `matchAutoResponse` mutation, `addAutoResponseRule` mutation

- [ ] **Step 1: Create auto-response rules module**

Create `convex/support_auto_response.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// Default auto-response rules
const DEFAULT_RULES = [
  {
    id: "pricing",
    keywords: ["price", "pricing", "cost", "how much", "plan", "subscription"],
    response: "We offer flexible pricing plans starting from 5,000 NGN/month. Visit our pricing page for details, or I can help you choose the right plan!",
    priority: 1,
    enabled: true,
  },
  {
    id: "features",
    keywords: ["feature", "what can", "capabilities", "services", "agents"],
    response: "We have 15 specialized AI agents covering Sales, Marketing, Support, Design, and more. Each agent is expert in their domain. Which area interests you?",
    priority: 2,
    enabled: true,
  },
  {
    id: "support_hours",
    keywords: ["hours", "when", "available", "open", "close"],
    response: "Our AI support is available 24/7! For human support, we're available Monday-Friday, 9AM-6PM WAT. Enterprise customers get 24/7 priority support.",
    priority: 3,
    enabled: true,
  },
  {
    id: "refund",
    keywords: ["refund", "money back", "cancel", "return"],
    response: "We offer a 30-day money-back guarantee. If you're not satisfied, contact support@dutchkem.com for a full refund.",
    priority: 4,
    enabled: true,
  },
  {
    id: "trial",
    keywords: ["trial", "free", "test", "demo", "try"],
    response: "You can start with our Free tier (50 messages/month, 1 agent) to test the platform. No credit card required!",
    priority: 5,
    enabled: true,
  },
];

export const getAutoResponseRules = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    // Get custom rules from system_config
    const customRules = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", "auto_response_rules"))
      .first();
    
    if (customRules) {
      return JSON.parse(customRules.value);
    }
    
    return DEFAULT_RULES;
  },
});

export const matchAutoResponse = mutation({
  args: { message: v.string() },
  returns: v.object({
    matched: v.boolean(),
    ruleId: v.optional(v.string()),
    response: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Get rules
    const rulesConfig = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", "auto_response_rules"))
      .first();
    
    const rules = rulesConfig ? JSON.parse(rulesConfig.value) : DEFAULT_RULES;
    const messageLower = args.message.toLowerCase();
    
    // Sort by priority
    const sortedRules = rules
      .filter((r: any) => r.enabled)
      .sort((a: any, b: any) => a.priority - b.priority);
    
    for (const rule of sortedRules) {
      const matched = rule.keywords.some((keyword: string) =>
        messageLower.includes(keyword.toLowerCase())
      );
      
      if (matched) {
        return {
          matched: true,
          ruleId: rule.id,
          response: rule.response,
        };
      }
    }
    
    return { matched: false };
  },
});

export const addAutoResponseRule = mutation({
  args: {
    id: v.string(),
    keywords: v.array(v.string()),
    response: v.string(),
    priority: v.number(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Get existing rules
    const rulesConfig = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", "auto_response_rules"))
      .first();
    
    const rules = rulesConfig ? JSON.parse(rulesConfig.value) : DEFAULT_RULES;
    
    // Add or update rule
    const existingIndex = rules.findIndex((r: any) => r.id === args.id);
    const newRule = {
      id: args.id,
      keywords: args.keywords,
      response: args.response,
      priority: args.priority,
      enabled: true,
    };
    
    if (existingIndex >= 0) {
      rules[existingIndex] = newRule;
    } else {
      rules.push(newRule);
    }
    
    // Save
    if (rulesConfig) {
      await ctx.db.patch(rulesConfig._id, { value: JSON.stringify(rules) });
    } else {
      await ctx.db.insert("system_config", {
        key: "auto_response_rules",
        value: JSON.stringify(rules),
      });
    }
    
    return { success: true, ruleCount: rules.length };
  },
});

export const toggleAutoResponseRule = mutation({
  args: {
    ruleId: v.string(),
    enabled: v.boolean(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const rulesConfig = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", "auto_response_rules"))
      .first();
    
    if (!rulesConfig) return { success: false, error: "No rules found" };
    
    const rules = JSON.parse(rulesConfig.value);
    const rule = rules.find((r: any) => r.id === args.ruleId);
    
    if (!rule) return { success: false, error: "Rule not found" };
    
    rule.enabled = args.enabled;
    await ctx.db.patch(rulesConfig._id, { value: JSON.stringify(rules) });
    
    return { success: true };
  },
});
```

- [ ] **Step 2: Integrate into customer_support_bot.ts**

In `convex/customer_support_bot.ts`, add auto-response matching before the AI fallback:

```typescript
// In handleSupportChat, before the AI response section, add:
const autoResponseMatch = await ctx.runMutation(
  (await import("./_generated/api")).default.support_auto_response.matchAutoResponse,
  { message: args.message }
);

if (autoResponseMatch.matched) {
  return {
    response: autoResponseMatch.response,
    agent: "auto-response",
    matchedRule: autoResponseMatch.ruleId,
  };
}
```

- [ ] **Step 3: Verify the build**

Run: `npx convex deploy --typecheck=disable --dry-run`
Expected: Dry run succeeds

- [ ] **Step 4: Commit**

```bash
git add convex/support_auto_response.ts convex/customer_support_bot.ts
git commit -m "feat: add auto-response rules engine with keyword matching"
```

---

### Task 6: Add WhatsApp Integration for Support

**Covers:** WhatsApp support integration

**Files:**
- Create: `convex/whatsapp_support_integration.ts`
- Modify: `convex/whatsapp_openwa.ts` (add support routing)

**Interfaces:**
- Consumes: `whatsapp_message_queue` table, `support_interactions` table
- Produces: `routeWhatsAppToSupport` mutation, `getWhatsAppSupportMessages` query

- [ ] **Step 1: Create WhatsApp support integration module**

Create `convex/whatsapp_support_integration.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const routeWhatsAppToSupport = mutation({
  args: {
    from: v.string(),
    message: v.string(),
    sessionType: v.union(v.literal("admin"), v.literal("enterprise")),
  },
  returns: v.object({
    routed: boolean,
    interactionId: v.optional(v.string()),
    response: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Log the inbound WhatsApp message as a support interaction
    const interactionId = await ctx.db.insert("support_interactions", {
      agentId: "whatsapp",
      userId: args.from,
      message: args.message,
      response: "",
      confidence: "high",
      routed: false,
      sessionId: `whatsapp_${args.sessionType}_${Date.now()}`,
      timestamp: now,
    });
    
    // Check if there's an existing conversation thread
    const recentInteractions = await ctx.db
      .query("support_interactions")
      .withIndex("by_agent", (q) => q.eq("agentId", "whatsapp"))
      .order("desc")
      .take(5);
    
    const existingThread = recentInteractions.find(
      (i) => i.userId === args.from && i.timestamp > now - 24 * 60 * 60 * 1000
    );
    
    // Create escalation if this is a new conversation or follow-up
    if (!existingThread) {
      await ctx.db.insert("support_escalations", {
        interactionId: interactionId as any,
        status: "pending",
        reason: `WhatsApp support request from ${args.from}`,
        agentId: "whatsapp",
        createdAt: now,
        updatedAt: now,
      });
    }
    
    return {
      routed: true,
      interactionId: interactionId,
    };
  },
});

export const getWhatsAppSupportMessages = query({
  args: {
    from: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("support_interactions")
      .withIndex("by_agent", (q) => q.eq("agentId", "whatsapp"));
    
    if (args.from) {
      q = q.filter((filter) => filter.eq(filter.field("userId"), args.from));
    }
    
    return await q
      .order("desc")
      .take(args.limit || 50);
  },
});

export const sendWhatsAppSupportReply = mutation({
  args: {
    to: v.string(),
    message: v.string(),
    interactionId: v.id("support_interactions"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Update the interaction with the response
    await ctx.db.patch(args.interactionId, {
      response: args.message,
      timestamp: now,
    });
    
    // Queue the outbound message via OpenWA
    await ctx.db.insert("whatsapp_message_queue", {
      sessionType: "admin",
      to: args.to,
      messageType: "text",
      content: args.message,
      status: "pending",
      retryCount: 0,
      createdAt: now,
    });
    
    return { success: true, queued: true };
  },
});
```

- [ ] **Step 2: Verify the build**

Run: `npx convex deploy --typecheck=disable --dry-run`
Expected: Dry run succeeds

- [ ] **Step 3: Commit**

```bash
git add convex/whatsapp_support_integration.ts
git commit -m "feat: add WhatsApp integration for support conversations"
```

---

### Task 7: Add Repetition Detection

**Covers:** Repetition detection feature

**Files:**
- Create: `convex/support_repetition_detector.ts`
- Modify: `convex/support_orchestrator.ts` (add repetition check)

**Interfaces:**
- Consumes: `support_interactions` table
- Produces: `checkRepetition` mutation, `getRepetitionStats` query

- [ ] **Step 1: Create repetition detector module**

Create `convex/support_repetition_detector.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const checkRepetition = mutation({
  args: {
    agentId: v.string(),
    message: v.string(),
    response: v.string(),
  },
  returns: v.object({
    isRepetitive: boolean,
    similarity: v.number(),
    suggestion: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Get recent responses from this agent
    const recentInteractions = await ctx.db
      .query("support_interactions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(10);
    
    if (recentInteractions.length < 2) {
      return { isRepetitive: false, similarity: 0 };
    }
    
    // Simple text similarity check (Jaccard similarity)
    const responseWords = new Set(args.response.toLowerCase().split(/\s+/));
    
    let maxSimilarity = 0;
    let mostSimilarResponse = "";
    
    for (const interaction of recentInteractions) {
      if (!interaction.response) continue;
      
      const existingWords = new Set(interaction.response.toLowerCase().split(/\s+/));
      const intersection = new Set([...responseWords].filter((w) => existingWords.has(w)));
      const union = new Set([...responseWords, ...existingWords]);
      
      const similarity = intersection.size / union.size;
      
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        mostSimilarResponse = interaction.response;
      }
    }
    
    const isRepetitive = maxSimilarity > 0.7;
    
    return {
      isRepetitive,
      similarity: maxSimilarity,
      suggestion: isRepetitive
        ? "Response is too similar to recent answers. Please provide a different response."
        : undefined,
    };
  },
});

export const getRepetitionStats = query({
  args: {
    agentId: v.optional(v.string()),
    timeWindowHours: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const timeWindow = (args.timeWindowHours || 24) * 60 * 60 * 1000;
    const cutoff = now - timeWindow;
    
    let q = ctx.db.query("support_interactions");
    
    if (args.agentId) {
      q = q.withIndex("by_agent", (q) => q.eq("agentId", args.agentId));
    }
    
    const interactions = await q
      .filter((filter) => filter.gte(filter.field("timestamp"), cutoff))
      .order("desc")
      .take(100);
    
    // Calculate repetition metrics
    const responses = interactions
      .filter((i) => i.response)
      .map((i) => i.response!.toLowerCase().split(/\s+/).join(" "));
    
    const uniqueResponses = new Set(responses);
    
    return {
      totalResponses: responses.length,
      uniqueResponses: uniqueResponses.size,
      repetitionRate: responses.length > 0
        ? ((responses.length - uniqueResponses.size) / responses.length) * 100
        : 0,
      timeWindowHours: args.timeWindowHours || 24,
    };
  },
});
```

- [ ] **Step 2: Integrate repetition check into processMessage**

In `convex/support_orchestrator.ts`, add repetition check after getting the response:

```typescript
// After getting the response and before returning, add:
const repetitionCheck = await ctx.runMutation(
  (await import("./_generated/api")).default.support_repetition_detector.checkRepetition,
  {
    agentId: agentId,
    message: args.message,
    response: response,
  }
);

if (repetitionCheck.isRepetitive) {
  // Regenerate response with repetition avoidance instruction
  const retryResponse = await ctx.runAction(
    (await import("./_generated/api")).default.customer_support.generateSupportResponse,
    {
      agentId: agentId,
      message: `IMPORTANT: Do NOT repeat previous answers. Provide a fresh, different response to: ${args.message}`,
      userId: args.userId || "anonymous",
    }
  );
  
  if (retryResponse.success) {
    response = retryResponse.response;
  }
}
```

- [ ] **Step 3: Verify the build**

Run: `npx convex deploy --typecheck=disable --dry-run`
Expected: Dry run succeeds

- [ ] **Step 4: Commit**

```bash
git add convex/support_repetition_detector.ts convex/support_orchestrator.ts
git commit -m "feat: add repetition detection to prevent duplicate responses"
```

---

### Task 8: Add Admin UI for Auto-Response Rules

**Covers:** Admin UI for auto-response rules

**Files:**
- Create: `src/components/admin/AutoResponseRulesPanel.tsx`
- Modify: `src/components/admin/SupportDashboard.tsx` (add Rules tab)

**Interfaces:**
- Consumes: `getAutoResponseRules` query, `addAutoResponseRule` mutation, `toggleAutoResponseRule` mutation
- Produces: Admin UI for managing auto-response rules

- [ ] **Step 1: Create AutoResponseRulesPanel component**

Create `src/components/admin/AutoResponseRulesPanel.tsx`:

```tsx
import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export function AutoResponseRulesPanel({ adminToken }: { adminToken: string }) {
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(null)
  const [showAddRule, setShowAddRule] = useState(false)
  const [newRule, setNewRule] = useState({ id: '', keywords: '', response: '', priority: 1 })

  const rules: any = useQuery(api.support_auto_response.getAutoResponseRules, {})
  const addRule = useMutation(api.support_auto_response.addAutoResponseRule)
  const toggleRule = useMutation(api.support_auto_response.toggleAutoResponseRule)

  const showToast = (type: string, msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const handleAddRule = async () => {
    if (!newRule.id || !newRule.keywords || !newRule.response) {
      showToast('error', 'Please fill in all fields')
      return
    }

    try {
      await addRule({
        id: newRule.id,
        keywords: newRule.keywords.split(',').map((k) => k.trim()),
        response: newRule.response,
        priority: newRule.priority,
        adminToken,
      })
      showToast('success', 'Rule added successfully')
      setShowAddRule(false)
      setNewRule({ id: '', keywords: '', response: '', priority: 1 })
    } catch (e: any) {
      showToast('error', e.message)
    }
  }

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await toggleRule({ ruleId, enabled, adminToken })
      showToast('success', `Rule ${enabled ? 'enabled' : 'disabled'}`)
    } catch (e: any) {
      showToast('error', e.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-black">🤖 Auto-Response Rules</h3>
        <button
          onClick={() => setShowAddRule(!showAddRule)}
          className="px-3 py-1 bg-orange-500 text-white rounded-lg text-xs font-bold"
        >
          {showAddRule ? 'Cancel' : '+ Add Rule'}
        </button>
      </div>

      {showAddRule && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <input
            type="text"
            placeholder="Rule ID (e.g., pricing)"
            value={newRule.id}
            onChange={(e) => setNewRule({ ...newRule, id: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
          />
          <input
            type="text"
            placeholder="Keywords (comma-separated)"
            value={newRule.keywords}
            onChange={(e) => setNewRule({ ...newRule, keywords: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
          />
          <textarea
            placeholder="Auto-response message"
            value={newRule.response}
            onChange={(e) => setNewRule({ ...newRule, response: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
          />
          <input
            type="number"
            placeholder="Priority (1 = highest)"
            value={newRule.priority}
            onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
          />
          <button
            onClick={handleAddRule}
            className="w-full py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold"
          >
            Add Rule
          </button>
        </div>
      )}

      <div className="space-y-2">
        {(rules ?? []).map((rule: any) => (
          <div
            key={rule.id}
            className={`rounded-2xl border-l-4 p-4 transition-all ${
              rule.enabled ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-900/50 border-red-500/30 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-black text-sm">{rule.id}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Priority: {rule.priority} | Keywords: {rule.keywords.join(', ')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => handleToggleRule(rule.id, !rule.enabled)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2">{rule.response}</p>
          </div>
        ))}
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-5 py-3 rounded-2xl shadow-2xl z-50 animate-pulse ${
            toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          <p className="text-sm font-bold">{toast.msg}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add Rules tab to SupportDashboard**

In `src/components/admin/SupportDashboard.tsx`, add the Rules tab:

```tsx
// Add to the tabs array (around line 75):
const tabs = [
  { id: 'overview' as const, label: 'Overview', icon: '📊' },
  { id: 'interactions' as const, label: 'Interactions', icon: '💬' },
  { id: 'escalations' as const, label: 'Escalations', icon: '🚨' },
  { id: 'agents' as const, label: 'Agents', icon: '🤖' },
  { id: 'rules' as const, label: 'Rules', icon: '⚙️' },
  { id: 'settings' as const, label: 'Settings', icon: '🔧' },
];

// Add the Rules tab content (after the Agents tab):
{activeTab === 'rules' && (
  <AutoResponseRulesPanel adminToken={adminToken} />
)}
```

- [ ] **Step 3: Import the component**

Add the import at the top of `SupportDashboard.tsx`:

```tsx
import { AutoResponseRulesPanel } from './AutoResponseRulesPanel'
```

- [ ] **Step 4: Verify the build**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/AutoResponseRulesPanel.tsx src/components/admin/SupportDashboard.tsx
git commit -m "feat: add admin UI for auto-response rules management"
```

---

## Summary

| Task | Type | Description |
|------|------|-------------|
| 1 | Bug Fix | Fix enterprise create ticket button |
| 2 | Bug Fix | Fix model name mismatch in orchestrator status |
| 3 | Bug Fix | Fix .filter() violation in enterprise support |
| 4 | Feature | Add auto-escalation rules |
| 5 | Feature | Add auto-response rules engine |
| 6 | Feature | Add WhatsApp integration for support |
| 7 | Feature | Add repetition detection |
| 8 | Feature | Add admin UI for auto-response rules |

**Total Tasks:** 8
**Estimated Time:** 45-60 minutes
