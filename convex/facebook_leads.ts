import { v } from "convex/values";
import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Feature 6: Facebook Lead Ads

export const receiveFacebookLead = internalAction({
  args: {
    leadId: v.string(),
    formId: v.string(),
    fieldData: v.array(v.object({
      name: v.string(),
      values: v.array(v.string()),
    })),
  },
  returns: v.object({
    success: v.boolean(),
    leadId: v.id("leads"),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; leadId: Id<"leads">; error?: string }> => {
    // Extract standard fields
    let email: string | undefined;
    let phone: string | undefined;
    let name: string | undefined;

    for (const field of args.fieldData) {
      switch (field.name.toLowerCase()) {
        case "email":
        case "email_address":
        case "emailaddress":
          email = field.values[0];
          break;
        case "phone":
        case "phone_number":
        case "phonenumber":
        case "telephone":
          phone = field.values[0];
          break;
        case "name":
        case "full_name":
        case "fullname":
        case "first_name":
          name = field.values[0];
          break;
      }
    }

    // Create lead in database
    const newLeadId: Id<"leads"> = await ctx.runMutation(internal.facebook_leads.createLead, {
      email,
      phone,
      name,
      source: "facebook",
      facebookLeadId: args.leadId,
    });

    // Trigger workflow if exists
    await ctx.runAction(internal.workflows.executeWorkflow, {
      workflowId: args.formId as any, // Would be mapped to actual workflow
      triggerEvent: {
        type: "new_lead",
        leadId: newLeadId,
        source: "facebook",
        email,
        phone,
        name,
      },
    });

    // Send notification to admin
    await ctx.runMutation(internal.facebook_leads.notifyNewLead, {
      leadId: newLeadId,
      source: "Facebook Lead Ads",
    });

    return { success: true, leadId: newLeadId, error: undefined };
  },
});

export const createLead = internalMutation({
  args: {
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    name: v.optional(v.string()),
    source: v.string(),
    facebookLeadId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.id("leads"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("leads", {
      email: args.email,
      phone: args.phone,
      name: args.name,
      source: args.source,
      facebookLeadId: args.facebookLeadId,
      status: "new",
      metadata: args.metadata,
      receivedAt: Date.now(),
    });
  },
});

export const updateLeadStatus = mutation({
  args: {
    leadId: v.id("leads"),
    status: v.union(v.literal("new"), v.literal("contacted"), v.literal("qualified"), v.literal("converted"), v.literal("lost")),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: any = { status: args.status };
    if (args.status === "contacted" || args.status === "qualified") {
      updates.lastContactedAt = Date.now();
    }
    if (args.notes) {
      updates.notes = args.notes;
    }
    await ctx.db.patch("leads", args.leadId, updates);
    return null;
  },
});

export const assignLead = mutation({
  args: {
    leadId: v.id("leads"),
    assignedTo: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("leads", args.leadId, { assignedTo: args.assignedTo });
    
    // Notify assigned agent
    const lead = await ctx.db.get("leads", args.leadId);
    void lead; // used in notification message below
    
    await ctx.db.insert("notifications", {
      userId: args.assignedTo,
      title: "New Lead Assigned",
      message: `You have been assigned a new lead${lead?.name ? `: ${lead.name}` : ""}.`,
      type: "system",
      read: false,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const getLeads = query({
  args: {
    status: v.optional(v.union(v.literal("new"), v.literal("contacted"), v.literal("qualified"), v.literal("converted"), v.literal("lost"))),
    source: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const query_ = ctx.db.query("leads");
    
    const leads = await query_.collect();
    let filtered = leads;

    if (args.status) {
      filtered = filtered.filter(l => l.status === args.status);
    }
    if (args.source) {
      filtered = filtered.filter(l => l.source === args.source);
    }

    // Sort by receivedAt desc
    filtered.sort((a, b) => b.receivedAt - a.receivedAt);

    const limit = args.limit ?? 50;
    return filtered.slice(0, limit);
  },
});

export const getLeadStats = query({
  args: {},
  returns: v.object({
    total: v.number(),
    new: v.number(),
    contacted: v.number(),
    qualified: v.number(),
    converted: v.number(),
    lost: v.number(),
    bySource: v.record(v.string(), v.number()),
  }),
  handler: async (ctx, args) => {
    const leads = await ctx.db.query("leads").collect();

    const bySource: Record<string, number> = {};
    for (const lead of leads) {
      bySource[lead.source] = (bySource[lead.source] || 0) + 1;
    }

    return {
      total: leads.length,
      new: leads.filter(l => l.status === "new").length,
      contacted: leads.filter(l => l.status === "contacted").length,
      qualified: leads.filter(l => l.status === "qualified").length,
      converted: leads.filter(l => l.status === "converted").length,
      lost: leads.filter(l => l.status === "lost").length,
      bySource,
    };
  },
});

export const notifyNewLead = internalMutation({
  args: { leadId: v.id("leads"), source: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get all admins
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();

    const lead = await ctx.db.get("leads", args.leadId);

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        title: "New Lead Received",
        message: `New lead from ${args.source}${lead?.name ? ` (${lead.name})` : ""}.`,
        type: "system",
        read: false,
        createdAt: Date.now(),
      });
    }
    return null;
  },
});

export const getLeadById = query({
  args: { leadId: v.id("leads") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get("leads", args.leadId);
  },
});
