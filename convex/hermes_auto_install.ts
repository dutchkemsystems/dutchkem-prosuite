import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// AUTO-INSTALL — Install open-source services from GitHub
// Tracks installed services, versions, and health
// ═══════════════════════════════════════════════════════════════════

const AVAILABLE_SERVICES = [
  { id: "openwa", name: "OpenWA", repo: "open-wa/wa-automate-nodejs", description: "WhatsApp Web API", category: "messaging" },
  { id: "n8n", name: "n8n", repo: "n8n-io/n8n", description: "Workflow automation", category: "automation" },
  { id: "chatwoot", name: "Chatwoot", repo: "chatwoot/chatwoot", description: "Customer support platform", category: "support" },
  { id: "mattermost", name: "Mattermost", repo: "mattermost/mattermost", description: "Team messaging", category: "messaging" },
  { id: "rocket_chat", name: "Rocket.Chat", repo: "RocketChat/Rocket.Chat", description: "Team communication", category: "messaging" },
  { id: "botpress", name: "Botpress", repo: "botpress/botpress", description: "Chatbot platform", category: "ai" },
  { id: "rasa", name: "Rasa", repo: "RasaHQ/rasa", description: "Conversational AI", category: "ai" },
  { id: "langflow", name: "Langflow", repo: "langflow-ai/langflow", description: "Visual AI workflow builder", category: "ai" },
  { id: "flowise", name: "Flowise", repo: "FlowiseAI/Flowise", description: "Drag & drop LLM flows", category: "ai" },
  { id: "dify", name: "Dify", repo: "langgenius/dify", description: "LLM app development platform", category: "ai" },
];

// ─── GET AVAILABLE SERVICES ───

export const getAvailableServices = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return AVAILABLE_SERVICES;
  },
});

// ─── GET INSTALLED SERVICES ───

export const getInstalledServices = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("hermes_installed_services").collect();
  },
});

// ─── INSTALL SERVICE ───

export const installService = mutation({
  args: {
    serviceId: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      const identity = await tryGetAdminSession(ctx, args.adminToken);
      const adminId = identity?._id || "system";

      const service = AVAILABLE_SERVICES.find((s) => s.id === args.serviceId);
      if (!service) return { success: false, error: `Unknown service: ${args.serviceId}` };

      const now = Date.now();

      // Insert new record
      await ctx.db.insert("hermes_installed_services", {
        serviceId: args.serviceId,
        name: service.name,
        repo: service.repo,
        description: service.description,
        status: "installing",
        installedBy: adminId,
        startedAt: now,
        updatedAt: now,
      });

      return {
        success: true,
        serviceId: args.serviceId,
        name: service.name,
        status: "installing",
      };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  },
});

// ─── UNINSTALL SERVICE ───

export const uninstallService = mutation({
  args: {
    serviceId: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const existing = await ctx.db
      .query("hermes_installed_services")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "uninstalled",
        updatedAt: Date.now(),
      });
    }

    return { success: true, serviceId: args.serviceId };
  },
});

// ─── REPORT INSTALL STATUS (called by OpenWA server) ───

export const reportInstallStatus = mutation({
  args: {
    serviceId: v.string(),
    status: v.union(v.literal("installing"), v.literal("installed"), v.literal("failed"), v.literal("uninstalled")),
    version: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("hermes_installed_services")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        version: args.version || existing.version,
        error: args.error,
        installedAt: args.status === "installed" ? now : existing.installedAt,
        updatedAt: now,
      });
    }
  },
});
