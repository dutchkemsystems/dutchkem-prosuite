# Agent Task Purchase Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable clients to chat with agents, purchase deliverables via Kora Pay, and access generated tasks in the dashboard.

**Architecture:** Extend existing `CustomerSupportChat` + orchestrator with per-agent packages, login prompt flow, URL-based agent context, payment integration, and a "My Tasks" dashboard section.

**Tech Stack:** Convex (backend), React 19 (frontend), NVIDIA NIM (LLM), Kora Pay (payments), Tailwind CSS 4

## Global Constraints

1. **Convex is the ONLY backend.** All data lives in `convex/schema.ts`.
2. **`fetch()` ONLY in `action` functions.** Never in `query` or `mutation`.
3. **Never use `.filter()`** on Convex queries — define an index and use `.withIndex()`.
4. **Never pass `undefined`** as a Convex value — use `null` instead.
5. **Always include `returns` validator** on every Convex function.
6. **All features are ADDITIVE** — must NOT break existing 15 agents, voice, payments, wallet, auto-sweep, Resend auth.
7. **Kora API response field is `status` (boolean)** — NEVER `success`.
8. **Test properly, push to GitHub BEFORE deploying.**
9. **Deploy manually:** `npx convex deploy --typecheck=disable` then `vercel deploy --prod --yes --force`.

---

## Task 1: Add `client_tasks` Table to Schema

**Covers:** [S10]

**Files:**
- Modify: `convex/schema/misc.ts` (add table definition)

**Interfaces:**
- Consumes: (none)
- Produces: `client_tasks` table usable by all subsequent tasks

- [ ] **Step 1: Read current schema to find insertion point**

Read `convex/schema/misc.ts` and find the last table definition before the export.

- [ ] **Step 2: Add the client_tasks table definition**

Add this after the last table definition in `convex/schema/misc.ts`:

```typescript
export const clientTasksSchema = {
  client_tasks: defineTable({
    userId: v.id("users"),
    agentId: v.string(),
    packageName: v.string(),
    packageId: v.string(),
    deliverable: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("delivered"),
      v.literal("failed")
    ),
    content: v.optional(v.string()),
    paymentReference: v.string(),
    amount: v.number(),
    createdAt: v.number(),
    deliveredAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_payment_ref", ["paymentReference"]),
};
```

- [ ] **Step 3: Import and merge the new schema**

In `convex/schema/index.ts`, import `clientTasksSchema` and merge it into the combined schema object.

- [ ] **Step 4: Verify the schema compiles**

Run: `npx convex deploy --typecheck=disable --dry-run`
Expected: Dry run succeeds

- [ ] **Step 5: Commit**

```bash
git add convex/schema/misc.ts convex/schema/index.ts
git commit -m "feat: add client_tasks table for deliverable tracking"
```

---

## Task 2: Create Agent Packages Module

**Covers:** [S3]

**Files:**
- Create: `convex/agent_packages.ts`

**Interfaces:**
- Consumes: `client_tasks` table (Task 1)
- Produces: `AGENT_PACKAGES` constant, `getAgentPackages` query, `getClientTasks` query, `initiateAgentPackagePurchase` mutation, `generateDeliverable` action

- [ ] **Step 1: Create the agent_packages.ts file**

```typescript
import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// PER-AGENT PACKAGE DEFINITIONS
// Prices in NGN (will be converted to kobo for Kora API)
// ═══════════════════════════════════════════════════════════════════

export const AGENT_PACKAGES: Record<string, Array<{
  id: string;
  name: string;
  description: string;
  price: number;       // in NGN
  deliverable: string; // type identifier
}>> = {
  A1: [ // Academic Pro
    { id: "ac-essay", name: "Essay Writing", description: "Custom academic essay (up to 3000 words)", price: 5000, deliverable: "essay" },
    { id: "ac-thesis", name: "Thesis Chapter", description: "Full thesis chapter with citations", price: 15000, deliverable: "thesis_chapter" },
    { id: "ac-research", name: "Research Paper", description: "Complete research paper with methodology", price: 25000, deliverable: "research_paper" },
  ],
  A2: [ // Business Pro
    { id: "bp-basic", name: "Business Plan Basic", description: "Standard business plan (5-8 pages)", price: 5000, deliverable: "business_plan" },
    { id: "bp-pro", name: "Business Plan + Strategy", description: "Full plan with market analysis and financial projections", price: 15000, deliverable: "business_plan_strategy" },
    { id: "bp-investor", name: "Investor-Ready Package", description: "Pitch deck + financial model + executive summary", price: 30000, deliverable: "investor_package" },
  ],
  A3: [ // Content Pro
    { id: "ct-blog", name: "Blog Post", description: "SEO-optimized blog post (1000-2000 words)", price: 3000, deliverable: "blog_post" },
    { id: "ct-social", name: "Social Media Pack", description: "30-day content calendar with captions", price: 8000, deliverable: "social_media_pack" },
    { id: "ct-copy", name: "Sales Copy", description: "High-converting sales page copy", price: 10000, deliverable: "sales_copy" },
  ],
  A4: [ // Career Pro
    { id: "cv-basic", name: "CV Writing", description: "Professional CV tailored to your industry", price: 3000, deliverable: "cv" },
    { id: "cv-pro", name: "CV + Cover Letter", description: "CV plus customized cover letter", price: 5000, deliverable: "cv_cover_letter" },
    { id: "cv-full", name: "Full Career Package", description: "CV + Cover Letter + LinkedIn optimization + Interview prep", price: 12000, deliverable: "career_package" },
  ],
  A5: [ // Personal Shopper
    { id: "ps-research", name: "Product Research", description: "Detailed product comparison and recommendation", price: 3000, deliverable: "product_research" },
    { id: "ps-deal", name: "Deal Finder", description: "Best deals across 5+ stores for your item", price: 2000, deliverable: "deal_finder" },
  ],
  A6: [ // Exam Pro
    { id: "ex-study", name: "Study Plan", description: "Customized study schedule and strategy", price: 5000, deliverable: "study_plan" },
    { id: "ex-practice", name: "Practice Test Pack", description: "50 practice questions with detailed explanations", price: 8000, deliverable: "practice_test" },
  ],
  A7: [ // Finance Pro
    { id: "fn-budget", name: "Budget Plan", description: "Personalized monthly budget and savings plan", price: 5000, deliverable: "budget_plan" },
    { id: "fn-invest", name: "Investment Guide", description: "Custom investment strategy based on your goals", price: 15000, deliverable: "investment_guide" },
  ],
  A8: [ // MediaStudio Pro
    { id: "ms-script", name: "Video Script", description: "Professional video script (up to 10 minutes)", price: 8000, deliverable: "video_script" },
    { id: "ms-storyboard", name: "Storyboard", description: "Visual storyboard for your video project", price: 15000, deliverable: "storyboard" },
  ],
  A9: [ // Health Pro
    { id: "hl-diet", name: "Diet Plan", description: "Personalized nutrition and meal plan", price: 5000, deliverable: "diet_plan" },
    { id: "hl-fitness", name: "Fitness Program", description: "Custom workout routine (4 weeks)", price: 8000, deliverable: "fitness_program" },
  ],
  A10: [ // Home Services Pro
    { id: "hs-cleaning", name: "Cleaning Schedule", description: "Room-by-room cleaning checklist and schedule", price: 2000, deliverable: "cleaning_schedule" },
    { id: "hs-organize", name: "Organization Plan", description: "Home organization strategy and product list", price: 5000, deliverable: "organization_plan" },
  ],
  A11: [ // Language Tutor
    { id: "lt-plan", name: "Learning Plan", description: "30-day language learning roadmap", price: 5000, deliverable: "language_plan" },
    { id: "lt-practice", name: "Practice Pack", description: "Conversation practice scenarios + vocabulary list", price: 3000, deliverable: "practice_pack" },
  ],
  A12: [ // Travel Planner
    { id: "tp-itinerary", name: "Travel Itinerary", description: "Day-by-day travel plan with recommendations", price: 8000, deliverable: "travel_itinerary" },
    { id: "tp-budget", name: "Travel Budget", description: "Complete trip budget breakdown", price: 5000, deliverable: "travel_budget" },
  ],
  A13: [ // ServiceMart NG
    { id: "sm-jamb", name: "JAMB Prep Pack", description: "Study materials + practice questions for JAMB", price: 5000, deliverable: "jamb_prep" },
    { id: "sm-waec", name: "WAEC Prep Pack", description: "Complete WAEC preparation materials", price: 5000, deliverable: "waec_prep" },
  ],
  A14: [ // Translation Hub
    { id: "tr-translate", name: "Document Translation", description: "Translate up to 5 pages (any language pair)", price: 5000, deliverable: "translation" },
    { id: "tr-localize", name: "Localization Pack", description: "Full localization with cultural adaptation", price: 15000, deliverable: "localization" },
  ],
  A15: [ // Event Planner
    { id: "ev-plan", name: "Event Plan", description: "Complete event planning document", price: 10000, deliverable: "event_plan" },
    { id: "ev-budget", name: "Event Budget", description: "Detailed event budget and vendor list", price: 5000, deliverable: "event_budget" },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get packages for an agent
// ═══════════════════════════════════════════════════════════════════
export const getAgentPackages = query({
  args: { agentId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return AGENT_PACKAGES[args.agentId] || [];
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get all packages (for admin/display)
// ═══════════════════════════════════════════════════════════════════
export const getAllPackages = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return AGENT_PACKAGES;
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get client's purchased tasks
// ═══════════════════════════════════════════════════════════════════
export const getClientTasks = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("client_tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Initiate package purchase
// ═══════════════════════════════════════════════════════════════════
export const initiateAgentPackagePurchase = mutation({
  args: {
    userId: v.string(),
    agentId: v.string(),
    packageId: v.string(),
    customerEmail: v.optional(v.string()),
    customerName: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const packages = AGENT_PACKAGES[args.agentId];
    if (!packages) return { success: false, error: "Invalid agent" };

    const pkg = packages.find((p) => p.id === args.packageId);
    if (!pkg) return { success: false, error: "Invalid package" };

    const reference = `PKG-${args.agentId}-${args.packageId}-${Date.now()}`;
    const amountKobo = pkg.price * 100; // Convert NGN to kobo

    // Store pending transaction
    await ctx.db.insert("kora_pending_transactions", {
      reference,
      amount: amountKobo,
      currency: "NGN",
      type: "agent_package",
      userId: args.userId,
      metadata: {
        agentId: args.agentId,
        packageId: pkg.id,
        packageName: pkg.name,
        deliverable: pkg.deliverable,
      },
      status: "pending",
      createdAt: Date.now(),
    } as any);

    // Create the client_task record (pending payment)
    await ctx.db.insert("client_tasks", {
      userId: args.userId as any,
      agentId: args.agentId,
      packageName: pkg.name,
      packageId: pkg.id,
      deliverable: pkg.deliverable,
      status: "pending",
      paymentReference: reference,
      amount: amountKobo,
      createdAt: Date.now(),
    });

    // Initiate Kora Pay checkout
    const koraSecretKey = process.env.KORA_SECRET_KEY;
    if (!koraSecretKey) return { success: false, error: "Payment not configured" };

    const response = await fetch("https://api.korapay.com/merchant/api/v1/charges/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${koraSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountKobo,
        currency: "NGN",
        reference,
        customer: {
          name: args.customerName || "Customer",
          email: args.customerEmail || "customer@dutchkem.com",
        },
        metadata: {
          agentId: args.agentId,
          packageId: pkg.id,
          packageName: pkg.name,
          userId: args.userId,
        },
        redirect_url: `${typeof window !== "undefined" ? window.location.origin : "https://dutchkem-prosuite-app.vercel.app"}/payment/callback`,
      }),
    });

    const data = await response.json();
    if (data.status) {
      return {
        success: true,
        checkoutUrl: data.data?.checkout_url,
        reference,
        package: pkg,
      };
    }

    return { success: false, error: "Payment initiation failed" };
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Complete package payment (called from webhook/callback)
// ═══════════════════════════════════════════════════════════════════
export const completePackagePayment = mutation({
  args: {
    reference: v.string(),
    status: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.status !== "success") return { success: false };

    // Find the pending transaction
    const pending = await ctx.db
      .query("kora_pending_transactions")
      .filter((q) => q.eq(q.field("reference"), args.reference))
      .first();

    if (!pending) return { success: false, error: "Transaction not found" };

    const metadata = (pending as any).metadata || {};

    // Find the client_task
    const task = await ctx.db
      .query("client_tasks")
      .withIndex("by_payment_ref", (q) => q.eq("paymentReference", args.reference))
      .first();

    if (task) {
      await ctx.db.patch(task._id, {
        status: "generating",
      });
    }

    // Mark transaction completed
    await ctx.db.patch(pending._id, {
      status: "completed",
      completedAt: Date.now(),
    } as any);

    return { success: true, taskId: task?._id, metadata };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ACTION: Generate deliverable using LLM
// ═══════════════════════════════════════════════════════════════════
export const generateDeliverable = action({
  args: {
    taskId: v.id("client_tasks"),
    clientRequest: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(
      (await import("./_generated/api")).api.agent_packages.getClientTaskById,
      { taskId: args.taskId }
    );

    if (!task) return { success: false, error: "Task not found" };

    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    if (!apiKey) return { success: false, error: "AI not configured" };

    const deliverablePrompts: Record<string, string> = {
      business_plan: "Create a comprehensive business plan with executive summary, company description, market analysis, organization structure, service/product line, marketing strategy, and financial projections.",
      business_plan_strategy: "Create a detailed business plan with executive summary, company description, market analysis with competitor research, SWOT analysis, organization structure, service/product line, marketing strategy, operations plan, and 3-year financial projections with revenue model.",
      investor_package: "Create an investor-ready package including: 1) Executive Summary (1 page), 2) Company Overview, 3) Market Opportunity with TAM/SAM/SOM, 4) Business Model, 5) Competitive Landscape, 6) Financial Projections (3 years), 7) Funding Requirements, 8) Use of Funds breakdown.",
      cv: "Create a professional CV with contact information, professional summary, work experience, education, skills, and certifications. Format it cleanly with clear sections.",
      cv_cover_letter: "Create a professional CV and a customized cover letter. The CV should have contact info, summary, experience, education, skills. The cover letter should be tailored to a general job application in the candidate's field.",
      career_package: "Create a complete career package: 1) Professional CV, 2) Customized cover letter template, 3) LinkedIn profile optimization guide, 4) Interview preparation questions and answers for the candidate's industry.",
      essay: "Write a well-structured academic essay with introduction, body paragraphs with evidence, and conclusion. Use proper academic tone and citations where appropriate.",
      thesis_chapter: "Write a thesis chapter with proper academic structure: introduction, literature review, methodology (if applicable), analysis, and discussion. Include proper citations and references.",
      research_paper: "Write a complete research paper with abstract, introduction, literature review, methodology, results, discussion, and conclusion. Use academic tone with proper citations.",
      blog_post: "Write an SEO-optimized blog post with engaging title, hook introduction, well-structured body with subheadings, actionable insights, and a strong call-to-action conclusion.",
      social_media_pack: "Create a 30-day social media content calendar with daily post ideas, captions, hashtags, and posting times. Include a mix of educational, engaging, and promotional content.",
      sales_copy: "Write high-converting sales page copy with headline, subheadline, problem statement, solution, benefits, social proof section, urgency elements, and strong CTA.",
      product_research: "Create a detailed product comparison report with feature analysis, price comparison across multiple stores, pros/cons, and a final recommendation with best value option.",
      deal_finder: "Research and compile the best deals for the requested item across multiple Nigerian e-commerce platforms. Include prices, seller ratings, shipping options, and best overall deal.",
      study_plan: "Create a customized study schedule with daily/weekly goals, subject breakdown, practice test schedule, rest days, and milestone checkpoints.",
      practice_test: "Generate 50 practice exam questions with multiple choice options, correct answers, and detailed explanations for each question.",
      budget_plan: "Create a personalized monthly budget with income breakdown, expense categories, savings targets, emergency fund allocation, and investment recommendations.",
      investment_guide: "Create a custom investment strategy based on the client's goals, risk tolerance, and timeline. Include asset allocation, specific investment recommendations for the Nigerian market, and a monitoring plan.",
      video_script: "Write a professional video script with scene descriptions, dialogue/narration, timing cues, and visual notes. Structure it for maximum engagement.",
      storyboard: "Create a detailed storyboard with scene breakdowns, visual descriptions, camera angles, transitions, and timing for each scene.",
      diet_plan: "Create a personalized nutrition plan with meal schedules, portion sizes, grocery list, and dietary notes based on the client's goals and restrictions.",
      fitness_program: "Create a 4-week fitness program with daily workouts, exercise descriptions, sets/reps, rest periods, and progressive overload plan.",
      cleaning_schedule: "Create a room-by-room cleaning checklist with daily, weekly, and monthly tasks. Include product recommendations and time estimates.",
      organization_plan: "Create a home organization strategy with room-by-room plan, storage solutions, product recommendations, and a step-by-step implementation guide.",
      language_plan: "Create a 30-day language learning roadmap with daily lessons, vocabulary lists, practice exercises, and milestone goals.",
      practice_pack: "Create conversation practice scenarios, vocabulary lists with translations, common phrases, and pronunciation guides.",
      travel_itinerary: "Create a detailed day-by-day travel itinerary with activities, restaurants, transportation, estimated costs, and tips.",
      travel_budget: "Create a complete trip budget with breakdown by category (flights, accommodation, food, activities, shopping, emergency) and daily spending limits.",
      jamb_prep: "Create JAMB preparation materials including subject-specific study guides, practice questions, time management tips, and exam strategies.",
      waec_prep: "Create WAEC preparation materials with subject breakdowns, key topics, practice questions, and exam techniques.",
      translation: "Translate the provided document maintaining original formatting, tone, and meaning. Include notes on any cultural adaptations made.",
      localization: "Localize the content with full cultural adaptation, including idioms, measurements, currency, date formats, and culturally appropriate references.",
      event_plan: "Create a complete event plan with timeline, vendor list, layout design, menu options, entertainment schedule, and contingency plans.",
      event_budget: "Create a detailed event budget with line items, vendor quotes, payment schedules, and a 10% contingency buffer.",
    };

    const systemPrompt = deliverablePrompts[task.deliverable] ||
      "Create a professional deliverable based on the client's requirements. Be thorough, detailed, and deliver high quality.";

    const userMessage = args.clientRequest || `Please generate the ${task.packageName} deliverable for the client.`;

    try {
      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta/llama-3.3-70b-instruct",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(60000),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "Deliverable generated successfully.";

      // Update task with content
      await ctx.runMutation(
        (await import("./_generated/api")).api.agent_packages.completeDeliverable,
        { taskId: args.taskId, content }
      );

      return { success: true, content };
    } catch (error: any) {
      await ctx.runMutation(
        (await import("./_generated/api")).api.agent_packages.failDeliverable,
        { taskId: args.taskId, error: error.message }
      );
      return { success: false, error: error.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Mark deliverable complete
// ═══════════════════════════════════════════════════════════════════
export const completeDeliverable = mutation({
  args: {
    taskId: v.id("client_tasks"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      status: "delivered",
      content: args.content,
      deliveredAt: Date.now(),
    });
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Mark deliverable failed
// ═══════════════════════════════════════════════════════════════════
export const failDeliverable = mutation({
  args: {
    taskId: v.id("client_tasks"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      status: "failed",
      content: `Generation failed: ${args.error}`,
    });
    return null;
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERY: Get single task by ID (internal helper)
// ═══════════════════════════════════════════════════════════════════
export const getClientTaskById = query({
  args: { taskId: v.id("client_tasks") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});
```

- [ ] **Step 2: Verify the module compiles**

Run: `npx convex deploy --typecheck=disable --dry-run`
Expected: Dry run succeeds

- [ ] **Step 3: Commit**

```bash
git add convex/agent_packages.ts
git commit -m "feat: add agent packages module with purchase and delivery flow"
```

---

## Task 3: Update Webhook Handler for Package Payments

**Covers:** [S7]

**Files:**
- Modify: `convex/kora_webhook.ts` (add PKG- prefix handling)

**Interfaces:**
- Consumes: `completePackagePayment` mutation (Task 2)
- Produces: Webhook handler that processes `PKG-` references

- [ ] **Step 1: Read the current webhook handler**

Read `convex/kora_webhook.ts` to find the reference prefix routing.

- [ ] **Step 2: Add PKG- prefix handling**

In `kora_webhook.ts`, add a case for `PKG-` prefix in the webhook handler:

```typescript
// After the existing AGENT- case, add:
if (reference.startsWith("PKG-")) {
  await ctx.runMutation(
    internal.agent_packages.completePackagePayment,
    { reference, status }
  );
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
```

- [ ] **Step 3: Verify the build**

Run: `npx convex deploy --typecheck=disable --dry-run`
Expected: Dry run succeeds

- [ ] **Step 4: Commit**

```bash
git add convex/kora_webhook.ts
git commit -m "feat: handle PKG- payment references in webhook"
```

---

## Task 4: Add Login Prompt to Orchestrator

**Covers:** [S4]

**Files:**
- Modify: `convex/support_orchestrator.ts` (add login prompt threshold)
- Modify: `convex/customer_support.ts` (add login prompt instruction to system prompt)

**Interfaces:**
- Consumes: (none)
- Produces: `processMessage` returns `shouldPromptLogin: boolean` when threshold reached

- [ ] **Step 1: Read customer_support.ts to find system prompt**

Read `convex/customer_support.ts` and find the `buildSystemPrompt` function.

- [ ] **Step 2: Add login prompt instruction to agent system prompts**

In `customer_support.ts`, add this to the end of each agent's system prompt in `buildSystemPrompt`:

```
IMPORTANT: After you have answered the client's questions satisfactorily (after 2-3 exchanges), if the conversation involves a service that has a paid package, you MUST include this exact block at the end of your response:

---LOGIN_PROMPT---
To get your [deliverable name], please login or sign up to proceed with payment and access your deliverable.
[/LOGIN_PROMPT]

Replace [deliverable name] with the appropriate deliverable (e.g., "Business Plan", "CV", "Study Plan").
Only include this block ONCE in the conversation, not in every message.
```

- [ ] **Step 3: Modify processMessage to detect login prompt**

In `support_orchestrator.ts`, modify the `processMessage` action to check if the response contains the login prompt block:

```typescript
// After getting finalResponse (around line 242), add:
const shouldPromptLogin = finalResponse.includes("---LOGIN_PROMPT---");
let cleanedResponse = finalResponse;
if (shouldPromptLogin) {
  cleanedResponse = finalResponse.replace(/---LOGIN_PROMPT---[\s\S]*?\[\/LOGIN_PROMPT---\]/g, "").trim();
}

// In the return object, add:
return {
  // ... existing fields
  response: cleanedResponse,
  shouldPromptLogin,
  agentId: intent.agentId,
};
```

- [ ] **Step 4: Verify the build**

Run: `npx convex deploy --typecheck=disable --dry-run`
Expected: Dry run succeeds

- [ ] **Step 5: Commit**

```bash
git add convex/support_orchestrator.ts convex/customer_support.ts
git commit -m "feat: add login prompt threshold to orchestrator responses"
```

---

## Task 5: Update CustomerSupportChat with Login Prompt

**Covers:** [S4, S5]

**Files:**
- Modify: `src/components/CustomerSupportChat.tsx` (add login prompt button, package selection)

**Interfaces:**
- Consumes: `processMessage` returns `shouldPromptLogin` (Task 4), `AGENT_PACKAGES` (Task 2)
- Produces: Login CTA button in chat, package selection cards

- [ ] **Step 1: Read the current CustomerSupportChat component**

Read `src/components/CustomerSupportChat.tsx` to understand the current structure.

- [ ] **Step 2: Add login prompt button rendering**

After the message rendering loop (around line 209), add a login prompt button that appears when the last assistant message has `shouldPromptLogin: true`:

```tsx
{/* Login Prompt CTA */}
{messages.length > 0 && messages[messages.length - 1].shouldPromptLogin && !userId && (
  <div className="flex justify-start">
    <div className="px-4 py-3 bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 rounded-2xl rounded-bl-md max-w-[85%]">
      <p className="text-xs text-orange-200 mb-2">
        Login to get your deliverable and access your purchased tasks.
      </p>
      <a
        href={`/auth?redirect=${encodeURIComponent(`/dashboard?agent=${activeAgent}`)}`}
        className="inline-block px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-all"
      >
        Login to Continue
      </a>
    </div>
  </div>
)}
```

- [ ] **Step 3: Add shouldPromptLogin to Message interface**

Update the `Message` interface to include the new field:

```typescript
interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isError?: boolean
  agentId?: string
  agentName?: string
  routed?: boolean
  confidence?: string
  icon?: string
  shouldPromptLogin?: boolean  // ADD THIS
}
```

- [ ] **Step 4: Update handleSend to capture shouldPromptLogin**

In the `handleSend` function, when setting the assistant message, include the new field:

```typescript
setMessages(prev => [...prev, {
  role: 'assistant',
  content: result.response,
  timestamp: new Date().toISOString(),
  agentId: routedAgent,
  agentName: result.agentName || AGENT_NAMES[routedAgent] || 'Support',
  icon: result.icon || AGENT_ICONS[routedAgent] || '💬',
  routed: result.routed,
  confidence: result.confidence,
  shouldPromptLogin: result.shouldPromptLogin || false,  // ADD THIS
}])
```

- [ ] **Step 5: Verify the build**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/components/CustomerSupportChat.tsx
git commit -m "feat: add login prompt CTA to support chat"
```

---

## Task 6: Add URL Param Auto-Popup to Dashboard

**Covers:** [S5]

**Files:**
- Modify: `src/routes/dashboard.tsx` (read agent param, auto-open chat)

**Interfaces:**
- Consumes: `CustomerSupportChat` component (existing)
- Produces: Dashboard reads `?agent=A2` and auto-opens chat

- [ ] **Step 1: Read the current dashboard route**

Read `src/routes/dashboard.tsx` to find where the orchestrator state is managed.

- [ ] **Step 2: Add URL param reading on mount**

At the top of the `DashboardContent` component, add:

```typescript
// After existing state declarations, add:
const [autoAgent, setAutoAgent] = useState<string | null>(null)

useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  const agentParam = params.get("agent")
  if (agentParam && /^(A\d{1,2}|GENERAL)$/.test(agentParam)) {
    setAutoAgent(agentParam)
    setShowOrchestrator(true)
    // Clear the URL param
    window.history.replaceState({}, "", "/dashboard")
  }
}, [])
```

- [ ] **Step 3: Pass autoAgent to CustomerSupportChat**

Where `CustomerSupportChat` is rendered, pass the `agentId` prop:

```tsx
{showOrchestrator && (
  <CustomerSupportChat
    agentId={autoAgent || undefined}
    userId={user?._id}
    onClose={() => { setShowOrchestrator(false); setAutoAgent(null) }}
  />
)}
```

- [ ] **Step 4: Verify the build**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/routes/dashboard.tsx
git commit -m "feat: auto-popup agent chat from URL param after login"
```

---

## Task 7: Create Package Selection Component

**Covers:** [S6]

**Files:**
- Create: `src/components/dashboard/PackageSelection.tsx`
- Modify: `src/components/CustomerSupportChat.tsx` (integrate package selection)

**Interfaces:**
- Consumes: `getAgentPackages` query, `initiateAgentPackagePurchase` mutation
- Produces: `PackageSelection` component rendered in chat

- [ ] **Step 1: Create PackageSelection component**

```tsx
import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface PackageSelectionProps {
  agentId: string
  userId: string
  customerEmail?: string
  customerName?: string
  onPurchaseInitiated?: (checkoutUrl: string) => void
}

export function PackageSelection({ agentId, userId, customerEmail, customerName, onPurchaseInitiated }: PackageSelectionProps) {
  const packages = useQuery(api.agent_packages.getAgentPackages, { agentId })
  const initiatePurchase = useMutation(api.agent_packages.initiateAgentPackagePurchase)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePurchase = async (packageId: string) => {
    setLoading(packageId)
    setError(null)

    try {
      const result = await initiatePurchase({
        userId,
        agentId,
        packageId,
        customerEmail,
        customerName,
      })

      if (result.success && result.checkoutUrl) {
        onPurchaseInitiated?.(result.checkoutUrl)
        window.open(result.checkoutUrl, "_blank")
      } else {
        setError(result.error || "Failed to initiate payment")
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  if (!packages || packages.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Available Packages</p>
      {packages.map((pkg) => (
        <div
          key={pkg.id}
          className="bg-slate-800/50 border border-white/10 rounded-xl p-3 hover:border-orange-500/30 transition-all"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-white">{pkg.name}</p>
            <p className="text-xs font-black text-orange-400">
              {pkg.price.toLocaleString()} NGN
            </p>
          </div>
          <p className="text-[10px] text-slate-400 mb-2">{pkg.description}</p>
          <button
            onClick={() => handlePurchase(pkg.id)}
            disabled={loading !== null}
            className="w-full py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold rounded-lg transition-all disabled:opacity-50"
          >
            {loading === pkg.id ? "Processing..." : "Select & Pay"}
          </button>
        </div>
      ))}
      {error && (
        <p className="text-[10px] text-red-400 mt-1">{error}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Integrate PackageSelection into CustomerSupportChat**

In `CustomerSupportChat.tsx`, import and render `PackageSelection` when the user is logged in and the agent has packages:

```tsx
import { PackageSelection } from './dashboard/PackageSelection'

// Inside the messages area, after the messages map, add:
{userId && activeAgent && activeAgent !== 'GENERAL' && messages.length > 0 && (
  <div className="px-4 py-2">
    <PackageSelection
      agentId={activeAgent}
      userId={userId}
      customerEmail={userEmail}
      customerName={userName}
    />
  </div>
)}
```

- [ ] **Step 3: Verify the build**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/PackageSelection.tsx src/components/CustomerSupportChat.tsx
git commit -m "feat: add package selection UI to support chat"
```

---

## Task 8: Create My Tasks Dashboard Section

**Covers:** [S9]

**Files:**
- Create: `src/components/dashboard/MyTasks.tsx`
- Modify: `src/routes/dashboard.tsx` (add My Tasks tab)

**Interfaces:**
- Consumes: `getClientTasks` query (Task 2)
- Produces: `MyTasks` component, new dashboard tab

- [ ] **Step 1: Create MyTasks component**

```tsx
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const AGENT_NAMES: Record<string, string> = {
  A1: 'Academic Pro', A2: 'Business Pro', A3: 'Content Pro',
  A4: 'Career Pro', A5: 'Personal Shopper', A6: 'Exam Pro',
  A7: 'Finance Pro', A8: 'MediaStudio Pro', A9: 'Health Pro',
  A10: 'Home Services Pro', A11: 'Language Tutor', A12: 'Travel Planner',
  A13: 'ServiceMart NG', A14: 'Translation Hub', A15: 'Event Planner',
}

const AGENT_ICONS: Record<string, string> = {
  A1: '🎓', A2: '💼', A3: '✍️', A4: '📄', A5: '🛍️',
  A6: '📝', A7: '💰', A8: '🎬', A9: '🏥', A10: '🧹',
  A11: '🗣️', A12: '✈️', A13: '🚀', A14: '📝', A15: '🎉',
}

export function MyTasks({ userId }: { userId: string }) {
  const tasks = useQuery(api.agent_packages.getClientTasks, { userId })

  if (!tasks) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-sm text-slate-400">No tasks yet</p>
        <p className="text-xs text-slate-500 mt-1">Chat with an agent and purchase a package to get started</p>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400',
    generating: 'bg-blue-500/10 text-blue-400',
    delivered: 'bg-emerald-500/10 text-emerald-400',
    failed: 'bg-red-500/10 text-red-400',
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-sm">My Tasks</h3>
        <span className="text-xs text-slate-500">{tasks.length} total</span>
      </div>

      {tasks.map((task: any) => (
        <div key={task._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{AGENT_ICONS[task.agentId] || '📋'}</span>
              <div>
                <p className="text-sm font-bold text-white">{task.packageName}</p>
                <p className="text-[10px] text-slate-500">
                  {AGENT_NAMES[task.agentId] || task.agentId}
                </p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[task.status] || ''}`}>
              {task.status}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span>Purchased: {new Date(task.createdAt).toLocaleDateString()}</span>
            <span>Amount: {(task.amount / 100).toLocaleString()} NGN</span>
          </div>

          {task.status === 'delivered' && task.content && (
            <div className="mt-3 bg-slate-800 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Deliverable</p>
              <div className="text-xs text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
                {task.content}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(task.content)
                }}
                className="mt-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-white rounded-lg"
              >
                Copy to Clipboard
              </button>
            </div>
          )}

          {task.status === 'pending' && (
            <div className="mt-2 text-[10px] text-yellow-400">
              Waiting for payment confirmation...
            </div>
          )}

          {task.status === 'generating' && (
            <div className="mt-2 text-[10px] text-blue-400">
              Generating your deliverable...
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Add My Tasks tab to dashboard**

In `src/routes/dashboard.tsx`, add the tab to the tabs array and render the component:

```tsx
// Add to the tabs array:
{ id: 'my-tasks', label: 'My Tasks', icon: '📋' },

// Add the tab content:
{activeTab === 'my-tasks' && user && (
  <MyTasks userId={user._id} />
)}

// Import at the top:
import { MyTasks } from "~/components/dashboard/MyTasks"
```

- [ ] **Step 3: Verify the build**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/MyTasks.tsx src/routes/dashboard.tsx
git commit -m "feat: add My Tasks dashboard section for deliverable access"
```

---

## Task 9: Update Payment Callback for Package Payments

**Covers:** [S7]

**Files:**
- Modify: `src/routes/payment/callback.tsx` (handle PKG- references)

**Interfaces:**
- Consumes: `verifyPayment` from kora_checkout, `completePackagePayment` from agent_packages
- Produces: Payment callback that processes package payments and triggers deliverable generation

- [ ] **Step 1: Read the current payment callback**

Read `src/routes/payment/callback.tsx` to understand the current flow.

- [ ] **Step 2: Add PKG- reference handling**

In the payment callback, add handling for `PKG-` references:

```typescript
// After successful verification, add:
if (txRef.startsWith("PKG-")) {
  // Package payment - trigger deliverable generation
  try {
    const completionResult = await convex.mutation(
      api.agent_packages.completePackagePayment,
      { reference: txRef, status: "success" }
    )

    if (completionResult.success && completionResult.taskId) {
      // Trigger deliverable generation in background
      convex.action(api.agent_packages.generateDeliverable, {
        taskId: completionResult.taskId,
      })
    }
  } catch (e) {
    console.error("Package payment completion error:", e)
  }
}
```

- [ ] **Step 3: Verify the build**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/routes/payment/callback.tsx
git commit -m "feat: handle PKG- payment references in callback and trigger delivery"
```

---

## Task 10: End-to-End Test

**Covers:** [S3, S4, S5, S6, S7, S8, S9]

**Files:**
- Create: `convex/agent_packages.test.ts`

**Interfaces:**
- Consumes: All mutations and queries from Task 2
- Produces: Test file verifying the full flow

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect } from "vitest";
import { convexTest } from "../test-utils";
import schema from "./schema";
import { api } from "./_generated/api";

describe("Agent Packages", () => {
  it("returns packages for known agent", async () => {
    const t = convexTest(schema);
    const packages = await t.query(api.agent_packages.getAgentPackages, { agentId: "A2" });
    expect(packages.length).toBeGreaterThan(0);
    expect(packages[0]).toHaveProperty("id");
    expect(packages[0]).toHaveProperty("price");
  });

  it("returns empty for unknown agent", async () => {
    const t = convexTest(schema);
    const packages = await t.query(api.agent_packages.getAgentPackages, { agentId: "A99" });
    expect(packages).toEqual([]);
  });

  it("returns all packages", async () => {
    const t = convexTest(schema);
    const all = await t.query(api.agent_packages.getAllPackages, {});
    expect(Object.keys(all).length).toBe(15);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run convex/agent_packages.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add convex/agent_packages.test.ts
git commit -m "test: add agent packages module tests"
```

---

## Summary

| Task | Type | Description | Spec |
|------|------|-------------|------|
| 1 | Schema | Add `client_tasks` table | [S10] |
| 2 | Backend | Create agent packages module | [S3] |
| 3 | Backend | Update webhook for PKG- payments | [S7] |
| 4 | Backend | Add login prompt to orchestrator | [S4] |
| 5 | Frontend | Update chat with login prompt | [S4, S5] |
| 6 | Frontend | URL param auto-popup on dashboard | [S5] |
| 7 | Frontend | Package selection component | [S6] |
| 8 | Frontend | My Tasks dashboard section | [S9] |
| 9 | Frontend | Payment callback for packages | [S7] |
| 10 | Test | End-to-end tests | All |

**Total Tasks:** 10
**Estimated Time:** 60-90 minutes
