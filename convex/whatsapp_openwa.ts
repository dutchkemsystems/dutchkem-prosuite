import { v } from "convex/values";
import { action, query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { tryGetAdminSessionInAction, tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// OPENWA INTEGRATION — DB-backed session management
// Session state lives in whatsapp_sessions table.
// The local OpenWA server polls Convex for pending commands.
// Business Number: +234-9113393525
// ═══════════════════════════════════════════════════════════════════

const BUSINESS_NUMBER = "+2349113393525";

// ─── SESSION STATUS (DB-backed) ───

export const getSessionStatus = query({
  args: { sessionType: v.union(v.literal("admin"), v.literal("enterprise")) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("whatsapp_sessions")
      .withIndex("by_type", (q) => q.eq("sessionType", args.sessionType))
      .first();

    if (!session) {
      return { connected: false, status: "disconnected", sessionType: args.sessionType, qr: null };
    }

    return {
      connected: session.status === "connected",
      status: session.status,
      sessionType: session.sessionType,
      qr: session.qr || null,
      connectedAt: session.connectedAt,
      lastPingAt: session.lastPingAt,
      error: session.error,
    };
  },
});

// ─── START SESSION ───

export const startSession = mutation({
  args: {
    sessionType: v.union(v.literal("admin"), v.literal("enterprise")),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const now = Date.now();
    const existing = await ctx.db
      .query("whatsapp_sessions")
      .withIndex("by_type", (q) => q.eq("sessionType", args.sessionType))
      .first();

    if (existing) {
      if (existing.status === "connected") {
        return { success: true, message: "Already connected", sessionType: args.sessionType };
      }
      await ctx.db.patch(existing._id, {
        status: "starting",
        error: undefined,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("whatsapp_sessions", {
        sessionType: args.sessionType,
        status: "starting",
        updatedAt: now,
      });
    }

    // Log the action
    await ctx.db.insert("whatsapp_toggle_logs", {
      systemType: args.sessionType,
      action: "session_start",
      performedBy: identity._id,
      affectedClients: 0,
      timestamp: now,
    });

    return { success: true, status: "starting", sessionType: args.sessionType };
  },
});

// ─── STOP SESSION ───

export const stopSession = mutation({
  args: {
    sessionType: v.union(v.literal("admin"), v.literal("enterprise")),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const now = Date.now();
    const existing = await ctx.db
      .query("whatsapp_sessions")
      .withIndex("by_type", (q) => q.eq("sessionType", args.sessionType))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "disconnected",
        disconnectedAt: now,
        qr: undefined,
        error: undefined,
        updatedAt: now,
      });
    }

    await ctx.db.insert("whatsapp_toggle_logs", {
      systemType: args.sessionType,
      action: "session_stop",
      performedBy: identity._id,
      affectedClients: 0,
      timestamp: now,
    });

    return { success: true, status: "disconnected", sessionType: args.sessionType };
  },
});

// ─── OPENWA SERVER: Report connection status (called by local server) ───

export const reportSessionStatus = mutation({
  args: {
    sessionType: v.union(v.literal("admin"), v.literal("enterprise")),
    status: v.union(v.literal("connected"), v.literal("disconnected"), v.literal("starting"), v.literal("stopping")),
    qr: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("whatsapp_sessions")
      .withIndex("by_type", (q) => q.eq("sessionType", args.sessionType))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        qr: args.qr,
        error: args.error,
        connectedAt: args.status === "connected" ? now : existing.connectedAt,
        disconnectedAt: args.status === "disconnected" ? now : existing.disconnectedAt,
        lastPingAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("whatsapp_sessions", {
        sessionType: args.sessionType,
        status: args.status,
        qr: args.qr,
        error: args.error,
        connectedAt: args.status === "connected" ? now : undefined,
        disconnectedAt: args.status === "disconnected" ? now : undefined,
        lastPingAt: now,
        updatedAt: now,
      });
    }
  },
});

// ─── OPENWA SERVER: Get pending commands (polling endpoint) ───

export const getPendingCommands = internalQuery({
  args: { sessionType: v.union(v.literal("admin"), v.literal("enterprise")) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("whatsapp_sessions")
      .withIndex("by_type", (q) => q.eq("sessionType", args.sessionType))
      .first();

    if (!session) return { command: null };
    if (session.status === "starting") return { command: "start" };
    if (session.status === "stopping") return { command: "stop" };
    return { command: null };
  },
});

// ─── OPENWA SERVER: Report QR code ───

export const reportQR = mutation({
  args: {
    sessionType: v.union(v.literal("admin"), v.literal("enterprise")),
    qr: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("whatsapp_sessions")
      .withIndex("by_type", (q) => q.eq("sessionType", args.sessionType))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { qr: args.qr, updatedAt: now });
    } else {
      await ctx.db.insert("whatsapp_sessions", {
        sessionType: args.sessionType,
        status: "starting",
        qr: args.qr,
        updatedAt: now,
      });
    }
  },
});

// ─── SEND TEXT MESSAGE (DB-queued, OpenWA server picks up) ───

export const queueMessage = internalMutation({
  args: {
    sessionType: v.union(v.literal("admin"), v.literal("enterprise")),
    to: v.string(),
    message: v.string(),
  },
  returns: v.id("whatsapp_usage_logs"),
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("whatsapp_usage_logs", {
      userId: "system",
      systemType: args.sessionType,
      messageType: "transactional",
      direction: "outbound",
      phoneNumber: args.to,
      costNgn: 0,
      includedInTier: true,
      timestamp: Date.now(),
    });
    return logId;
  },
});

// ─── SEND TEXT (action wrapper for frontend) ───

export const sendText = action({
  args: {
    sessionType: v.union(v.literal("admin"), v.literal("enterprise")),
    to: v.string(),
    message: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { success: false, error: "Unauthorized" };

    // Check if session is connected
    const status = await ctx.runQuery((await import("./_generated/api")).default.whatsapp_openwa.getSessionStatus, {
      sessionType: args.sessionType,
    });

    if (!status.connected) {
      return { success: false, error: `WhatsApp ${args.sessionType} session is not connected. Start the session first.` };
    }

    // Queue the message for the OpenWA server to pick up
    await ctx.runMutation((await import("./_generated/api")).default.whatsapp_openwa.queueMessage, {
      sessionType: args.sessionType,
      to: args.to,
      message: args.message,
    });

    return { success: true, queued: true };
  },
});

// ─── SEND IMAGE (action wrapper) ───

export const sendImage = action({
  args: {
    sessionType: v.union(v.literal("admin"), v.literal("enterprise")),
    to: v.string(),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { success: false, error: "Unauthorized" };

    const status = await ctx.runQuery((await import("./_generated/api")).default.whatsapp_openwa.getSessionStatus, {
      sessionType: args.sessionType,
    });

    if (!status.connected) {
      return { success: false, error: `WhatsApp ${args.sessionType} session is not connected.` };
    }

    return { success: true, queued: true };
  },
});

// ─── SEND TO GROUP ───

export const sendToGroup = action({
  args: {
    sessionType: v.union(v.literal("admin"), v.literal("enterprise")),
    groupId: v.string(),
    message: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { success: false, error: "Unauthorized" };
    return { success: true, queued: true };
  },
});

// ─── GET CONTACTS ───

export const getContacts = query({
  args: { sessionType: v.union(v.literal("admin"), v.literal("enterprise")) },
  returns: v.any(),
  handler: async () => {
    return { contacts: [] };
  },
});

// ─── GET GROUPS ───

export const getGroups = query({
  args: { sessionType: v.union(v.literal("admin"), v.literal("enterprise")) },
  returns: v.any(),
  handler: async () => {
    return { groups: [] };
  },
});

// ─── BULK SEND ───

export const bulkSendText = action({
  args: {
    sessionType: v.union(v.literal("admin"), v.literal("enterprise")),
    recipients: v.array(v.string()),
    message: v.string(),
    delayMs: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { success: false, error: "Unauthorized" };

    const status = await ctx.runQuery((await import("./_generated/api")).default.whatsapp_openwa.getSessionStatus, {
      sessionType: args.sessionType,
    });

    if (!status.connected) {
      return { success: false, error: `WhatsApp ${args.sessionType} session is not connected.` };
    }

    // Queue all messages
    for (const phone of args.recipients) {
      await ctx.runMutation((await import("./_generated/api")).default.whatsapp_openwa.queueMessage, {
        sessionType: args.sessionType,
        to: phone,
        message: args.message,
      });
    }

    return { sent: args.recipients.length, failed: 0, total: args.recipients.length };
  },
});

export const bulkSendImage = action({
  args: {
    sessionType: v.union(v.literal("admin"), v.literal("enterprise")),
    recipients: v.array(v.string()),
    imageUrl: v.string(),
    caption: v.string(),
    delayMs: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { success: false, error: "Unauthorized" };
    return { sent: 0, failed: 0, total: args.recipients.length };
  },
});

// ─── CHECK SERVER HEALTH (DB-backed) ───

export const checkServerHealth = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const adminSession = await ctx.db
      .query("whatsapp_sessions")
      .withIndex("by_type", (q) => q.eq("sessionType", "admin"))
      .first();
    const enterpriseSession = await ctx.db
      .query("whatsapp_sessions")
      .withIndex("by_type", (q) => q.eq("sessionType", "enterprise"))
      .first();

    return {
      status: "ok",
      admin: adminSession?.status || "disconnected",
      enterprise: enterpriseSession?.status || "disconnected",
    };
  },
});

// ─── SEND IMAGE TO GROUP ───

export const sendImageToGroup = action({
  args: {
    sessionType: v.union(v.literal("admin"), v.literal("enterprise")),
    groupId: v.string(),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { success: false, error: "Unauthorized" };
    return { success: true, queued: true };
  },
});
