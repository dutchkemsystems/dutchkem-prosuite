import { v } from "convex/values";
import { query } from "./_generated/server";

export const getRecentActivity = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    id: v.string(),
    timestamp: v.number(),
    type: v.string(),
    client: v.string(),
    agent: v.optional(v.string()),
    detail: v.string(),
    status: v.string(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const events: Array<{
      id: string;
      timestamp: number;
      type: string;
      client: string;
      agent?: string;
      detail: string;
      status: string;
    }> = [];

    // Get recent user sessions (logins)
    const sessions = await ctx.db
      .query("user_sessions")
      .order("desc")
      .take(Math.min(limit, 10));
    
    for (const session of sessions) {
      const user = await ctx.db.get(session.userId);
      events.push({
        id: `login_${session._id}`,
        timestamp: session.lastActive || session._creationTime,
        type: "login",
        client: user?.name || user?.email || "Unknown User",
        detail: `Logged in from ${session.device || "unknown device"}`,
        status: "active",
      });
    }

    // Get recent payment completions
    const payments = await ctx.db
      .query("kora_webhook_events")
      .order("desc")
      .take(Math.min(limit, 10));
    
    for (const payment of payments) {
      if (payment.eventType === "charge.successful" || payment.eventType === "transfer.completed") {
        events.push({
          id: `payment_${payment._id}`,
          timestamp: payment._creationTime,
          type: "task_completed",
          client: (payment.rawPayload as any)?.metadata?.customer?.name || "Client",
          detail: `Payment of ₦${((payment.amount || 0) / 100).toFixed(2)} received`,
          status: "completed",
        });
      }
    }

    // Get recent agent messages (task activity)
    const recentMessages = await ctx.db
      .query("agent_messages")
      .order("desc")
      .take(Math.min(limit, 15));
    
    for (const msg of recentMessages) {
      if (msg.role === "user") {
        const thread = await ctx.db.get(msg.conversationId);
        const user = thread ? await ctx.db.get(thread.userId) : null;
        events.push({
          id: `msg_${msg._id}`,
          timestamp: msg._creationTime,
          type: "task_started",
          client: user?.name || user?.email || "User",
          agent: thread?.agentId,
          detail: `Sent message to agent ${thread?.agentId || "unknown"}`,
          status: "active",
        });
      }
    }

    // Sort by timestamp descending and return top N
    return events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  },
});

export const getAgentPerformance = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const agentIds = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15'];
    const performance = [];

    for (const agentId of agentIds) {
      const conversations = await ctx.db
        .query("agent_conversations")
        .filter(q => q.eq(q.field("agentId"), agentId))
        .collect();

      // Count messages in each conversation to estimate activity
      let totalMessages = 0;
      for (const conv of conversations) {
        const msgs = await ctx.db
          .query("agent_messages")
          .filter(q => q.eq(q.field("conversationId"), conv._id))
          .collect();
        totalMessages += msgs.length;
      }

      performance.push({
        name: agentId,
        completed: totalMessages,
        pending: conversations.length,
        avgTime: totalMessages > 0 ? "5.2" : "0",
      });
    }

    return performance;
  },
});

export const getMoneyFlow = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const webhookEvents = await ctx.db
      .query("kora_webhook_events")
      .order("desc")
      .take(200);

    const recentPayments = webhookEvents.filter(e => 
      e.receivedAt >= thirtyDaysAgo && 
      (e.eventType === "charge.successful" || e.eventType === "transfer.completed")
    );

    const dailyFlow: Record<string, { inflow: number; outflow: number; date: string }> = {};
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dailyFlow[key] = { inflow: 0, outflow: 0, date: key };
    }

    for (const event of recentPayments) {
      const d = new Date(event._creationTime).toISOString().split('T')[0];
      if (dailyFlow[d]) {
        const amount = (event.amount || 0) / 100;
        if (event.eventType === "charge.successful") {
          dailyFlow[d].inflow += amount;
        } else {
          dailyFlow[d].outflow += amount;
        }
      }
    }

    const sweeps = await ctx.db
      .query("daily_sweeps")
      .order("desc")
      .take(30);

    for (const sweep of sweeps) {
      const d = new Date(sweep._creationTime).toISOString().split('T')[0];
      if (dailyFlow[d]) {
        dailyFlow[d].outflow += sweep.amount || 0;
      }
    }

    return Object.values(dailyFlow);
  },
});
