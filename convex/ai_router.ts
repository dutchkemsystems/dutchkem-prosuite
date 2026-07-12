import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// INTELLIGENT AI ROUTER
// Automatically detects task types and routes to best AI provider
// ═══════════════════════════════════════════════════════════════════

const TASK_PATTERNS: Record<string, { keywords: string[]; provider: string; model: string }> = {
  academic: {
    keywords: ['thesis', 'dissertation', 'research paper', 'literature review', 'methodology', 'academic', 'citation', 'reference', 'JAMB', 'WAEC', 'NECO', 'university', 'polytechnic', 'school', 'exam', 'study', 'lecture'],
    provider: 'openrouter',
    model: 'nvidia/llama-3.3-70b-instruct:free',
  },
  business: {
    keywords: ['business plan', 'strategy', 'pitch deck', 'financial', 'market research', 'startup', 'investor', 'SME', 'small business', 'entrepreneur', 'profit', 'revenue', 'company', 'enterprise', 'NGN', 'naira', 'kora pay', 'payment', 'invoice', 'billing', 'tax', 'VAT', 'CAC', 'company registration'],
    provider: 'openrouter',
    model: 'nvidia/llama-3.3-70b-instruct:free',
    fallbackModel: 'tencent/hy3',
  },
  content: {
    keywords: ['blog post', 'article', 'social media', 'captions', 'email newsletter', 'copywriting', 'content', 'post', 'tweet', 'linkedin post', 'instagram caption', 'tiktok', 'facebook post'],
    provider: 'groq',
    model: 'llama3-70b-8192',
  },
  creative: {
    keywords: ['story', 'poem', 'script', 'dialogue', 'creative writing', 'fiction', 'narrative', 'video script', 'voiceover'],
    provider: 'groq',
    model: 'llama3-70b-8192',
  },
  design: {
    keywords: ['image', 'design', 'flyer', 'poster', 'logo', 'banner', 'visual', 'graphic', 'brochure', 'catalog', 'business card'],
    provider: 'mimo',
    model: 'mimo-v2.5',
  },
  analysis: {
    keywords: ['analyze', 'summary', 'extract', 'insight', 'trend', 'compare', 'evaluate', 'report', 'dashboard', 'metrics', 'KPI', 'ROI'],
    provider: 'openrouter',
    model: 'nvidia/llama-3.3-70b-instruct:free',
    fallbackModel: 'tencent/hy3',
  },
  chat: {
    keywords: ['hello', 'hi', 'how', 'what', 'help', 'question', 'chat', 'please', 'thank', 'good morning', 'good afternoon'],
    provider: 'groq',
    model: 'llama3-70b-8192',
  },
  audio: {
    keywords: ['audio', 'voice', 'speak', 'transcribe', 'speech', 'text to speech', 'podcast', 'voiceover', 'narration'],
    provider: 'mimo',
    model: 'mimo-v2.5',
  },
  video: {
    keywords: ['video', 'movie', 'clip', 'animation', 'cinematic', 'reel', 'short', 'promo', 'advertisement', 'commercial', 'production', 'film', 'direct', 'scene', 'shot', 'frame', 'render', '3d', '4k', 'hd', 'quality', 'professional', 'studio'],
    provider: 'mimo',
    model: 'mimo-v2.5',
  },
  advert_creation: {
    keywords: ['advert', 'ad', 'flyer', 'poster', 'promotion', 'marketing', 'campaign', 'banner', 'social media ad', 'google ad', 'facebook ad'],
    provider: 'mimo',
    model: 'mimo-v2.5',
  },
  code: {
    keywords: ['code', 'programming', 'developer', 'script', 'function', 'bug', 'debug', 'api', 'database', 'sql', 'python', 'javascript', 'html', 'css', 'react', 'node'],
    provider: 'mistral',
    model: 'mistralai/codestral',
    fallbackModel: 'groq',
  },
  research: {
    keywords: ['research', 'analyze', 'study', 'investigate', 'deep dive', 'comprehensive', 'detailed analysis', 'literature'],
    provider: 'mistral',
    model: 'mistralai/magistral-medium',
    fallbackModel: 'openrouter',
  },
  nigerian_business: {
    keywords: ['Nigeria', 'Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'naira', 'NGN', 'SME', 'small business', 'Nigerian', 'West Africa', 'Africa', 'Lagos business', 'Nigerian startup', 'tech company Nigeria', 'Kora Pay', 'Paystack', 'Flutterwave', 'bank transfer', 'POS', 'USSD'],
    provider: 'openrouter',
    model: 'nvidia/llama-3.3-70b-instruct:free',
  },
  nigerian_content: {
    keywords: ['Nigerian content', 'Afrobeats', 'Nollywood', 'Nigerian culture', 'Lagos life', 'Nigerian food', 'Nigerian fashion', 'African tech', 'Made in Nigeria', 'Buy Nigerian'],
    provider: 'groq',
    model: 'llama3-70b-8192',
  },
  nigerian_services: {
    keywords: ['plumber Lagos', 'electrician Abuja', 'hairdresser', 'cleaning service', 'delivery Lagos', 'logistics Nigeria', 'transport', 'hire', 'professional', 'contractor'],
    provider: 'groq',
    model: 'llama3-70b-8192',
  },
};

const AGENT_TASK_MAP: Record<string, string> = {
  A1: 'academic', A2: 'business', A3: 'content', A4: 'business',
  A5: 'design', A6: 'academic', A7: 'analysis', A8: 'video',
  A9: 'analysis', A10: 'content', A11: 'chat', A12: 'business',
  A13: 'academic', A14: 'content', A15: 'business',
  A16: 'advert_creation', A17: 'audio',
};

// ═══════════════════════════════════════════════════════════════════
// TASK DETECTION
// ═══════════════════════════════════════════════════════════════════

export const detectTask = action({
  args: {
    input: v.string(),
    agentId: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const inputLower = args.input.toLowerCase();
    let bestMatch = { type: 'chat', provider: 'groq', model: 'llama3-70b-8192', confidence: 0.5 };

    for (const [taskType, pattern] of Object.entries(TASK_PATTERNS)) {
      let matchCount = 0;
      for (const keyword of pattern.keywords) {
        if (inputLower.includes(keyword.toLowerCase())) matchCount++;
      }
      const confidence = (matchCount / pattern.keywords.length) * 0.8;
      if (confidence > bestMatch.confidence) {
        bestMatch = { type: taskType, provider: pattern.provider, model: pattern.model, confidence };
      }
    }

    // Override with agent-specific knowledge
    if (args.agentId && AGENT_TASK_MAP[args.agentId]) {
      const agentTask = AGENT_TASK_MAP[args.agentId];
      const pattern = TASK_PATTERNS[agentTask];
      if (pattern && bestMatch.confidence < 0.5) {
        bestMatch = { type: agentTask, provider: pattern.provider, model: pattern.model, confidence: 0.7 };
      }
    }

    return bestMatch;
  },
});

// ═══════════════════════════════════════════════════════════════════
// SMART ROUTER
// ═══════════════════════════════════════════════════════════════════

export const routeRequest = action({
  args: {
    input: v.string(),
    agentId: v.optional(v.string()),
    adminToken: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const startTime = Date.now();

    // Detect task
    const task = await ctx.runAction(internal.ai_router.detectTask, {
      input: args.input,
      agentId: args.agentId,
    });

    // Route to appropriate provider (respecting model toggles)
    let result: any;
    let usedProvider = task.provider;
    const primaryEnabled = await ctx.runQuery(internal.model_toggle.checkModel, { modelName: task.provider });
    if (primaryEnabled) {
      try {
        result = await ctx.runAction(internal.ai_router.callProvider, {
          provider: task.provider,
          model: task.model,
          input: args.input,
          systemPrompt: args.systemPrompt,
        });
      } catch (error: any) {
        console.log(`Primary provider ${task.provider} failed, trying fallbacks...`);
      }
    }

    // Fallback sequence — only try enabled models
    // FreeLLMAPI is last in fallback (free tier, 161+ models from 18 providers)
    if (!result) {
      const fallbackOrder = ['groq', 'openrouter', 'mimo', 'nvidia', 'aiml', 'tencent', 'mistral', 'freellmapi'];
      for (const provider of fallbackOrder) {
        if (provider === task.provider) continue;
        
        // Skip freellmapi if not configured
        if (provider === 'freellmapi') {
          const freellmapiConfigured = await ctx.runQuery(internal.freellmapi.getStatus, {});
          if (!freellmapiConfigured.configured) continue;
          
          try {
            const messages = [
              ...(args.systemPrompt ? [{ role: 'system', content: args.systemPrompt }] : []),
              { role: 'user', content: args.input },
            ];
            const freellmResult = await ctx.runAction(internal.freellmapi.chatCompletion, {
              messages,
              useCase: task.type,
            });
            if (freellmResult.success && freellmResult.content) {
              result = { content: freellmResult.content, model: freellmResult.model };
              usedProvider = 'freellmapi';
              break;
            }
          } catch (e) {
            continue;
          }
          continue;
        }
        
        const isEnabled = await ctx.runQuery(internal.model_toggle.checkModel, { modelName: provider });
        if (!isEnabled) continue;
        try {
          const fallbackModel = provider === 'groq' ? 'llama3-70b-8192' : provider === 'tencent' ? 'tencent/hy3' : 'nvidia/llama-3.3-70b-instruct:free';
          result = await ctx.runAction(internal.ai_router.callProvider, {
            provider,
            model: fallbackModel,
            input: args.input,
            systemPrompt: args.systemPrompt,
          });
          usedProvider = provider;
          break;
        } catch (e) {
          continue;
        }
      }
    }

    const responseTimeMs = Date.now() - startTime;
    const success = !!result?.content;

    // Log usage to analytics
    await ctx.runMutation(internal.model_analytics.logUsage, {
      modelName: usedProvider,
      taskType: task.type,
      input: args.input.substring(0, 200),
      agentId: args.agentId || "",
      success,
      responseTimeMs,
      errorMessage: success ? undefined : result?.error || "All providers failed",
      tokenCount: result?.content ? Math.ceil(result.content.length / 4) : 0,
    });

    // Log routing (legacy)
    await ctx.runMutation(internal.ai_router.logRouting, {
      input: args.input.substring(0, 100),
      task: task.type,
      provider: usedProvider,
      model: result?.model || task.model,
      confidence: task.confidence,
      success,
    });

    return {
      success,
      content: result?.content || (success ? '' : "All AI providers are currently disabled or unavailable. Contact your administrator."),
      task: task.type,
      provider: usedProvider,
      confidence: task.confidence,
      responseTimeMs,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// CALL PROVIDER
// ═══════════════════════════════════════════════════════════════════

export const callProvider = internalAction({
  args: {
    provider: v.string(),
    model: v.string(),
    input: v.string(),
    systemPrompt: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const systemPrompt = args.systemPrompt || 'You are a helpful assistant for DutchKem Ventures.';

    if (args.provider === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: args.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: args.input },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
      const data = await response.json();
      return { content: data.choices?.[0]?.message?.content || '' };
    }

    if (args.provider === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: args.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: args.input },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) throw new Error(`GROQ error: ${response.status}`);
      const data = await response.json();
      return { content: data.choices?.[0]?.message?.content || '' };
    }

    // Tencent Hy3 via OpenRouter (free tier, 1M context)
    if (args.provider === 'tencent') {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tencent/hy3',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: args.input },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) throw new Error(`Tencent Hy3 error: ${response.status}`);
      const data = await response.json();
      return { content: data.choices?.[0]?.message?.content || '' };
    }

    // Mistral AI via OpenRouter
    if (args.provider === 'mistral') {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: args.model || 'mistralai/mistral-large-3',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: args.input },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) throw new Error(`Mistral error: ${response.status}`);
      const data = await response.json();
      return { content: data.choices?.[0]?.message?.content || '' };
    }

    throw new Error(`Unknown provider: ${args.provider}`);
  },
});

// ═══════════════════════════════════════════════════════════════════
// AUTOMATED AD GENERATION
// ═══════════════════════════════════════════════════════════════════

const AD_TEMPLATES = [
  { id: 'promotional', headline: 'Special Offer!', subtext: 'Limited time only', cta: 'Contact us today' },
  { id: 'event', headline: 'Join Us!', subtext: 'Don\'t miss this event', cta: 'Register now' },
  { id: 'product', headline: 'New Product', subtext: 'Experience the difference', cta: 'Learn more' },
  { id: 'announcement', headline: 'Important Update', subtext: 'Stay informed', cta: 'Read more' },
  { id: 'flyer', headline: 'Hot Deal!', subtext: 'Best prices guaranteed', cta: 'Shop now' },
];

export const generateAd = action({
  args: {
    adminToken: v.string(),
    template: v.optional(v.string()),
    product: v.optional(v.string()),
    headline: v.optional(v.string()),
    subtext: v.optional(v.string()),
    cta: v.optional(v.string()),
    platform: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const template = AD_TEMPLATES.find(t => t.id === args.template) || AD_TEMPLATES[0];

    // Generate ad copy using smart router
    const copyPrompt = `Write a compelling ad for ${args.product || 'Dutchkem Ventures services'}.
    Headline: ${args.headline || template.headline}
    Subtext: ${args.subtext || template.subtext}
    CTA: ${args.cta || template.cta}
    Make it engaging and professional.`;

    const copyResult = await ctx.runAction(internal.ai_router.routeRequest, {
      input: copyPrompt,
      systemPrompt: 'You are a professional copywriter specializing in compelling ad copy.',
    });

    // Generate poster image
    const imageResult = await ctx.runAction(internal.ai_image_generator.generatePosterOpenSource, {
      adminToken: args.adminToken,
      headline: args.headline || template.headline,
      subheadline: args.subtext || template.subtext,
      cta: args.cta || template.cta,
      url: 'https://dutchkem-prosuite-app.vercel.app/auth',
      template: 'promotional',
    });

    return {
      success: true,
      copy: copyResult.content,
      imageUrl: imageResult.imageUrl,
      headline: args.headline || template.headline,
      subtext: args.subtext || template.subtext,
      cta: args.cta || template.cta,
      url: 'https://dutchkem-prosuite-app.vercel.app/auth',
      platform: args.platform || 'all',
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// LOG ROUTING
// ═══════════════════════════════════════════════════════════════════

export const logRouting = internalMutation({
  args: {
    input: v.string(),
    task: v.string(),
    provider: v.string(),
    model: v.string(),
    confidence: v.number(),
    success: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("mimo_health_logs", {
      component: `ai_router_${args.task}`,
      status: args.success ? "healthy" : "error",
      responseTimeMs: 0,
      details: JSON.stringify(args),
      checksRun: 1,
      checksPassed: args.success ? 1 : 0,
      checksFailed: args.success ? 0 : 1,
      issuesFound: args.success ? 0 : 1,
      issuesAutoFixed: 0,
      severity: args.success ? "info" : "warning",
      timestamp: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getRouterStats = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return null;

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentLogs = await ctx.db
      .query("mimo_health_logs")
      .filter((q) => 
        q.gte(q.field("timestamp"), oneDayAgo).and(
          q.gt(q.field("component"), "ai_router_").and(q.lt(q.field("component"), "ai_router_z"))
        )
      )
      .collect();

    const byTask: Record<string, number> = {};
    const byProvider: Record<string, number> = {};
    for (const log of recentLogs) {
      try {
        const details = JSON.parse(log.details);
        byTask[details.task] = (byTask[details.task] || 0) + 1;
        byProvider[details.provider] = (byProvider[details.provider] || 0) + 1;
      } catch {}
    }

    return {
      totalRequests: recentLogs.length,
      successRate: recentLogs.length > 0 ? ((recentLogs.filter(l => l.status === "healthy").length / recentLogs.length) * 100).toFixed(1) : "0",
      byTask,
      byProvider,
    };
  },
});

export const getTaskTypes = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return Object.entries(TASK_PATTERNS).map(([type, pattern]) => ({
      type,
      provider: pattern.provider,
      model: pattern.model,
      keywords: pattern.keywords.length,
    }));
  },
});
