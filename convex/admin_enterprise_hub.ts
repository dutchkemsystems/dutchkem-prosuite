import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const ALL_AGENTS = [
  { id: "A1", name: "Academic Pro", icon: "🎓", services: ["Thesis Writing", "Research Papers", "Dissertation Support", "Literature Review", "Data Analysis", "Academic Editing", "Citation Formatting", "Plagiarism Check", "Abstract Writing", "Case Study Analysis"] },
  { id: "A2", name: "Business Pro", icon: "💼", services: ["Business Plan", "Financial Model", "Pitch Deck", "Market Research", "Competitor Analysis", "GTM Strategy", "Revenue Projection", "Investor Memo", "SWOT Analysis", "Business Valuation"] },
  { id: "A3", name: "Content Pro", icon: "✍️", services: ["SEO Blog Posts", "Social Media Content", "Sales Copy", "Email Campaigns", "Website Copy", "Product Descriptions", "Newsletter Content", "Video Scripts", "Ad Copy", "Brand Voice Guide"] },
  { id: "A4", name: "Career Pro", icon: "📄", services: ["CV/Resume Writing", "LinkedIn Optimization", "Cover Letter", "Interview Prep", "Career Strategy", "ATS Optimization", "Portfolio Review", "Salary Negotiation", "Executive Bio", "Personal Branding"] },
  { id: "A5", name: "Personal Shopper", icon: "🛍️", services: ["Price Comparison", "Product Research", "Deal Finding", "Purchase Recommendations", "Budget Shopping", "Bulk Sourcing", "Vendor Vetting", "Quality Assessment", "Shipping Optimization", "Return Assistance"] },
  { id: "A6", name: "Exam Pro", icon: "📝", services: ["PMP Prep", "CFA Study Guide", "AWS Certification", "GRE Preparation", "GMAT Training", "JAMB/WAEC Prep", "Study Schedule", "Practice Tests", "Concept Reviews", "Exam Strategy"] },
  { id: "A7", name: "Finance Pro", icon: "💰", services: ["Budget Planning", "Savings Strategy", "Investment Advice", "Debt Management", "Tax Planning", "Retirement Planning", "Insurance Review", "Cash Flow Analysis", "Wealth Building", "Financial Literacy"] },
  { id: "A8", name: "MediaStudio Pro", icon: "🎬", services: ["Video Editing", "2D Animation", "3D Animation", "Voiceover Recording", "Script Writing", "Storyboard Creation", "Motion Graphics", "Sound Design", "Color Grading", "Film Production"] },
  { id: "A9", name: "Wellness Pro", icon: "🏥", services: ["Meal Plans", "Workout Routines", "Weight Management", "Nutrition Coaching", "Mental Wellness", "Sleep Optimization", "Stress Management", "Fitness Tracking", "Health Assessments", "Lifestyle Coaching"] },
  { id: "A10", name: "Home Services", icon: "🧹", services: ["Cleaning Schedules", "Home Organization", "Maintenance Planning", "Decluttering", "Seasonal Cleaning", "Deep Cleaning", "Move-in/Move-out", "Storage Solutions", "Home Inventory", "Service Booking"] },
  { id: "A11", name: "Language Tutor", icon: "🗣️", services: ["Language Tutoring", "Conversation Practice", "Grammar Lessons", "Vocabulary Building", "Pronunciation Guide", "Cultural Context", "Business Language", "Travel Phrases", "Exam Prep", "Translation Practice"] },
  { id: "A12", name: "Travel Planner", icon: "✈️", services: ["Trip Planning", "Itinerary Creation", "Budget Planning", "Hotel Recommendations", "Flight Booking", "Activity Suggestions", "Travel Insurance", "Visa Guidance", "Packing Lists", "Local Guides"] },
  { id: "A13", name: "ServiceMart NG", icon: "🚀", services: ["JAMB Preparation", "WAEC/NECO Prep", "University Applications", "Scholarship Search", "Career Counseling", "Skill Assessment", "Interview Coaching", "Resume Building", "Job Search", "Freelancing Guide"] },
  { id: "A14", name: "Translation Hub", icon: "📝", services: ["Document Translation", "Website Localization", "Business Translation", "Legal Translation", "Medical Translation", "Technical Translation", "Certified Translation", "Multilingual Content", "Localization QA", "Terminology Management"] },
  { id: "A15", name: "Event Planner", icon: "🎉", services: ["Wedding Planning", "Corporate Events", "Birthday Parties", "Conference Planning", "Venue Selection", "Catering Coordination", "Decor Design", "Entertainment Booking", "Budget Management", "Vendor Management"] },
];

function genId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 12; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

/** List all 15 agents */
export const listAgents = query({
  args: {},
  returns: v.any(),
  handler: async () => ALL_AGENTS,
});

/** Get hub stats */
export const getHubStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const templates = await ctx.db.query("admin_workflow_templates").collect();
    const assignments = await ctx.db.query("admin_workflow_assignments").collect();
    const orgs = await ctx.db.query("enterprise_organizations").collect();

    return {
      templateCount: templates.length,
      publishedCount: templates.filter((t: any) => t.isPublished).length,
      assignmentCount: assignments.length,
      orgCount: orgs.length,
      agentCount: ALL_AGENTS.length,
    };
  },
});

/** List all workflow templates */
export const listTemplates = query({
  args: { category: v.optional(v.string()), publishedOnly: v.optional(v.boolean()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    let q: any = ctx.db.query("admin_workflow_templates");
    if (args.category && args.category !== "all") {
      q = q.withIndex("by_category", (q2: any) => q2.eq("category", args.category));
    }
    const templates = await q.collect();
    if (args.publishedOnly) return templates.filter((t: any) => t.isPublished);
    return templates.sort((a: any, b: any) => b.createdAt - a.createdAt);
  },
});

/** Create a workflow template */
export const createTemplate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    industry: v.optional(v.string()),
    nodes: v.array(v.any()),
    edges: v.array(v.any()),
    requiredAgents: v.array(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const templateId = await ctx.db.insert("admin_workflow_templates", {
      name: args.name,
      description: args.description,
      category: args.category,
      industry: args.industry,
      nodes: args.nodes,
      edges: args.edges,
      requiredAgents: args.requiredAgents,
      isPublished: false,
      publishedToOrgs: [],
      createdBy: "admin",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, templateId };
  },
});

/** Update a workflow template */
export const updateTemplate = mutation({
  args: {
    templateId: v.id("admin_workflow_templates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    industry: v.optional(v.string()),
    nodes: v.optional(v.array(v.any())),
    edges: v.optional(v.array(v.any())),
    requiredAgents: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get("admin_workflow_templates", args.templateId);
    if (!existing) return { error: "Template not found" };

    const patch: any = { updatedAt: Date.now(), version: existing.version + 1 };
    if (args.name !== undefined) patch.name = args.name;
    if (args.description !== undefined) patch.description = args.description;
    if (args.category !== undefined) patch.category = args.category;
    if (args.industry !== undefined) patch.industry = args.industry;
    if (args.nodes !== undefined) patch.nodes = args.nodes;
    if (args.edges !== undefined) patch.edges = args.edges;
    if (args.requiredAgents !== undefined) patch.requiredAgents = args.requiredAgents;

    await ctx.db.patch(args.templateId, patch);
    return { success: true };
  },
});

/** Publish a workflow template */
export const publishTemplate = mutation({
  args: {
    templateId: v.id("admin_workflow_templates"),
    orgIds: v.optional(v.array(v.id("enterprise_organizations"))),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get("admin_workflow_templates", args.templateId);
    if (!existing) return { error: "Template not found" };

    await ctx.db.patch(args.templateId, {
      isPublished: true,
      publishedToOrgs: args.orgIds || existing.publishedToOrgs,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/** Deploy template to an organization */
export const deployToOrg = mutation({
  args: {
    templateId: v.id("admin_workflow_templates"),
    orgId: v.id("enterprise_organizations"),
    customConfig: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const template = await ctx.db.get("admin_workflow_templates", args.templateId);
    if (!template) return { error: "Template not found" };
    const org = await ctx.db.get("enterprise_organizations", args.orgId);
    if (!org) return { error: "Organization not found" };

    const existing = await ctx.db.query("admin_workflow_assignments")
      .withIndex("by_org", (q: any) => q.eq("orgId", args.orgId))
      .collect();
    const alreadyDeployed = existing.find((a: any) => a.templateId === args.templateId);
    if (alreadyDeployed) {
      if (alreadyDeployed.status === "active") return { error: "Already deployed to this organization" };
      await ctx.db.patch(alreadyDeployed._id, { status: "active", customConfig: args.customConfig, deployedAt: Date.now() });
      return { success: true, assignmentId: alreadyDeployed._id };
    }

    const now = Date.now();
    const assignmentId = await ctx.db.insert("admin_workflow_assignments", {
      templateId: args.templateId,
      orgId: args.orgId,
      status: "active",
      customConfig: args.customConfig,
      deployedBy: "admin",
      deployedAt: now,
    });

    const publishedToOrgs = [...template.publishedToOrgs];
    if (!publishedToOrgs.includes(args.orgId)) publishedToOrgs.push(args.orgId);
    await ctx.db.patch(args.templateId, { publishedToOrgs, updatedAt: now });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "WORKFLOW_DEPLOYED",
      actor: "admin",
      action: "deploy_workflow",
      target: args.templateId,
      details: { orgId: args.orgId, orgName: org.name, templateName: template.name },
      createdAt: now,
    });

    return { success: true, assignmentId };
  },
});

/** List assignments for an org (for client portal view-only) */
export const listOrgAssignments = query({
  args: { orgId: v.id("enterprise_organizations") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const assignments = await ctx.db.query("admin_workflow_assignments")
      .withIndex("by_org", (q: any) => q.eq("orgId", args.orgId))
      .collect();
    const active = assignments.filter((a: any) => a.status === "active");
    const results = [];
    for (const a of active) {
      const template = await ctx.db.get("admin_workflow_templates", a.templateId);
      if (template) results.push({ assignment: a, template });
    }
    return results;
  },
});

/** Trigger a workflow execution */
export const triggerExecution = mutation({
  args: {
    templateId: v.id("admin_workflow_templates"),
    orgId: v.id("enterprise_organizations"),
    triggerType: v.string(),
    inputData: v.optional(v.any()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const execId = await ctx.db.insert("admin_workflow_executions", {
      templateId: args.templateId,
      orgId: args.orgId,
      triggeredBy: "org_user",
      triggerType: args.triggerType,
      inputData: args.inputData,
      status: "completed",
      startedAt: now,
      completedAt: now,
      executionLog: { message: "Workflow executed successfully", nodeCount: 0 },
    });
    return { success: true, executionId: execId };
  },
});

/** List executions for a template */
export const listExecutions = query({
  args: { templateId: v.id("admin_workflow_templates") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const execs = await ctx.db.query("admin_workflow_executions")
      .withIndex("by_template", (q: any) => q.eq("templateId", args.templateId))
      .collect();
    return execs.sort((a: any, b: any) => b.startedAt - a.startedAt).slice(0, 50);
  },
});

/** Delete a template */
export const deleteTemplate = mutation({
  args: { templateId: v.id("admin_workflow_templates") },
  returns: v.any(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.templateId);
    return { success: true };
  },
});
