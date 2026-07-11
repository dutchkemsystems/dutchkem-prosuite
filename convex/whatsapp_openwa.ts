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

// ─── HEALTH CHECK — Verify server is reachable and connected ───

export const checkServerHealth = query({
  args: { sessionType: v.union(v.literal("admin"), v.literal("enterprise")) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("whatsapp_sessions")
      .withIndex("by_type", (q) => q.eq("sessionType", args.sessionType))
      .first();

    const now = Date.now();
    const lastPing = session?.lastPingAt || 0;
    const isStale = now - lastPing > 5 * 60 * 1000; // 5 minutes without ping

    return {
      sessionType: args.sessionType,
      connected: session?.status === "connected",
      status: session?.status || "disconnected",
      isStale,
      lastPingAt: lastPing,
      minutesSincePing: lastPing ? Math.floor((now - lastPing) / 60000) : null,
      qr: session?.qr || null,
      error: session?.error,
      canSendMessages: session?.status === "connected" && !isStale,
    };
  },
});

// ─── SYSTEM CONFIG HELPERS (for reconnect flags) ───

export const getConfigByKey = internalQuery({
  args: { key: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
  },
});

export const clearConfigKey = internalMutation({
  args: { key: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("system_config")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
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

    return { success: true, status: "starting", sessionType: args.sessionType, message: "Session starting — OpenWA server will connect on next restart" };
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
  returns: v.id("whatsapp_message_queue"),
  handler: async (ctx, args) => {
    const queueId = await ctx.db.insert("whatsapp_message_queue", {
      sessionType: args.sessionType,
      to: args.to,
      messageType: "text",
      content: args.message,
      status: "pending",
      retryCount: 0,
      createdAt: Date.now(),
    });

    // Also log to usage logs
    await ctx.db.insert("whatsapp_usage_logs", {
      userId: "system",
      systemType: args.sessionType,
      messageType: "transactional",
      direction: "outbound",
      phoneNumber: args.to,
      costNgn: 0,
      includedInTier: true,
      timestamp: Date.now(),
    });

    return queueId;
  },
});

// ─── QUEUE IMAGE MESSAGE ───

export const queueImageMessage = internalMutation({
  args: {
    sessionType: v.union(v.literal("admin"), v.literal("enterprise")),
    to: v.string(),
    imageUrl: v.string(),
    caption: v.optional(v.string()),
  },
  returns: v.id("whatsapp_message_queue"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("whatsapp_message_queue", {
      sessionType: args.sessionType,
      to: args.to,
      messageType: "image",
      content: args.caption || "",
      mediaUrl: args.imageUrl,
      caption: args.caption,
      status: "pending",
      retryCount: 0,
      createdAt: Date.now(),
    });
  },
});

// ─── OPENWA SERVER: Get pending messages to send ───

export const getPendingMessages = internalQuery({
  args: {
    sessionType: v.union(v.literal("admin"), v.literal("enterprise")),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    return await ctx.db
      .query("whatsapp_message_queue")
      .withIndex("by_session_status", (q) => q.eq("sessionType", args.sessionType).eq("status", "pending"))
      .order("asc")
      .take(limit);
  },
});

// ─── OPENWA SERVER: Mark message as sending ───

export const markMessageSending = internalMutation({
  args: { messageId: v.id("whatsapp_message_queue") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { status: "sending" });
  },
});

// ─── OPENWA SERVER: Mark message as sent ───

export const markMessageSent = internalMutation({
  args: {
    messageId: v.id("whatsapp_message_queue"),
    externalId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "sent",
      externalId: args.externalId,
      sentAt: Date.now(),
    });
  },
});

// ─── OPENWA SERVER: Mark message as failed ───

export const markMessageFailed = internalMutation({
  args: {
    messageId: v.id("whatsapp_message_queue"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (msg && msg.retryCount < 3) {
      await ctx.db.patch(args.messageId, {
        status: "pending",
        error: args.error,
        retryCount: msg.retryCount + 1,
      });
    } else {
      await ctx.db.patch(args.messageId, {
        status: "failed",
        error: args.error,
      });
    }
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

    // Queue the image message
    const queueId = await ctx.runMutation((await import("./_generated/api")).default.whatsapp_openwa.queueImageMessage, {
      sessionType: args.sessionType,
      to: args.to,
      imageUrl: args.imageUrl,
      caption: args.caption,
    });

    return { success: true, queued: true, queueId };
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

    const status = await ctx.runQuery((await import("./_generated/api")).default.whatsapp_openwa.getSessionStatus, {
      sessionType: args.sessionType,
    });

    if (!status.connected) {
      return { success: false, error: `WhatsApp ${args.sessionType} session is not connected.` };
    }

    // Queue group message (server handles group routing)
    const queueId = await ctx.runMutation((await import("./_generated/api")).default.whatsapp_openwa.queueMessage, {
      sessionType: args.sessionType,
      to: `group:${args.groupId}`,
      message: args.message,
    });

    return { success: true, queued: true, queueId };
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

    let queued = 0;
    for (const phone of args.recipients) {
      try {
        await ctx.runMutation((await import("./_generated/api")).default.whatsapp_openwa.queueImageMessage, {
          sessionType: args.sessionType,
          to: phone,
          imageUrl: args.imageUrl,
          caption: args.caption,
        });
        queued++;
      } catch (e) {
        // continue with next recipient
      }
    }

    return { sent: queued, failed: args.recipients.length - queued, total: args.recipients.length };
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

    const status = await ctx.runQuery((await import("./_generated/api")).default.whatsapp_openwa.getSessionStatus, {
      sessionType: args.sessionType,
    });

    if (!status.connected) {
      return { success: false, error: `WhatsApp ${args.sessionType} session is not connected.` };
    }

    const queueId = await ctx.runMutation((await import("./_generated/api")).default.whatsapp_openwa.queueImageMessage, {
      sessionType: args.sessionType,
      to: `group:${args.groupId}`,
      imageUrl: args.imageUrl,
      caption: args.caption,
    });

    return { success: true, queued: true, queueId };
  },
});

// ─── CRON: Session Health Check ───

export const checkSessionHealth = internalMutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes without ping = stale
    const alerts: string[] = [];

    for (const sessionType of ["admin", "enterprise"] as const) {
      const session = await ctx.db
        .query("whatsapp_sessions")
        .withIndex("by_type", (q) => q.eq("sessionType", sessionType))
        .first();

      if (!session) {
        alerts.push(`${sessionType}: No session record found`);
        continue;
      }

      if (session.status === "connected" && session.lastPingAt) {
        const timeSincePing = now - session.lastPingAt;
        if (timeSincePing > STALE_THRESHOLD_MS) {
          // Session hasn't pinged in over 5 minutes — likely dead
          await ctx.db.patch(session._id, {
            status: "disconnected",
            error: `Stale connection — no ping for ${Math.round(timeSincePing / 60000)} minutes`,
            disconnectedAt: now,
            updatedAt: now,
          });
          alerts.push(`${sessionType}: Session stale (${Math.round(timeSincePing / 60000)} min since last ping)`);
        }
      }

      if (session.status === "starting") {
        const startTime = session.updatedAt;
        const timeSinceStart = now - startTime;
        if (timeSinceStart > 10 * 60 * 1000) {
          // Been "starting" for over 10 minutes — mark as failed
          await ctx.db.patch(session._id, {
            status: "disconnected",
            error: "Session failed to connect within 10 minutes",
            disconnectedAt: now,
            updatedAt: now,
          });
          alerts.push(`${sessionType}: Session failed to connect (timeout)`);
        }
      }
    }

    // Check for stuck messages (pending for > 5 minutes)
    const stuckThreshold = now - 5 * 60 * 1000;
    const stuckMessages = await ctx.db
      .query("whatsapp_message_queue")
      .withIndex("by_status", (q) => q.eq("status", "sending"))
      .collect();

    const stuckCount = stuckMessages.filter((m) => m.createdAt < stuckThreshold).length;
    if (stuckCount > 0) {
      alerts.push(`${stuckCount} messages stuck in "sending" state`);
    }

    return { alerts, checkedAt: now };
  },
});

// ─── CRON: Cleanup Stuck Messages ───

export const cleanupStuckMessages = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

    // Find messages stuck in "sending" state for too long
    const stuckSending = await ctx.db
      .query("whatsapp_message_queue")
      .withIndex("by_status", (q) => q.eq("status", "sending"))
      .collect();

    for (const msg of stuckSending) {
      if (now - msg.createdAt > STUCK_THRESHOLD_MS) {
        // Reset to pending for retry
        await ctx.db.patch(msg._id, {
          status: "pending",
          error: "Reset from stuck sending state",
          retryCount: (msg.retryCount || 0) + 1,
        });
      }
    }

    // Find messages stuck in "pending" for too long (queue not being processed)
    const stuckPending = await ctx.db
      .query("whatsapp_message_queue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const PENDING_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
    for (const msg of stuckPending) {
      if (now - msg.createdAt > PENDING_THRESHOLD_MS && (msg.retryCount || 0) >= 3) {
        // Failed after multiple retries
        await ctx.db.patch(msg._id, {
          status: "failed",
          error: "Failed after multiple retries — OpenWA server may be offline",
        });
      }
    }
  },
});

// ─── ADMIN: Get Failed Messages ───

export const getFailedMessages = query({
  args: {
    sessionType: v.optional(v.union(v.literal("admin"), v.literal("enterprise"))),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("whatsapp_message_queue")
      .withIndex("by_status", (q) => q.eq("status", "failed"));

    let messages = await q.order("desc").take(args.limit || 50);

    if (args.sessionType) {
      messages = messages.filter((m) => m.sessionType === args.sessionType);
    }

    return messages;
  },
});

// ─── ADMIN: Retry Failed Message ───

export const retryFailedMessage = mutation({
  args: {
    messageId: v.id("whatsapp_message_queue"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const msg = await ctx.db.get(args.messageId);
    if (!msg) return { success: false, error: "Message not found" };
    if (msg.status !== "failed") return { success: false, error: "Message is not in failed state" };

    await ctx.db.patch(args.messageId, {
      status: "pending",
      error: undefined,
      retryCount: 0,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Message queued for retry" };
  },
});

// ─── ADMIN: Delete Failed Message ───

export const deleteFailedMessage = mutation({
  args: {
    messageId: v.id("whatsapp_message_queue"),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) return { success: false, error: "Unauthorized" };

    const msg = await ctx.db.get(args.messageId);
    if (!msg) return { success: false, error: "Message not found" };

    await ctx.db.delete(args.messageId);
    return { success: true, message: "Message deleted" };
  },
});
