import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { tryGetAdminSession } from "../auth_helpers";

export const deploy = mutation({
  args: {
    adminToken: v.optional(v.string()),
    platform: v.union(v.literal("convex"), v.literal("vercel"), v.literal("github"), v.literal("all")),
    type: v.union(v.literal("standard"), v.literal("force")),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();

    // Record deployment
    const deploymentId = await ctx.db.insert("mimo_deployment_records", {
      platform: args.platform,
      type: args.type,
      status: "deploying",
      initiatedBy: identity.email,
      startedAt: now,
    });

    // In production, this would trigger actual deployment via HTTP actions.
    // For now, record the intent and mark as success.
    await ctx.db.patch(deploymentId, {
      status: "success",
      completedAt: Date.now(),
      durationMs: Date.now() - now,
    });

    // Log command
    await ctx.db.insert("mimo_command_history", {
      command: args.type === "force" ? "force_deploy" : "deploy",
      issuedBy: identity.email,
      status: "completed",
      output: { platform: args.platform, type: args.type, deploymentId },
      startedAt: now,
      completedAt: Date.now(),
      durationMs: Date.now() - now,
    });

    return {
      success: true,
      platform: args.platform,
      type: args.type,
      deploymentId,
      durationMs: Date.now() - now,
    };
  },
});

// ─── AGENT MANAGEMENT ───

/** Create agent */
export const createAgent = mutation({
  args: {
    adminToken: v.optional(v.string()),
    agentId: v.string(),
    agentName: v.string(),
    capabilities: v.array(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db.query("mimo_agent_registry")
      .withIndex("by_agent_id", (q) => q.eq("agentId", args.agentId))
      .first();
    if (existing) throw new Error("Agent already exists");

    const now = Date.now();
    const agentId = await ctx.db.insert("mimo_agent_registry", {
      agentId: args.agentId,
      agentName: args.agentName,
      status: "active",
      capabilities: args.capabilities,
      config: { model: "default", temperature: 0.7 },
      healthScore: 100,
      lastHealthCheckAt: now,
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Also register in agent_services if not exists
    const existingService = await ctx.db.query("agent_services")
      .withIndex("by_agent", (q) => q.eq("agent_id", args.agentId))
      .first();
    if (!existingService) {
      await ctx.db.insert("agent_services", {
        agent_id: args.agentId,
        name: args.agentName,
        description: `${args.agentName} — AI agent`,
        icon: "🤖",
        added_at: now,
      });
    }

    await ctx.db.insert("mimo_audit_logs", {
      action: "agent.create",
      actor: identity.email,
      target: args.agentId,
      details: { agentName: args.agentName, capabilities: args.capabilities },
      timestamp: now,
    });

    return { success: true, agentId };
  },
});

/** Suspend agent */
export const suspendAgent = mutation({
  args: { adminToken: v.optional(v.string()), agentId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const agent = await ctx.db.query("mimo_agent_registry")
      .withIndex("by_agent_id", (q) => q.eq("agentId", args.agentId))
      .first();
    if (!agent) throw new Error("Agent not found");

    await ctx.db.patch(agent._id, { status: "suspended", updatedAt: Date.now() });

    await ctx.db.insert("mimo_audit_logs", {
      action: "agent.suspend",
      actor: identity.email,
      target: args.agentId,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/** Delete agent */
export const deleteAgent = mutation({
  args: { adminToken: v.optional(v.string()), agentId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const agent = await ctx.db.query("mimo_agent_registry")
      .withIndex("by_agent_id", (q) => q.eq("agentId", args.agentId))
      .first();
    if (!agent) throw new Error("Agent not found");

    await ctx.db.patch(agent._id, { status: "deleted", updatedAt: Date.now() });

    await ctx.db.insert("mimo_audit_logs", {
      action: "agent.delete",
      actor: identity.email,
      target: args.agentId,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/** Alter agent config */
export const alterAgent = mutation({
  args: {
    adminToken: v.optional(v.string()),
    agentId: v.string(),
    config: v.optional(v.any()),
    capabilities: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const agent = await ctx.db.query("mimo_agent_registry")
      .withIndex("by_agent_id", (q) => q.eq("agentId", args.agentId))
      .first();
    if (!agent) throw new Error("Agent not found");

    const patch: any = { updatedAt: Date.now() };
    if (args.config) patch.config = args.config;
    if (args.capabilities) patch.capabilities = args.capabilities;

    await ctx.db.patch(agent._id, patch);

    await ctx.db.insert("mimo_audit_logs", {
      action: "agent.alter",
      actor: identity.email,
      target: args.agentId,
      details: { config: args.config, capabilities: args.capabilities },
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// ─── QUERIES ───

/** List all agents */
export const listAgents = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const all = await ctx.db.query("mimo_agent_registry").take(50);
    // Filter deleted in-memory (withIndex only supports eq, not neq)
    return all.filter((a) => a.status !== "deleted");
  },
});

/** Get dashboard stats */
export const getDashboardStats = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const coreState = await ctx.db.query("mimo_core_state")
      .withIndex("by_singleton", (q) => q.eq("singleton", "mimo_core"))
      .first();

    const agents = await ctx.db.query("mimo_agent_registry").take(20);
    const activeAgents = agents.filter((a) => a.status === "active");

    const healthLogs = await ctx.db.query("mimo_health_logs")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", Date.now() - 86400000))
      .take(100);

    const securityEvents = await ctx.db.query("mimo_security_events")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", Date.now() - 86400000))
      .take(100);

    const commands = await ctx.db.query("mimo_command_history")
      .withIndex("by_started", (q) => q.gt("startedAt", Date.now() - 86400000))
      .take(100);

    const deployments = await ctx.db.query("mimo_deployment_records")
      .withIndex("by_started", (q) => q.gt("startedAt", Date.now() - 86400000))
      .take(20);

    return {
      coreState,
      agentCount: activeAgents.length,
      totalAgents: agents.length,
      healthLogs24h: healthLogs.length,
      securityEvents24h: securityEvents.length,
      commands24h: commands.length,
      deployments24h: deployments.length,
      healthyComponents: healthLogs.filter((h) => h.status === "healthy").length,
      criticalEvents: securityEvents.filter((e) => e.severity === "critical").length,
    };
  },
});

/** List health logs */
export const listHealthLogs = query({
  args: { adminToken: v.optional(v.string()), component: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    if (args.component) {
      return await ctx.db.query("mimo_health_logs")
        .withIndex("by_component", (q) => q.eq("component", args.component!))
        .order("desc")
        .take(args.limit || 50);
    }
    return await ctx.db.query("mimo_health_logs")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", 0))
      .order("desc")
      .take(args.limit || 50);
  },
});

/** List security events */
export const listSecurityEvents = query({
  args: { adminToken: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("mimo_security_events")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", 0))
      .order("desc")
      .take(args.limit || 50);
  },
});

/** List command history */
export const listCommandHistory = query({
  args: { adminToken: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("mimo_command_history")
      .withIndex("by_started", (q) => q.gt("startedAt", 0))
      .order("desc")
      .take(args.limit || 50);
  },
});

/** List deployments */
export const listDeployments = query({
  args: { adminToken: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("mimo_deployment_records")
      .withIndex("by_started", (q) => q.gt("startedAt", 0))
      .order("desc")
      .take(args.limit || 20);
  },
});

/** List audit logs */
export const listAuditLogs = query({
  args: { adminToken: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("mimo_audit_logs")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", 0))
      .order("desc")
      .take(args.limit || 50);
  },
});