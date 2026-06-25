import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation } from "./_generated/server";
import { tryGetAdminSession, tryGetAdminSessionInAction } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// Send push notifications via Firebase Cloud Messaging (FCM)
// ═══════════════════════════════════════════════════════════════════

const FCM_API_URL = "https://fcm.googleapis.com/v1/projects";

// ═══════════════════════════════════════════════════════════════════
// SEND PUSH NOTIFICATION
// ═══════════════════════════════════════════════════════════════════

export const sendPushNotification = action({
  args: {
    adminToken: v.string(),
    token: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!projectId || !serviceAccountKey) {
      return { success: false, error: "Firebase not configured" };
    }

    try {
      // Get access token (simplified - in production use proper auth)
      const accessToken = await getAccessToken(serviceAccountKey);

      const response = await fetch(`${FCM_API_URL}/${projectId}/messages:send`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: args.token,
            notification: {
              title: args.title,
              body: args.body,
            },
            data: args.data || {},
            webpush: {
              headers: {
                TTL: "86400",
              },
            },
          },
        }),
      });

      const result = await response.json();

      if (result.name) {
        await ctx.runMutation(internal.push_notifications.logPush, {
          token: args.token.substring(0, 20) + "...",
          title: args.title,
          status: "sent",
        });
        return { success: true, messageId: result.name };
      }
      return { success: false, error: result.error?.message || "Failed to send" };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// SEND BROADCAST PUSH
// ═══════════════════════════════════════════════════════════════════

export const sendBroadcastPush = action({
  args: {
    adminToken: v.string(),
    tokens: v.array(v.string()),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    const results = [];
    for (const token of args.tokens) {
      const result = await ctx.runAction(internal.push_notifications.sendPushNotification, {
        adminToken: args.adminToken,
        token,
        title: args.title,
        body: args.body,
        data: args.data,
      });
      results.push({ token: token.substring(0, 20) + "...", ...result });
    }

    return {
      success: true,
      total: args.tokens.length,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// SEND WELCOME PUSH
// ═══════════════════════════════════════════════════════════════════

export const sendWelcomePush = action({
  args: {
    adminToken: v.string(),
    token: v.string(),
    userName: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const session = await tryGetAdminSessionInAction(ctx, args.adminToken);
    if (!session) return { error: "Unauthorized" };

    return await ctx.runAction(internal.push_notifications.sendPushNotification, {
      adminToken: args.adminToken,
      token: args.token,
      title: "Welcome to DutchKem Prosuite! 🎉",
      body: `Hi ${args.userName}! You now have access to 15 AI agents. Get started now!`,
      data: { screen: "dashboard" },
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

async function getAccessToken(serviceAccountKey: string): Promise<string> {
  // Simplified - in production, use proper Google Auth
  const key = JSON.parse(serviceAccountKey);
  const now = Math.floor(Date.now() / 1000);
  
  // Create JWT (simplified)
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  // In production, sign with private key
  return `${header}.${payload}.signature`;
}

// ═══════════════════════════════════════════════════════════════════
// LOG PUSH
// ═══════════════════════════════════════════════════════════════════

export const logPush = internalMutation({
  args: {
    token: v.string(),
    title: v.string(),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("mimo_health_logs", {
      component: "push_notification",
      status: "healthy",
      responseTimeMs: 0,
      details: JSON.stringify(args),
      checksRun: 1,
      checksPassed: 1,
      checksFailed: 0,
      issuesFound: 0,
      issuesAutoFixed: 0,
      severity: "info",
      timestamp: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════

export const getPushStatus = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return {
      configured: !!process.env.FIREBASE_PROJECT_ID,
      projectId: process.env.FIREBASE_PROJECT_ID || "Not configured",
      status: process.env.FIREBASE_PROJECT_ID ? "Ready" : "Needs configuration",
      features: ["Single Push", "Broadcast", "Welcome Notifications", "Service Alerts"],
    };
  },
});
