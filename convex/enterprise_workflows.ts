import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function getOrgFromToken(ctx: any, token: string) {
  const session = await ctx.db.query("enterprise_sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
  if (!session || !session.isCurrent || session.expiresAt < Date.now()) return null;
  return session.orgId;
}

const WORKFLOW_TEMPLATES = [
  {
    id: "lead-gen",
    name: "Lead Generation Pipeline",
    description: "Automated lead capture, scoring, and qualification workflow",
    category: "Sales",
    nodes: [
      { id: "trigger", type: "trigger", label: "New Lead Captured", icon: "⚡", x: 50, y: 120, config: { source: "web_form" } },
      { id: "enrich", type: "action", label: "Data Enrichment", icon: "🔍", x: 220, y: 60, config: { provider: "clearbit" } },
      { id: "score", type: "action", label: "Lead Scoring", icon: "📊", x: 220, y: 180, config: { model: "rfm" } },
      { id: "qualify", type: "action", label: "Qualification Check", icon: "✅", x: 400, y: 120, config: { threshold: 70 } },
      { id: "notify", type: "action", label: "Notify Sales Team", icon: "📧", x: 570, y: 120, config: { channel: "email" } },
    ],
    edges: [
      { from: "trigger", to: "enrich" }, { from: "trigger", to: "score" },
      { from: "enrich", to: "qualify" }, { from: "score", to: "qualify" },
      { from: "qualify", to: "notify" },
    ],
  },
  {
    id: "content-pipeline",
    name: "Content Production Line",
    description: "Research, write, review, and publish content automatically",
    category: "Marketing",
    nodes: [
      { id: "trigger", type: "trigger", label: "Content Request", icon: "⚡", x: 50, y: 120, config: { source: "dashboard" } },
      { id: "research", type: "action", label: "Research Agent", icon: "🔍", x: 220, y: 60, config: { depth: "thorough" } },
      { id: "write", type: "action", label: "Writing Agent", icon: "✍️", x: 220, y: 180, config: { style: "professional" } },
      { id: "review", type: "action", label: "Review & Edit", icon: "📝", x: 400, y: 60, config: { checks: ["grammar", "brand", "seo"] } },
      { id: "approve", type: "action", label: "Approval Gate", icon: "👤", x: 400, y: 180, config: { approvers: ["editor"] } },
      { id: "publish", type: "action", label: "Auto Publish", icon: "📤", x: 570, y: 120, config: { platforms: ["blog", "social"] } },
    ],
    edges: [
      { from: "trigger", to: "research" }, { from: "trigger", to: "write" },
      { from: "research", to: "review" }, { from: "write", to: "approve" },
      { from: "review", to: "publish" }, { from: "approve", to: "publish" },
    ],
  },
  {
    id: "support-triage",
    name: "Customer Support Triage",
    description: "Auto-classify, route, and respond to support tickets",
    category: "Support",
    nodes: [
      { id: "trigger", type: "trigger", label: "New Ticket", icon: "⚡", x: 50, y: 120, config: { source: "email" } },
      { id: "classify", type: "action", label: "Ticket Classifier", icon: "🏷️", x: 220, y: 60, config: { categories: ["billing", "technical", "general"] } },
      { id: "priority", type: "action", label: "Priority Scanner", icon: "🔴", x: 220, y: 180, config: { urgencyModel: "sentiment" } },
      { id: "route", type: "action", label: "Smart Router", icon: "🔀", x: 400, y: 120, config: {负载均衡: true } },
      { id: "respond", type: "action", label: "Auto Responder", icon: "💬", x: 570, y: 120, config: { templates: true } },
    ],
    edges: [
      { from: "trigger", to: "classify" }, { from: "trigger", to: "priority" },
      { from: "classify", to: "route" }, { from: "priority", to: "route" },
      { from: "route", to: "respond" },
    ],
  },
  {
    id: "hr-onboarding",
    name: "Employee Onboarding",
    description: "Streamlined new hire setup with automated tasks and notifications",
    category: "HR",
    nodes: [
      { id: "trigger", type: "trigger", label: "New Hire Added", icon: "⚡", x: 50, y: 120, config: { source: "hr_system" } },
      { id: "account", type: "action", label: "Create Accounts", icon: "🔑", x: 220, y: 60, config: { systems: ["email", "slack", "jira"] } },
      { id: "docs", type: "action", label: "Prepare Documents", icon: "📄", x: 220, y: 180, config: { templates: ["offer", "nda", "handbook"] } },
      { id: "training", type: "action", label: "Schedule Training", icon: "📅", x: 400, y: 120, config: { duration: "1 week" } },
      { id: "notify", type: "action", label: "Welcome Message", icon: "👋", x: 570, y: 120, config: { channel: "slack" } },
    ],
    edges: [
      { from: "trigger", to: "account" }, { from: "trigger", to: "docs" },
      { from: "account", to: "training" }, { from: "docs", to: "training" },
      { from: "training", to: "notify" },
    ],
  },
  {
    id: "data-pipeline",
    name: "Data Analytics Pipeline",
    description: "Automated data collection, transformation, and reporting",
    category: "Analytics",
    nodes: [
      { id: "trigger", type: "trigger", label: "Scheduled Run", icon: "⚡", x: 50, y: 120, config: { cron: "0 2 * * *" } },
      { id: "extract", type: "action", label: "Data Extraction", icon: "📥", x: 220, y: 60, config: { sources: ["db", "api", "csv"] } },
      { id: "transform", type: "action", label: "Transform & Clean", icon: "🔧", x: 220, y: 180, config: { operations: ["dedupe", "normalize"] } },
      { id: "analyze", type: "action", label: "AI Analysis", icon: "🧠", x: 400, y: 60, config: { models: ["anomaly", "trend"] } },
      { id: "report", type: "action", label: "Generate Report", icon: "📊", x: 400, y: 180, config: { format: "pdf" } },
      { id: "distribute", type: "action", label: "Distribute", icon: "📤", x: 570, y: 120, config: { recipients: ["team"] } },
    ],
    edges: [
      { from: "trigger", to: "extract" },
      { from: "extract", to: "transform" },
      { from: "transform", to: "analyze" }, { from: "transform", to: "report" },
      { from: "analyze", to: "distribute" }, { from: "report", to: "distribute" },
    ],
  },
  {
    id: "finance-approval",
    name: "Expense Approval Chain",
    description: "Multi-level expense review with automatic policy checks",
    category: "Finance",
    nodes: [
      { id: "trigger", type: "trigger", label: "Expense Submitted", icon: "⚡", x: 50, y: 120, config: { source: "form" } },
      { id: "validate", type: "action", label: "Receipt Validator", icon: "🧾", x: 220, y: 60, config: { ocr: true } },
      { id: "policy", type: "action", label: "Policy Checker", icon: "📋", x: 220, y: 180, config: { rules: ["limit", "category", "frequency"] } },
      { id: "approve", type: "action", label: "Manager Approval", icon: "👤", x: 400, y: 120, config: { threshold: 50000 } },
      { id: "pay", type: "action", label: "Process Payment", icon: "💳", x: 570, y: 120, config: { method: "bank_transfer" } },
    ],
    edges: [
      { from: "trigger", to: "validate" }, { from: "trigger", to: "policy" },
      { from: "validate", to: "approve" }, { from: "policy", to: "approve" },
      { from: "approve", to: "pay" },
    ],
  },
];

/** List workflow templates */
export const listTemplates = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return WORKFLOW_TEMPLATES;
  },
});

/** Create a workflow from template or scratch */
export const createWorkflow = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    templateId: v.optional(v.string()),
    nodes: v.optional(v.array(v.any())),
    edges: v.optional(v.array(v.any())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };

    let nodes = args.nodes || [];
    let edges = args.edges || [];

    if (args.templateId) {
      const template = WORKFLOW_TEMPLATES.find(t => t.id === args.templateId);
      if (template) {
        nodes = template.nodes;
        edges = template.edges;
      }
    }

    const now = Date.now();
    const workflowId = await ctx.db.insert("enterprise_workflows", {
      orgId,
      name: args.name,
      description: args.description,
      nodes,
      edges,
      status: "draft",
      createdBy: "org",
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "WORKFLOW_CREATED",
      actor: orgId,
      action: "create_workflow",
      target: workflowId,
      details: { name: args.name, templateId: args.templateId },
      createdAt: now,
    });

    return { success: true, workflowId };
  },
});

/** List all workflows for an org */
export const listWorkflows = query({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return [];

    const workflows = await ctx.db.query("enterprise_workflows")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    return workflows.map((w: any) => ({
      _id: w._id,
      name: w.name,
      description: w.description,
      status: w.status,
      nodeCount: w.nodes.length,
      runCount: w.runCount,
      lastRunAt: w.lastRunAt,
      createdAt: w.createdAt,
    }));
  },
});

/** Get a single workflow by ID */
export const getWorkflow = query({
  args: { token: v.string(), workflowId: v.id("enterprise_workflows") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return null;

    const workflow = await ctx.db.get("enterprise_workflows", args.workflowId);
    if (!workflow || workflow.orgId !== orgId) return null;
    return workflow;
  },
});

/** Update a workflow */
export const updateWorkflow = mutation({
  args: {
    token: v.string(),
    workflowId: v.id("enterprise_workflows"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    nodes: v.optional(v.array(v.any())),
    edges: v.optional(v.array(v.any())),
    status: v.optional(v.union(v.literal("draft"), v.literal("active"), v.literal("paused"), v.literal("archived"))),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };

    const workflow = await ctx.db.get("enterprise_workflows", args.workflowId);
    if (!workflow || workflow.orgId !== orgId) return { error: "Not found" };

    const patch: any = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.description !== undefined) patch.description = args.description;
    if (args.nodes !== undefined) patch.nodes = args.nodes;
    if (args.edges !== undefined) patch.edges = args.edges;
    if (args.status !== undefined) patch.status = args.status;

    await ctx.db.patch(args.workflowId, patch);
    return { success: true };
  },
});

/** Delete a workflow */
export const deleteWorkflow = mutation({
  args: { token: v.string(), workflowId: v.id("enterprise_workflows") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };

    const workflow = await ctx.db.get("enterprise_workflows", args.workflowId);
    if (!workflow || workflow.orgId !== orgId) return { error: "Not found" };

    await ctx.db.delete(args.workflowId);
    return { success: true };
  },
});

/** Run a workflow (simulate execution) */
export const runWorkflow = mutation({
  args: { token: v.string(), workflowId: v.id("enterprise_workflows") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };

    const workflow = await ctx.db.get("enterprise_workflows", args.workflowId);
    if (!workflow || workflow.orgId !== orgId) return { error: "Not found" };

    await ctx.db.patch(args.workflowId, {
      runCount: workflow.runCount + 1,
      lastRunAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "WORKFLOW_RUN",
      actor: orgId,
      action: "run_workflow",
      target: args.workflowId,
      details: { name: workflow.name, runNumber: workflow.runCount + 1 },
      createdAt: Date.now(),
    });

    return { success: true, runNumber: workflow.runCount + 1 };
  },
});

/** Duplicate a workflow */
export const duplicateWorkflow = mutation({
  args: { token: v.string(), workflowId: v.id("enterprise_workflows"), newName: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };

    const source = await ctx.db.get("enterprise_workflows", args.workflowId);
    if (!source || source.orgId !== orgId) return { error: "Not found" };

    const now = Date.now();
    const newId = await ctx.db.insert("enterprise_workflows", {
      orgId,
      name: args.newName,
      description: source.description,
      nodes: source.nodes,
      edges: source.edges,
      status: "draft",
      createdBy: "org",
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, workflowId: newId };
  },
});
