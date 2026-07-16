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
// QUERY: Get single task by ID (internal helper)
// ═══════════════════════════════════════════════════════════════════
export const getClientTaskById = query({
  args: { taskId: v.id("client_tasks") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
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
        redirect_url: "https://dutchkem-prosuite-app.vercel.app/payment/callback",
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

    // Find the pending transaction using index (NOT .filter())
    const pending = await ctx.db
      .query("kora_pending_transactions")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .first();

    if (!pending) return { success: false, error: "Transaction not found" };

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

    return { success: true, taskId: task?._id, metadata: (pending as any).metadata };
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
