import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// COMPOSIO ENHANCEMENT TOGGLE SYSTEM
// ═══════════════════════════════════════════════════════════════════
// Each of the 15 agents gets unique Composio tools when enabled.
// Toggling one agent does NOT affect others.
// State persists in database across server restarts.

const AGENTS = [
  {
    id: "A1",
    name: "Academic Pro",
    icon: "🎓",
    description: "Research papers, citations, academic writing, literature review",
    toolkits: ["google_sheets", "google_drive", "notion", "gmail"],
    toolCount: 137,
  },
  {
    id: "A2",
    name: "Business Pro",
    icon: "💼",
    description: "Business plans, market analysis, strategy, financial modeling",
    toolkits: ["google_sheets", "hubspot", "salesforce", "stripe", "notion"],
    toolCount: 221,
  },
  {
    id: "A3",
    name: "Content Pro",
    icon: "✍️",
    description: "Blog posts, articles, copywriting, SEO content, social media",
    toolkits: ["wordpress", "notion", "gmail", "slack", "twitter", "linkedin"],
    toolCount: 195,
  },
  {
    id: "A4",
    name: "Career Pro",
    icon: "📄",
    description: "CV building, cover letters, LinkedIn optimization, job matching",
    toolkits: ["linkedin", "gmail", "google_drive", "notion"],
    toolCount: 98,
  },
  {
    id: "A5",
    name: "Personal Shopper",
    icon: "🛍️",
    description: "Product research, price comparison, shopping automation",
    toolkits: ["shopify", "stripe", "gmail"],
    toolCount: 141,
  },
  {
    id: "A6",
    name: "Exam Pro",
    icon: "📝",
    description: "Study plans, practice tests, flashcards, academic scheduling",
    toolkits: ["google_calendar", "google_sheets", "notion", "gmail"],
    toolCount: 113,
  },
  {
    id: "A7",
    name: "Finance Pro",
    icon: "💰",
    description: "Budgeting, investment analysis, financial reports, invoicing",
    toolkits: ["stripe", "google_sheets", "quickbooks", "hubspot"],
    toolCount: 156,
  },
  {
    id: "A8",
    name: "MediaStudio Pro",
    icon: "🎬",
    description: "Video scripts, social media scheduling, content calendar",
    toolkits: ["youtube", "instagram", "twitter", "facebook", "tiktok", "canva"],
    toolCount: 140,
  },
  {
    id: "A9",
    name: "Health Pro",
    icon: "🏥",
    description: "Health tracking, meal plans, fitness scheduling, wellness tips",
    toolkits: ["google_calendar", "google_sheets", "gmail"],
    toolCount: 99,
  },
  {
    id: "A10",
    name: "Home Services",
    icon: "🧹",
    description: "Service booking, vendor management, home maintenance scheduling",
    toolkits: ["google_calendar", "gmail", "twilio", "google_sheets"],
    toolCount: 114,
  },
  {
    id: "A11",
    name: "Language Tutor",
    icon: "🗣️",
    description: "Language learning, vocabulary, pronunciation, practice sessions",
    toolkits: ["google_calendar", "google_sheets", "notion"],
    toolCount: 85,
  },
  {
    id: "A12",
    name: "Travel Planner",
    icon: "✈️",
    description: "Trip planning, itineraries, booking automation, travel budgets",
    toolkits: ["google_calendar", "google_sheets", "gmail", "notion"],
    toolCount: 128,
  },
  {
    id: "A13",
    name: "ServiceMart NG",
    icon: "🚀",
    description: "Nigerian marketplace services, vendor matching, escrow payments",
    toolkits: ["stripe", "twilio", "gmail", "google_sheets"],
    toolCount: 132,
  },
  {
    id: "A14",
    name: "Translation Hub",
    icon: "📝",
    description: "Multi-language translation, localization, document processing",
    toolkits: ["google_drive", "notion", "gmail"],
    toolCount: 76,
  },
  {
    id: "A15",
    name: "Event Planner",
    icon: "🎉",
    description: "Event coordination, vendor management, guest lists, scheduling",
    toolkits: ["google_calendar", "gmail", "google_sheets", "twilio", "notion"],
    toolCount: 164,
  },
];

// ─── QUERIES ───

export const getAllAgentSettings = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { adminToken }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, agents: [], enabledCount: 0, disabledCount: 0 };

    const settings = await ctx.db.query("composio_agent_settings").collect();
    const settingsMap = new Map(settings.map((s) => [s.agentId, s]));

    const agents = AGENTS.map((agent) => {
      const db = settingsMap.get(agent.id);
      return {
        agentId: agent.id,
        agentName: agent.name,
        agentIcon: agent.icon,
        description: agent.description,
        enabled: db?.enabled ?? false,
        tools: db?.tools ?? [],
        toolCount: db?.toolCount ?? 0,
        enabledBy: db?.enabledBy,
        enabledAt: db?.enabledAt,
        disabledBy: db?.disabledBy,
        disabledAt: db?.disabledAt,
        lastConfiguredAt: db?.lastConfiguredAt,
        configVersion: db?.configVersion ?? 0,
        defaultToolkits: agent.toolkits,
        defaultToolCount: agent.toolCount,
      };
    });

    const enabledCount = agents.filter((a) => a.enabled).length;
    const disabledCount = agents.length - enabledCount;

    return { authError: false, agents, enabledCount, disabledCount, totalAgents: agents.length };
  },
});

export const getAgentSetting = query({
  args: { adminToken: v.optional(v.string()), agentId: v.string() },
  returns: v.any(),
  handler: async (ctx, { adminToken, agentId }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, agent: null };

    const agent = AGENTS.find((a) => a.id === agentId);
    if (!agent) return { authError: false, agent: null };

    const db = await ctx.db
      .query("composio_agent_settings")
      .withIndex("by_agent_id", (q) => q.eq("agentId", agentId))
      .first();

    return {
      authError: false,
      agent: {
        agentId: agent.id,
        agentName: agent.name,
        agentIcon: agent.icon,
        description: agent.description,
        enabled: db?.enabled ?? false,
        tools: db?.tools ?? [],
        toolCount: db?.toolCount ?? 0,
        enabledBy: db?.enabledBy,
        enabledAt: db?.enabledAt,
        disabledBy: db?.disabledBy,
        disabledAt: db?.disabledAt,
        defaultToolkits: agent.toolkits,
        defaultToolCount: agent.toolCount,
      },
    };
  },
});

export const getEnhancementLogs = query({
  args: { adminToken: v.optional(v.string()), agentId: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, { adminToken, agentId, limit }) => {
    const identity = await tryGetAdminSession(ctx, adminToken);
    if (!identity) return { authError: true, logs: [] };

    let q: any = ctx.db.query("composio_enhancement_logs");
    if (agentId) {
      q = q.withIndex("by_agent_id", (q2: any) => q2.eq("agentId", agentId));
    }
    const logs = await q.order("desc").take(limit ?? 50);
    return { authError: false, logs };
  },
});

// ─── MUTATIONS ───

export const toggleAgent = mutation({
  args: {
    adminToken: v.string(),
    agentId: v.string(),
    enabled: v.boolean(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true, success: false };

    const agent = AGENTS.find((a) => a.id === args.agentId);
    if (!agent) return { authError: false, success: false, error: "Agent not found" };

    const existing = await ctx.db
      .query("composio_agent_settings")
      .withIndex("by_agent_id", (q) => q.eq("agentId", args.agentId))
      .first();

    const now = Date.now();
    const adminEmail = identity.email ?? "admin";

    if (existing) {
      const previousState = existing.enabled ?? existing.composioEnabled ?? false;
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        composioEnabled: args.enabled,
        tools: args.enabled ? agent.toolkits : [],
        enabledPlatforms: args.enabled ? agent.toolkits : [],
        toolCount: args.enabled ? agent.toolCount : 0,
        enabledBy: args.enabled ? adminEmail : existing.enabledBy,
        enabledAt: args.enabled ? now : existing.enabledAt,
        disabledBy: args.enabled ? existing.disabledBy : adminEmail,
        disabledAt: args.enabled ? existing.disabledAt : now,
        lastConfiguredAt: now,
        configVersion: (existing.configVersion ?? 0) + 1,
        updatedAt: now,
      });

      await ctx.db.insert("composio_enhancement_logs", {
        action: args.enabled ? "enable" : "disable",
        agentId: args.agentId,
        agentName: agent.name,
        adminId: adminEmail,
        tools: args.enabled ? agent.toolkits : [],
        toolCount: args.enabled ? agent.toolCount : 0,
        previousState,
        newState: args.enabled,
        bulkOperation: false,
        timestamp: now,
      });

      return { authError: false, success: true, previousState, newState: args.enabled };
    } else {
      await ctx.db.insert("composio_agent_settings", {
        agentId: args.agentId,
        agentName: agent.name,
        agentIcon: agent.icon,
        enabled: args.enabled,
        composioEnabled: args.enabled,
        tools: args.enabled ? agent.toolkits : [],
        enabledPlatforms: args.enabled ? agent.toolkits : [],
        toolCount: args.enabled ? agent.toolCount : 0,
        enabledBy: args.enabled ? adminEmail : undefined,
        enabledAt: args.enabled ? now : undefined,
        disabledBy: args.enabled ? undefined : adminEmail,
        disabledAt: args.enabled ? undefined : now,
        lastConfiguredAt: now,
        configVersion: 1,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("composio_enhancement_logs", {
        action: args.enabled ? "enable" : "disable",
        agentId: args.agentId,
        agentName: agent.name,
        adminId: adminEmail,
        tools: args.enabled ? agent.toolkits : [],
        toolCount: args.enabled ? agent.toolCount : 0,
        previousState: false,
        newState: args.enabled,
        bulkOperation: false,
        timestamp: now,
      });

      return { authError: false, success: true, previousState: false, newState: args.enabled };
    }
  },
});

export const enableAllAgents = mutation({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true, success: false, enabled: 0 };

    const adminEmail = identity.email ?? "admin";
    const now = Date.now();
    let enabled = 0;

    for (const agent of AGENTS) {
      const existing = await ctx.db
        .query("composio_agent_settings")
        .withIndex("by_agent_id", (q) => q.eq("agentId", agent.id))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          enabled: true,
          composioEnabled: true,
          tools: agent.toolkits,
          enabledPlatforms: agent.toolkits,
          toolCount: agent.toolCount,
          enabledBy: adminEmail,
          enabledAt: now,
          lastConfiguredAt: now,
          configVersion: (existing.configVersion ?? 0) + 1,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("composio_agent_settings", {
          agentId: agent.id,
          agentName: agent.name,
          agentIcon: agent.icon,
          enabled: true,
          composioEnabled: true,
          tools: agent.toolkits,
          enabledPlatforms: agent.toolkits,
          toolCount: agent.toolCount,
          enabledBy: adminEmail,
          enabledAt: now,
          lastConfiguredAt: now,
          configVersion: 1,
          createdAt: now,
          updatedAt: now,
        });
      }

      await ctx.db.insert("composio_enhancement_logs", {
        action: "enable-all",
        agentId: agent.id,
        agentName: agent.name,
        adminId: adminEmail,
        tools: agent.toolkits,
        toolCount: agent.toolCount,
        previousState: existing?.enabled ?? false,
        newState: true,
        bulkOperation: true,
        timestamp: now,
      });

      enabled++;
    }

    return { authError: false, success: true, enabled };
  },
});

export const disableAllAgents = mutation({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true, success: false, disabled: 0 };

    const adminEmail = identity.email ?? "admin";
    const now = Date.now();
    let disabled = 0;

    for (const agent of AGENTS) {
      const existing = await ctx.db
        .query("composio_agent_settings")
        .withIndex("by_agent_id", (q) => q.eq("agentId", agent.id))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          enabled: false,
          composioEnabled: false,
          tools: [],
          enabledPlatforms: [],
          toolCount: 0,
          disabledBy: adminEmail,
          disabledAt: now,
          lastConfiguredAt: now,
          configVersion: (existing.configVersion ?? 0) + 1,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("composio_agent_settings", {
          agentId: agent.id,
          agentName: agent.name,
          agentIcon: agent.icon,
          enabled: false,
          composioEnabled: false,
          tools: [],
          enabledPlatforms: [],
          toolCount: 0,
          disabledBy: adminEmail,
          disabledAt: now,
          lastConfiguredAt: now,
          configVersion: 1,
          createdAt: now,
          updatedAt: now,
        });
      }

      await ctx.db.insert("composio_enhancement_logs", {
        action: "disable-all",
        agentId: agent.id,
        agentName: agent.name,
        adminId: adminEmail,
        tools: [],
        toolCount: 0,
        previousState: existing?.enabled ?? false,
        newState: false,
        bulkOperation: true,
        timestamp: now,
      });

      disabled++;
    }

    return { authError: false, success: true, disabled };
  },
});

export const autoConfigureAgents = mutation({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { authError: true, success: false, configured: 0 };

    const adminEmail = identity.email ?? "admin";
    const now = Date.now();
    let configured = 0;

    for (const agent of AGENTS) {
      const existing = await ctx.db
        .query("composio_agent_settings")
        .withIndex("by_agent_id", (q) => q.eq("agentId", agent.id))
        .first();

      const shouldEnable = !existing?.enabled;

      if (shouldEnable) {
        if (existing) {
          await ctx.db.patch(existing._id, {
            enabled: true,
            composioEnabled: true,
            tools: agent.toolkits,
            enabledPlatforms: agent.toolkits,
            toolCount: agent.toolCount,
            enabledBy: adminEmail,
            enabledAt: now,
            lastConfiguredAt: now,
            configVersion: (existing.configVersion ?? 0) + 1,
            updatedAt: now,
          });
        } else {
          await ctx.db.insert("composio_agent_settings", {
            agentId: agent.id,
            agentName: agent.name,
            agentIcon: agent.icon,
            enabled: true,
            composioEnabled: true,
            tools: agent.toolkits,
            enabledPlatforms: agent.toolkits,
            toolCount: agent.toolCount,
            enabledBy: adminEmail,
            enabledAt: now,
            lastConfiguredAt: now,
            configVersion: 1,
            createdAt: now,
            updatedAt: now,
          });
        }

        await ctx.db.insert("composio_enhancement_logs", {
          action: "auto-configure",
          agentId: agent.id,
          agentName: agent.name,
          adminId: adminEmail,
          tools: agent.toolkits,
          toolCount: agent.toolCount,
          previousState: existing?.enabled ?? false,
          newState: true,
          bulkOperation: true,
          metadata: { reason: "auto-configure: enabling all disabled agents" },
          timestamp: now,
        });

        configured++;
      }
    }

    return { authError: false, success: true, configured, message: `${configured} agent(s) auto-configured` };
  },
});

// ─── INTERNAL (for agent runtime) ───

export const _isAgentEnhanced = internalMutation({
  args: { agentId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { agentId }) => {
    const setting = await ctx.db
      .query("composio_agent_settings")
      .withIndex("by_agent_id", (q) => q.eq("agentId", agentId))
      .first();
    return setting?.enabled ?? false;
  },
});
