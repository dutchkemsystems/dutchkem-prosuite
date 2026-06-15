import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";
import type { Id } from "./_generated/dataModel";

/** Resolve orgId from either admin session or enterprise session token */
async function resolveOrgId(
  ctx: any,
  args: { adminToken?: string; token?: string; orgId?: Id<"enterprise_organizations"> }
): Promise<Id<"enterprise_organizations"> | null> {
  if (args.orgId) return args.orgId;
  if (args.adminToken) {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    return identity ? null : null; // admin doesn't have an orgId
  }
  if (args.token) {
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    if (session && session.isCurrent) return session.orgId;
  }
  return null;
}

const MARKETPLACE_AGENTS = [
  { id: "M1", name: "Customer Support Bot", description: "Handles customer inquiries, ticket routing, and support escalation with 24/7 availability", category: "Support", price: 5000, complexity: "medium", estimatedTime: "2 weeks", capabilities: ["ticket_routing", "auto_response", "escalation", "sentiment_analysis"] },
  { id: "M2", name: "Sales Lead Qualifier", description: "Scores and qualifies inbound leads using BANT framework and custom scoring models", category: "Sales", price: 7500, complexity: "high", estimatedTime: "3 weeks", capabilities: ["lead_scoring", "BANT_qualification", "crm_integration", "follow_up"] },
  { id: "M3", name: "Content Writer Pro", description: "Generates SEO-optimized blog posts, social media content, and marketing copy", category: "Marketing", price: 3000, complexity: "low", estimatedTime: "1 week", capabilities: ["seo_writing", "social_media", "copywriting", "brand_voice"] },
  { id: "M4", name: "Data Analyst Agent", description: "Analyzes datasets, generates reports, and creates visualizations from raw data", category: "Analytics", price: 8000, complexity: "high", estimatedTime: "3 weeks", capabilities: ["data_analysis", "reporting", "visualization", "forecasting"] },
  { id: "M5", name: "HR Onboarding Bot", description: "Streamlines new hire onboarding with document collection, training scheduling, and FAQ handling", category: "HR", price: 4000, complexity: "medium", estimatedTime: "2 weeks", capabilities: ["document_collection", "training_schedule", "faq_handling", "compliance"] },
  { id: "M6", name: "Legal Document Review", description: "Reviews contracts, identifies risk clauses, and ensures compliance with legal standards", category: "Legal", price: 12000, complexity: "high", estimatedTime: "4 weeks", capabilities: ["contract_review", "risk_identification", "compliance_check", "clause_analysis"] },
  { id: "M7", name: "Finance Assistant", description: "Manages expense tracking, budget monitoring, and financial report generation", category: "Finance", price: 6000, complexity: "medium", estimatedTime: "2 weeks", capabilities: ["expense_tracking", "budget_monitoring", "report_generation", "forecasting"] },
  { id: "M8", name: "Project Manager Agent", description: "Coordinates tasks, tracks milestones, and manages team workflows across projects", category: "Operations", price: 5500, complexity: "medium", estimatedTime: "2 weeks", capabilities: ["task_coordination", "milestone_tracking", "workflow_management", "reporting"] },
  { id: "M9", name: "Compliance Monitor", description: "Monitors regulatory compliance across banking, insurance, and financial operations", category: "Compliance", price: 10000, complexity: "high", estimatedTime: "4 weeks", capabilities: ["regulation_monitoring", "audit_trail", "violation_detection", "reporting"] },
  { id: "M10", name: "Healthcare Triage Bot", description: "Initial patient assessment, symptom analysis, and care pathway recommendation", category: "Healthcare", price: 15000, complexity: "high", estimatedTime: "5 weeks", capabilities: ["symptom_analysis", "triage", "care_pathway", "appointment_scheduling"] },
];

/** List all available marketplace agents */
export const listAgents = query({
  args: { category: v.optional(v.string()), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    let filtered = MARKETPLACE_AGENTS;
    if (args.category && args.category !== "all") {
      filtered = MARKETPLACE_AGENTS.filter((a) => a.category === args.category);
    }
    return filtered;
  },
});

/** Get installed agents for an org — works with both admin and enterprise tokens */
export const getInstalledAgents = query({
  args: {
    orgId: v.optional(v.id("enterprise_organizations")),
    adminToken: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await resolveOrgId(ctx, args);
    if (!orgId) {
      if (args.adminToken) {
        const identity = await tryGetAdminSession(ctx, args.adminToken);
        if (!identity) throw new Error("Not authenticated");
      }
      return [];
    }

    return await ctx.db.query("enterprise_marketplace_installs")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
  },
});

/** Install an agent/template — works with both admin and enterprise tokens */
export const installAgent = mutation({
  args: {
    templateId: v.string(),
    templateName: v.string(),
    orgId: v.optional(v.id("enterprise_organizations")),
    customConfig: v.optional(v.any()),
    adminToken: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await resolveOrgId(ctx, args);
    if (!orgId) {
      if (args.adminToken) {
        const identity = await tryGetAdminSession(ctx, args.adminToken);
        if (!identity) throw new Error("Not authenticated");
      }
      return { error: "Not authenticated" };
    }

    const existing = await ctx.db.query("enterprise_marketplace_installs")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("templateId"), args.templateId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "active",
        customConfig: args.customConfig,
        installedAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { success: true, installed: true, existing: true };
    }

    const now = Date.now();
    const installId = await ctx.db.insert("enterprise_marketplace_installs", {
      orgId,
      templateId: args.templateId,
      templateName: args.templateName,
      status: "active",
      customConfig: args.customConfig,
      installedAt: now,
      createdAt: now,
    });

    return { success: true, installId };
  },
});

/** Uninstall an agent — works with both admin and enterprise tokens */
export const uninstallAgent = mutation({
  args: {
    installId: v.id("enterprise_marketplace_installs"),
    adminToken: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.adminToken) {
      const identity = await tryGetAdminSession(ctx, args.adminToken);
      if (!identity) throw new Error("Not authenticated");
    } else if (args.token) {
      const session = await ctx.db.query("enterprise_sessions")
        .withIndex("by_token", (q) => q.eq("token", args.token!))
        .first();
      if (!session || !session.isCurrent) return { error: "Not authenticated" };
    }

    const record = await ctx.db.get(args.installId);
    if (!record) return { error: "Install not found" };

    await ctx.db.delete(args.installId);
    return { success: true };
  },
});
