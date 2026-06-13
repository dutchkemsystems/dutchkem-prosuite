import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

/** Create a support ticket */
export const createTicket = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    companyId: v.string(),
    subject: v.string(),
    description: v.string(),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("critical")),
    category: v.union(v.literal("technical"), v.literal("billing"), v.literal("feature_request"), v.literal("security"), v.literal("compliance"), v.literal("general")),
    customerEmail: v.string(),
    customerName: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const ticketCount = (await ctx.db.query("enterprise_support_tickets").collect()).length;
    const ticketNumber = `TKT-${String(ticketCount + 1).padStart(5, "0")}`;

    const slaResponseTime = args.priority === "critical" ? 15 : args.priority === "high" ? 60 : args.priority === "normal" ? 240 : 480;
    const slaResolutionTime = args.priority === "critical" ? 4 : args.priority === "high" ? 8 : args.priority === "normal" ? 24 : 72;

    const recordId = await ctx.db.insert("enterprise_support_tickets", {
      orgId: args.orgId,
      companyId: args.companyId,
      ticketNumber,
      subject: args.subject,
      description: args.description,
      priority: args.priority,
      category: args.category,
      status: "open",
      assignedTo: undefined,
      customerEmail: args.customerEmail,
      customerName: args.customerName,
      responses: [],
      attachments: [],
      slaResponseTime,
      slaResolutionTime,
      firstResponseAt: undefined,
      resolvedAt: undefined,
      satisfactionScore: undefined,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "SUPPORT_TICKET_CREATED",
      actor: identity._id,
      action: "create_ticket",
      target: args.companyId,
      details: { ticketNumber, subject: args.subject, priority: args.priority },
      createdAt: now,
    });

    return { success: true, ticketId: recordId, ticketNumber };
  },
});

/** List tickets for a company */
export const listTickets = query({
  args: { companyId: v.string(), status: v.optional(v.string()), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    let q: any = ctx.db.query("enterprise_support_tickets")
      .withIndex("by_company", (q2) => q2.eq("companyId", args.companyId));

    if (args.status && args.status !== "all") {
      q = q.filter((q2: any) => q2.eq(q2.field("status"), args.status));
    }

    return await q.order("desc").take(50);
  },
});

/** List all tickets (admin view) */
export const listAllTickets = query({
  args: { status: v.optional(v.string()), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    let q: any = ctx.db.query("enterprise_support_tickets");
    if (args.status && args.status !== "all") {
      q = q.withIndex("by_status", (q2: any) => q2.eq("status", args.status as any));
    }
    return await q.order("desc").take(100);
  },
});

/** Add response to ticket */
export const addResponse = mutation({
  args: {
    ticketId: v.id("enterprise_support_tickets"),
    responderId: v.string(),
    responderName: v.string(),
    responderType: v.union(v.literal("customer"), v.literal("agent"), v.literal("system")),
    message: v.string(),
    isInternal: v.boolean(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const responseId = await ctx.db.insert("enterprise_support_responses", {
      ticketId: args.ticketId,
      responderId: args.responderId,
      responderName: args.responderName,
      responderType: args.responderType,
      message: args.message,
      isInternal: args.isInternal,
      createdAt: now,
    });

    const ticket = await ctx.db.get("enterprise_support_tickets", args.ticketId);
    if (ticket) {
      const patch: any = {
        responses: [...ticket.responses, { id: responseId, message: args.message, responderType: args.responderType, createdAt: now }],
        updatedAt: now,
      };
      if (args.responderType === "agent" && !ticket.firstResponseAt) {
        patch.firstResponseAt = now;
      }
      if (ticket.status === "open") {
        patch.status = "in_progress";
      }
      await ctx.db.patch(args.ticketId, patch);
    }

    return { success: true, responseId };
  },
});

/** Update ticket status */
export const updateTicketStatus = mutation({
  args: {
    ticketId: v.id("enterprise_support_tickets"),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("waiting_customer"), v.literal("resolved"), v.literal("closed")),
    assignedTo: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const patch: any = { status: args.status, updatedAt: now };
    if (args.assignedTo !== undefined) patch.assignedTo = args.assignedTo;
    if (args.status === "resolved") patch.resolvedAt = now;

    await ctx.db.patch(args.ticketId, patch);
    return { success: true };
  },
});

/** Rate ticket satisfaction */
export const rateTicket = mutation({
  args: {
    ticketId: v.id("enterprise_support_tickets"),
    score: v.number(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.ticketId, { satisfactionScore: args.score, updatedAt: Date.now() });
    return { success: true };
  },
});

/** Get support dashboard stats */
export const getSupportDashboard = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const tickets = await ctx.db.query("enterprise_support_tickets").collect();

    const total = tickets.length;
    const open = tickets.filter((t: any) => t.status === "open").length;
    const inProgress = tickets.filter((t: any) => t.status === "in_progress").length;
    const resolved = tickets.filter((t: any) => t.status === "resolved" || t.status === "closed").length;
    const critical = tickets.filter((t: any) => t.priority === "critical" && t.status !== "resolved" && t.status !== "closed").length;

    const priorityBreakdown = {
      low: tickets.filter((t: any) => t.priority === "low").length,
      normal: tickets.filter((t: any) => t.priority === "normal").length,
      high: tickets.filter((t: any) => t.priority === "high").length,
      critical: tickets.filter((t: any) => t.priority === "critical").length,
    };

    const categoryBreakdown: Record<string, number> = {};
    for (const t of tickets) {
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + 1;
    }

    const rated = tickets.filter((t: any) => t.satisfactionScore !== undefined);
    const avgSatisfaction = rated.length > 0
      ? rated.reduce((sum: number, t: any) => sum + (t.satisfactionScore || 0), 0) / rated.length
      : 0;

    const respondedInTime = tickets.filter((t: any) => {
      if (!t.firstResponseAt) return false;
      const responseMs = t.firstResponseAt - t.createdAt;
      return responseMs <= t.slaResponseTime * 60000;
    });
    const slaCompliance = total > 0 ? (respondedInTime.length / total) * 100 : 100;

    return {
      total,
      open,
      inProgress,
      resolved,
      critical,
      priorityBreakdown,
      categoryBreakdown,
      avgSatisfaction: avgSatisfaction.toFixed(1),
      slaCompliance: slaCompliance.toFixed(1),
      recentTickets: tickets.slice(0, 10),
    };
  },
});
