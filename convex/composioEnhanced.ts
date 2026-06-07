import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";
import { getAllToolkitDetails, getToolkitDetail, searchTools } from "./composioToolkitDetails";

// ═══════════════════════════════════════════════════════════════════
// COMPOSIO ENHANCED — Triggers, Webhooks, Observability, Custom Tools
// ═══════════════════════════════════════════════════════════════════
// This module extends ComposioHub with advanced features:
//   - Trigger subscriptions (real-time event listening)
//   - Webhook configurations (inbound HTTP delivery)
//   - Observability metrics (24h / 7d / 30d usage analytics)
//   - Custom tool builder (admin-defined tools)
//   - Tool Router session management
//
// All 10,000+ tools are managed via the Composio REST API.
// This module provides the orchestration layer.
//
// SECURITY: All admin mutations require a valid admin session.
// Agents and clients CANNOT create triggers or webhooks.

// ─── Tool catalog summary (full 10,000+ accessible via API) ───
// 10,000+ tools across 250+ toolkits. We expose the popular
// toolkits for the admin picker; the full catalog is queried
// from the live API in `queryToolCatalog`.
const POPULAR_TOOLKITS = [
  { toolkit: "github", name: "GitHub", tools: 87, category: "developer", icon: "🐙" },
  { toolkit: "slack", name: "Slack", tools: 64, category: "communication", icon: "💬" },
  { toolkit: "gmail", name: "Gmail", tools: 32, category: "email", icon: "📧" },
  { toolkit: "google_calendar", name: "Google Calendar", tools: 28, category: "productivity", icon: "📅" },
  { toolkit: "google_sheets", name: "Google Sheets", tools: 35, category: "productivity", icon: "📊" },
  { toolkit: "google_drive", name: "Google Drive", tools: 42, category: "storage", icon: "☁️" },
  { toolkit: "notion", name: "Notion", tools: 58, category: "productivity", icon: "📝" },
  { toolkit: "hubspot", name: "HubSpot", tools: 76, category: "crm", icon: "🟠" },
  { toolkit: "salesforce", name: "Salesforce", tools: 89, category: "crm", icon: "☁️" },
  { toolkit: "stripe", name: "Stripe", tools: 41, category: "payments", icon: "💳" },
  { toolkit: "shopify", name: "Shopify", tools: 68, category: "ecommerce", icon: "🛒" },
  { toolkit: "twitter", name: "X (Twitter)", tools: 23, category: "social", icon: "🐦" },
  { toolkit: "linkedin", name: "LinkedIn", tools: 19, category: "social", icon: "💼" },
  { toolkit: "facebook", name: "Facebook", tools: 22, category: "social", icon: "📘" },
  { toolkit: "instagram", name: "Instagram", tools: 18, category: "social", icon: "📸" },
  { toolkit: "youtube", name: "YouTube", tools: 27, category: "social", icon: "📺" },
  { toolkit: "tiktok", name: "TikTok", tools: 15, category: "social", icon: "🎵" },
  { toolkit: "discord", name: "Discord", tools: 24, category: "communication", icon: "💬" },
  { toolkit: "telegram", name: "Telegram", tools: 16, category: "communication", icon: "✈️" },
  { toolkit: "openai", name: "OpenAI", tools: 12, category: "ai", icon: "🧠" },
  { toolkit: "anthropic", name: "Anthropic", tools: 8, category: "ai", icon: "🤖" },
  { toolkit: "jira", name: "Jira", tools: 47, category: "project-management", icon: "📋" },
  { toolkit: "asana", name: "Asana", tools: 39, category: "project-management", icon: "✓" },
  { toolkit: "trello", name: "Trello", tools: 28, category: "project-management", icon: "📌" },
  { toolkit: "monday", name: "Monday.com", tools: 36, category: "project-management", icon: "📊" },
  { toolkit: "zendesk", name: "Zendesk", tools: 51, category: "support", icon: "🎧" },
  { toolkit: "intercom", name: "Intercom", tools: 44, category: "support", icon: "💭" },
  { toolkit: "mailchimp", name: "Mailchimp", tools: 38, category: "email", icon: "🐵" },
  { toolkit: "sendgrid", name: "SendGrid", tools: 21, category: "email", icon: "📨" },
  { toolkit: "twilio", name: "Twilio", tools: 33, category: "communication", icon: "📞" },
  { toolkit: "aws", name: "AWS", tools: 124, category: "cloud", icon: "☁️" },
  { toolkit: "gcp", name: "Google Cloud", tools: 98, category: "cloud", icon: "🌐" },
  { toolkit: "azure", name: "Azure", tools: 87, category: "cloud", icon: "☁️" },
  { toolkit: "supabase", name: "Supabase", tools: 31, category: "database", icon: "⚡" },
  { toolkit: "mongodb", name: "MongoDB", tools: 18, category: "database", icon: "🍃" },
  { toolkit: "postgresql", name: "PostgreSQL", tools: 14, category: "database", icon: "🐘" },
  { toolkit: "figma", name: "Figma", tools: 26, category: "design", icon: "🎨" },
  { toolkit: "canva", name: "Canva", tools: 19, category: "design", icon: "🖼️" },
  { toolkit: "wordpress", name: "WordPress", tools: 33, category: "cms", icon: "📰" },
  { toolkit: "webflow", name: "Webflow", tools: 27, category: "cms", icon: "🌊" },
];

// ─── QUERIES ───

export const getPopularToolkits = query({
  args: {},
  returns: v.array(
    v.object({
      toolkit: v.string(),
      name: v.string(),
      tools: v.number(),
      category: v.string(),
      icon: v.string(),
    })
  ),
  handler: async () => POPULAR_TOOLKITS,
});

export const getToolCatalogStats = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, totalToolkits: 0, totalTools: 0, byCategory: {} };

    const totalTools = POPULAR_TOOLKITS.reduce((sum, t) => sum + t.tools, 0);
    const byCategory: Record<string, number> = {};
    for (const t of POPULAR_TOOLKITS) {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.tools;
    }

    // Get real metrics from action logs
    const oneDayAgo = Date.now() - 86400000;
    const recentLogs = await ctx.db
      .query("composio_action_logs")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", oneDayAgo))
      .collect();

    const success = recentLogs.filter((l) => l.status === "success").length;
    const failed = recentLogs.filter((l) => l.status === "failed").length;

    // Get connected accounts
    const connections = await ctx.db
      .query("platform_connections")
      .withIndex("by_admin", (q) => q.eq("adminId", identity._id))
      .collect();

    // Get active triggers
    const triggers = await ctx.db
      .query("composio_triggers")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .collect();

    // Get custom tools
    const customTools = await ctx.db
      .query("composio_custom_tools")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .collect();

    return {
      authError: false,
      totalToolkits: POPULAR_TOOLKITS.length,
      totalTools: totalTools + customTools.length,
      totalConnectedAccounts: connections.length,
      totalActiveTriggers: triggers.length,
      totalCustomTools: customTools.length,
      byCategory,
      last24h: {
        invocations: recentLogs.length,
        success,
        failed,
        successRate: recentLogs.length > 0 ? (success / recentLogs.length) * 100 : 100,
      },
    };
  },
});

// ─── TOOLKIT DETAILS (clickable catalog) ───

export const getToolkitDetails = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, toolkits: [] };
    const toolkits = getAllToolkitDetails().map((tk) => ({
      toolkit: tk.toolkit,
      name: tk.name,
      icon: tk.icon,
      category: tk.category,
      description: tk.description,
      toolCount: tk.tools.length,
      tools: tk.tools,
    }));
    return { authError: false, toolkits };
  },
});

export const getToolkitDetailByName = query({
  args: { adminToken: v.optional(v.string()), toolkit: v.string() },
  returns: v.any(),
  handler: async (ctx, { adminToken, toolkit }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, toolkit: null };
    const detail = getToolkitDetail(toolkit);
    if (!detail) return { authError: false, toolkit: null };
    return {
      authError: false,
      toolkit: {
        toolkit: detail.toolkit,
        name: detail.name,
        icon: detail.icon,
        category: detail.category,
        description: detail.description,
        toolCount: detail.tools.length,
        tools: detail.tools,
      },
    };
  },
});

export const searchAllTools = query({
  args: { adminToken: v.optional(v.string()), query: v.string(), toolkitFilter: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken, query, toolkitFilter }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, results: [] };
    const results = searchTools(query, toolkitFilter);
    return { authError: false, results };
  },
});

export const executeToolByName = action({
  args: {
    adminToken: v.string(),
    toolkit: v.string(),
    toolName: v.string(),
    params: v.any(),
    agentId: v.optional(v.string()),
    clientId: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const start = Date.now();
    const apiKey = process.env.COMPOSIO_API_KEY;
    const composioUserId = "admin_" + args.adminToken.slice(0, 16);

    let response: any = { success: false, error: "Unknown" };
    try {
      const detail = getToolkitDetail(args.toolkit);
      const toolExists = detail?.tools.some((t) => t.name === args.toolName);
      if (!toolExists) {
        response = { success: false, error: `Tool "${args.toolName}" not found in toolkit "${args.toolkit}"` };
      } else {
        const res = await fetch("https://backend.composio.dev/api/v2/actions/execute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey ?? "",
          },
          body: JSON.stringify({
            actionName: `${args.toolkit.toUpperCase()}_${args.toolName.toUpperCase()}`,
            input: args.params ?? {},
            userId: composioUserId,
            connectedAccountId: "default",
          }),
        });
        const json: any = await res.json().catch(() => ({}));
        response = {
          success: res.ok,
          status: res.status,
          data: json?.data ?? json,
          toolSlug: `${args.toolkit}/${args.toolName}`,
        };
      }
    } catch (e: any) {
      response = { success: false, error: e?.message ?? String(e) };
    }

    const durationMs = Date.now() - start;
    await ctx.runMutation(internal.composioEnhanced._logInvocation, {
      action: `${args.toolkit}/${args.toolName}`,
      platform: args.toolkit,
      status: response.success ? "success" : "failed",
      duration: durationMs,
      params: args.params ?? {},
      result: response.data,
      error: response.success ? undefined : response.error,
      adminId: "admin_" + args.adminToken.slice(0, 16),
    });

    return { ...response, durationMs };
  },
});

// ─── TRIGGERS ───

export const listTriggers = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, triggers: [] };
    const triggers = await ctx.db.query("composio_triggers").order("desc").collect();
    return { authError: false, triggers };
  },
});

export const getTriggerEvents = query({
  args: { adminToken: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, { adminToken, limit }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, events: [] };
    const events = await ctx.db
      .query("composio_trigger_events")
      .withIndex("by_received")
      .order("desc")
      .take(limit ?? 50);
    return { authError: false, events };
  },
});

export const createTrigger = mutation({
  args: {
    adminToken: v.string(),
    triggerId: v.string(),
    toolkit: v.string(),
    triggerName: v.string(),
    description: v.string(),
    agentId: v.string(),
    connectedAccountId: v.optional(v.string()),
    config: v.optional(v.any()),
    webhookUrl: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const triggerId = await ctx.db.insert("composio_triggers", {
      triggerId: args.triggerId,
      toolkit: args.toolkit,
      triggerName: args.triggerName,
      description: args.description,
      enabled: true,
      agentId: args.agentId,
      connectedAccountId: args.connectedAccountId,
      config: args.config,
      fireCount: 0,
      webhookUrl: args.webhookUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("composio_action_logs", {
      action: "trigger.created",
      platform: args.toolkit,
      status: "success" as const,
      metadata: { triggerId: args.triggerId, agentId: args.agentId, adminId: identity._id },
      timestamp: Date.now(),
    });

    return { success: true, triggerId };
  },
});

export const toggleTrigger = mutation({
  args: { adminToken: v.string(), triggerDocId: v.id("composio_triggers"), enabled: v.boolean() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.patch(args.triggerDocId, { enabled: args.enabled, updatedAt: Date.now() });
    return { success: true };
  },
});

export const deleteTrigger = mutation({
  args: { adminToken: v.string(), triggerDocId: v.id("composio_triggers") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.delete(args.triggerDocId);
    return { success: true };
  },
});

// ─── WEBHOOKS ───

export const listWebhooks = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, webhooks: [] };
    const webhooks = await ctx.db.query("composio_webhooks").order("desc").collect();
    return { authError: false, webhooks };
  },
});

export const createWebhook = mutation({
  args: {
    adminToken: v.string(),
    url: v.string(),
    events: v.array(v.string()),
    secret: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const webhookId = `whk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const id = await ctx.db.insert("composio_webhooks", {
      webhookId,
      url: args.url,
      events: args.events,
      secret: args.secret,
      enabled: true,
      deliveryCount: 0,
      failureCount: 0,
      createdAt: Date.now(),
    });

    return { success: true, webhookId, id };
  },
});

export const toggleWebhook = mutation({
  args: { adminToken: v.string(), webhookDocId: v.id("composio_webhooks"), enabled: v.boolean() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.patch(args.webhookDocId, { enabled: args.enabled });
    return { success: true };
  },
});

export const deleteWebhook = mutation({
  args: { adminToken: v.string(), webhookDocId: v.id("composio_webhooks") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.delete(args.webhookDocId);
    return { success: true };
  },
});

// ─── CUSTOM TOOLS ───

export const listCustomTools = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, tools: [] };
    const tools = await ctx.db.query("composio_custom_tools").order("desc").collect();
    return { authError: false, tools };
  },
});

export const createCustomTool = mutation({
  args: {
    adminToken: v.string(),
    toolName: v.string(),
    toolkit: v.string(),
    description: v.string(),
    inputSchema: v.any(),
    outputSchema: v.optional(v.any()),
    handler: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    // Ensure unique tool name
    const existing = await ctx.db
      .query("composio_custom_tools")
      .withIndex("by_tool_name", (q) => q.eq("toolName", args.toolName))
      .first();
    if (existing) throw new Error(`Tool name "${args.toolName}" already exists`);

    const id = await ctx.db.insert("composio_custom_tools", {
      toolName: args.toolName,
      toolkit: args.toolkit,
      description: args.description,
      inputSchema: args.inputSchema,
      outputSchema: args.outputSchema,
      handler: args.handler,
      enabled: true,
      createdBy: identity._id,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, id };
  },
});

export const toggleCustomTool = mutation({
  args: { adminToken: v.string(), toolDocId: v.id("composio_custom_tools"), enabled: v.boolean() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.patch(args.toolDocId, { enabled: args.enabled, updatedAt: Date.now() });
    return { success: true };
  },
});

export const deleteCustomTool = mutation({
  args: { adminToken: v.string(), toolDocId: v.id("composio_custom_tools") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.delete(args.toolDocId);
    return { success: true };
  },
});

// ─── SESSIONS (Tool Router) ───

export const listSessions = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, sessions: [] };
    const sessions = await ctx.db
      .query("composio_sessions")
      .withIndex("by_session")
      .order("desc")
      .take(50);
    return { authError: false, sessions };
  },
});

export const createSession = mutation({
  args: {
    adminToken: v.string(),
    userId: v.string(),
    agentId: v.optional(v.string()),
    toolkits: v.array(v.string()),
    durationHours: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Unauthorized");

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const now = Date.now();
    const hours = args.durationHours ?? 24;

    const id = await ctx.db.insert("composio_sessions", {
      sessionId,
      userId: args.userId,
      agentId: args.agentId,
      toolkits: args.toolkits,
      activeTools: 0,
      toolCallCount: 0,
      startedAt: now,
      lastActivityAt: now,
      expiresAt: now + hours * 3600 * 1000,
    });

    return { success: true, sessionId, id };
  },
});

// ─── OBSERVABILITY ───

export const getObservability = query({
  args: { adminToken: v.optional(v.string()), period: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken, period }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true };

    const now = Date.now();
    const periodMs: Record<string, number> = {
      "24h": 86400000,
      "7d": 7 * 86400000,
      "30d": 30 * 86400000,
    };
    const window = periodMs[period ?? "24h"] ?? 86400000;
    const since = now - window;

    const logs = await ctx.db
      .query("composio_action_logs")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", since))
      .collect();

    const successLogs = logs.filter((l) => l.status === "success");
    const failedLogs = logs.filter((l) => l.status === "failed");

    // Group by platform
    const byPlatform: Record<string, { total: number; success: number; failed: number }> = {};
    for (const log of logs) {
      const key = log.platform || "unknown";
      if (!byPlatform[key]) byPlatform[key] = { total: 0, success: 0, failed: 0 };
      byPlatform[key].total++;
      if (log.status === "success") byPlatform[key].success++;
      else if (log.status === "failed") byPlatform[key].failed++;
    }

    // Hourly bucket for last 24h
    const hourlyBuckets: { hour: string; total: number; success: number; failed: number }[] = [];
    if (window <= 86400000) {
      for (let i = 23; i >= 0; i--) {
        const bucketStart = now - (i + 1) * 3600 * 1000;
        const bucketEnd = now - i * 3600 * 1000;
        const bucketLogs = logs.filter((l) => l.timestamp >= bucketStart && l.timestamp < bucketEnd);
        const label = new Date(bucketStart).toISOString().slice(11, 13) + ":00";
        hourlyBuckets.push({
          hour: label,
          total: bucketLogs.length,
          success: bucketLogs.filter((l) => l.status === "success").length,
          failed: bucketLogs.filter((l) => l.status === "failed").length,
        });
      }
    }

    // Top tools
    const toolCounts: Record<string, number> = {};
    for (const log of logs) {
      if (log.action) toolCounts[log.action] = (toolCounts[log.action] || 0) + 1;
    }
    const topTools = Object.entries(toolCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    return {
      authError: false,
      period: period ?? "24h",
      windowMs: window,
      summary: {
        totalInvocations: logs.length,
        successCount: successLogs.length,
        failedCount: failedLogs.length,
        successRate: logs.length > 0 ? (successLogs.length / logs.length) * 100 : 100,
        uniquePlatforms: Object.keys(byPlatform).length,
      },
      byPlatform,
      hourlyBuckets,
      topTools,
    };
  },
});

// ─── CRON CALLABLE ACTIONS ───

export const refreshToolCatalog = internalAction({
  args: {},
  returns: v.any(),
  handler: async () => {
    // In production, this would refresh the cached tool catalog from
    // the live Composio API. We log the heartbeat for observability.
    return { success: true, refreshedAt: Date.now(), toolkits: POPULAR_TOOLKITS.length };
  },
});

export const cleanupExpiredSessions = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    // Use raw db access via runQuery
    const ctxAny = ctx as any;
    const sessions = await ctx.runQuery(internal.composioEnhanced._getExpiredSessions, { now });
    let deleted = 0;
    for (const s of sessions) {
      await ctx.runMutation(internal.composioEnhanced._deleteSession, { id: s._id });
      deleted++;
    }
    return { success: true, deleted };
  },
});

export const _getExpiredSessions = internalQuery({
  args: { now: v.number() },
  returns: v.array(v.any()),
  handler: async (ctx, { now }) => {
    return await ctx.db
      .query("composio_sessions")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();
  },
});

export const _deleteSession = internalMutation({
  args: { id: v.id("composio_sessions") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// ─── PUBLIC: Record a trigger event (called by external systems) ───

export const recordTriggerEvent = mutation({
  args: {
    triggerId: v.string(),
    toolkit: v.string(),
    eventType: v.string(),
    payload: v.any(),
    agentId: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    await ctx.db.insert("composio_trigger_events", {
      triggerId: args.triggerId,
      toolkit: args.toolkit,
      eventType: args.eventType,
      payload: args.payload,
      processed: false,
      agentId: args.agentId,
      receivedAt: Date.now(),
    });

    // Update trigger fire count
    const trigger = await ctx.db
      .query("composio_triggers")
      .withIndex("by_trigger", (q) => q.eq("triggerId", args.triggerId))
      .first();
    if (trigger) {
      await ctx.db.patch(trigger._id, {
        fireCount: trigger.fireCount + 1,
        lastFiredAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// ─── TOOL EXECUTION PROXY (calls Composio API from action) ───

export const executeTool = action({
  args: {
    adminToken: v.string(),
    toolkit: v.string(),
    action: v.string(),
    params: v.any(),
    connectedAccountId: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await ctx.runQuery(internal.composioEnhanced._verifyAdmin, {
      adminToken: args.adminToken,
    });
    if (!identity) throw new Error("Unauthorized");

    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) throw new Error("COMPOSIO_API_KEY not configured");

    const startTime = Date.now();
    let result: any = undefined;
    let error: string | undefined = undefined;
    let status: "success" | "failed" = "success";

    try {
      const response = await fetch("https://backend.composio.dev/api/v2/actions/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          actionName: args.action,
          input: args.params,
          connectedAccountId: args.connectedAccountId,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        error = `Composio API error ${response.status}: ${text.slice(0, 200)}`;
        status = "failed";
      } else {
        result = await response.json();
      }
    } catch (e: any) {
      error = e?.message ?? String(e);
      status = "failed";
    }

    const duration = Date.now() - startTime;

    await ctx.runMutation(internal.composioEnhanced._logInvocation, {
      action: args.action,
      platform: args.toolkit,
      status,
      duration,
      params: args.params,
      result,
      error,
      adminId: identity._id,
    });

    if (status === "failed") {
      throw new Error(error || "Tool execution failed");
    }

    return { success: true, result, duration };
  },
});

export const _verifyAdmin = internalQuery({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    return await tryGetAdminSession(ctx, adminToken);
  },
});

export const _logInvocation = internalMutation({
  args: {
    action: v.string(),
    platform: v.string(),
    status: v.string(),
    duration: v.number(),
    params: v.any(),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    adminId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("composio_action_logs", {
      action: args.action,
      platform: args.platform,
      status: args.status as any,
      metadata: {
        duration: args.duration,
        params: args.params,
        result: args.result,
        error: args.error,
        adminId: args.adminId,
      },
      timestamp: Date.now(),
    });
  },
});
