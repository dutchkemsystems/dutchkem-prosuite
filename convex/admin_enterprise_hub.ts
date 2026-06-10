import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

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

/** Initialize marketplace with default templates */
export const initializeMarketplace = internalMutation({
  args: { adminToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const templates = await ctx.db.query("admin_workflow_templates").collect();
    return { success: true, existingCount: templates.length };
  },
});

/** Store default templates in the database */
export const storeDefaultTemplates = internalMutation({
  args: { adminToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    for (const template of INDUSTRY_TEMPLATES) {
      const existing = await ctx.db.query("admin_workflow_templates")
        .withIndex("by_category", (q: any) => q.eq("category", template.name))
        .collect();
      if (existing.length === 0) {
        await ctx.db.insert("admin_workflow_templates", {
          name: template.name,
          description: template.description,
          category: template.category,
          industry: template.industry,
          nodes: template.nodes,
          edges: template.edges,
          requiredAgents: template.requiredAgents,
          isPublished: true,
          publishedToOrgs: [],
          createdBy: "admin",
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
    return { success: true, count: INDUSTRY_TEMPLATES.length };
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
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

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
      createdBy: identity._id,
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
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

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
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

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
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

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
      deployedBy: identity._id,
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
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const execId = await ctx.db.insert("admin_workflow_executions", {
      templateId: args.templateId,
      orgId: args.orgId,
      triggeredBy: identity._id,
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
  args: { templateId: v.id("admin_workflow_templates"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.delete(args.templateId);
    return { success: true };
  },
});

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

/** Industry templates for Enterprise Hub */
const INDUSTRY_TEMPLATES = [
  {
    name: "Customer Support",
    description: "AI-powered customer support system with multi-channel integration",
    category: "Customer Support",
    industry: "retail",
    requiredAgents: ["A1", "A2", "A3"],
    nodes: [
      { id: "trigger1", type: "trigger", data: { label: "New Ticket", trigger: "ticket_created" } },
      { id: "agent1", type: "agent", data: { label: "Academic Pro", agentId: "A1", input: [{ field: "ticket_content", mapping: "trigger1.output.content" }] } },
      { id: "agent2", type: "agent", data: { label: "Business Pro", agentId: "A2", input: [{ field: "customer_context", mapping: "trigger1.output.customer" }] } },
      { id: "agent3", type: "agent", data: { label: "Content Pro", agentId: "A3", input: [{ field: "response_template", mapping: "agent1.output.response" }] } },
      { id: "action1", type: "action", data: { label: "Send Response", action: "send_email", input: [{ field: "response", mapping: "agent3.output.final_response" }] } },
    ],
    edges: [
      { id: "edge1", source: "trigger1", target: "agent1" },
      { id: "edge2", source: "trigger1", target: "agent2" },
      { id: "edge3", source: "agent1", target: "agent3" },
      { id: "edge4", source: "agent2", target: "agent3" },
      { id: "edge5", source: "agent3", target: "action1" },
    ],
  },
  {
    name: "Sales Lead Generator",
    description: "Generate and qualify sales leads through multi-step process",
    category: "Sales",
    industry: "financial",
    requiredAgents: ["A2", "A3", "A4"],
    nodes: [
      { id: "trigger1", type: "trigger", data: { label: "Form Submission", trigger: "form_submitted" } },
      { id: "agent1", type: "agent", data: { label: "Business Pro", agentId: "A2", input: [{ field: "form_data", mapping: "trigger1.output" }] } },
      { id: "agent2", type: "agent", data: { label: "Content Pro", agentId: "A3", input: [{ field: "industry_context", mapping: "agent1.output.industry" }] } },
      { id: "agent3", type: "agent", data: { label: "Career Pro", agentId: "A4", input: [{ field: "lead_score", mapping: "agent2.output.lead_score" }] } },
      { id: "condition1", type: "condition", data: { label: "Lead Score > 80", condition: ">", left: "agent3.output.score", right: 80 } },
      { id: "action1", type: "action", data: { label: "Send to CRM", action: "add_to_crm", input: [{ field: "lead_data", mapping: "agent3.output" }] } },
      { id: "action2", type: "action", data: { label: "Assign to Sales", action: "assign_lead", input: [{ field: "lead_data", mapping: "agent3.output" }] } },
    ],
    edges: [
      { id: "edge1", source: "trigger1", target: "agent1" },
      { id: "edge2", source: "agent1", target: "agent2" },
      { id: "edge3", source: "agent2", target: "agent3" },
      { id: "edge4", source: "agent3", target: "condition1" },
      { id: "edge5", source: "condition1", target: "action1", style: { stroke: "green" } },
      { id: "edge6", source: "condition1", target: "action2", style: { stroke: "red" } },
    ],
  },
  {
    name: "Document Processor",
    description: "Process and extract data from documents with AI verification",
    category: "Document Processing",
    industry: "legal",
    requiredAgents: ["A1", "A2", "A5"],
    nodes: [
      { id: "trigger1", type: "trigger", data: { label: "Document Upload", trigger: "document_uploaded" } },
      { id: "agent1", type: "agent", data: { label: "Academic Pro", agentId: "A1", input: [{ field: "document_content", mapping: "trigger1.output.content" }] } },
      { id: "agent2", type: "agent", data: { label: "Business Pro", agentId: "A2", input: [{ field: "document_type", mapping: "trigger1.output.type" }] } },
      { id: "agent3", type: "agent", data: { label: "Personal Shopper", agentId: "A5", input: [{ field: "extracted_fields", mapping: "agent1.output.fields" }] } },
      { id: "action1", type: "action", data: { label: "Save to Database", action: "save_document", input: [{ field: "document_data", mapping: "agent3.output.processed" }] } },
      { id: "notification1", type: "notification", data: { label: "Notification", action: "send_notification", input: [{ field: "status", value: "Document processed successfully" }] } },
    ],
    edges: [
      { id: "edge1", source: "trigger1", target: "agent1" },
      { id: "edge2", source: "agent1", target: "agent2" },
      { id: "edge3", source: "agent2", target: "agent3" },
      { id: "edge4", source: "agent3", target: "action1" },
      { id: "edge5", source: "action1", target: "notification1" },
    ],
  },
  {
    name: "Compliance Monitor",
    description: "Monitor and ensure regulatory compliance across operations",
    category: "Compliance",
    industry: "healthcare",
    requiredAgents: ["A2", "A5", "A6"],
    nodes: [
      { id: "trigger1", type: "trigger", data: { label: "Audit Check", trigger: "audit_scheduled" } },
      { id: "agent1", type: "agent", data: { label: "Business Pro", agentId: "A2", input: [{ field: "audit_scope", mapping: "trigger1.output.scope" }] } },
      { id: "agent2", type: "agent", data: { label: "Personal Shopper", agentId: "A5", input: [{ field: "compliance_data", mapping: "agent1.output.compliance" }] } },
      { id: "agent3", type: "agent", data: { label: "Exam Pro", agentId: "A6", input: [{ field: "violation_check", mapping: "agent2.output.violations" }] } },
      { id: "condition1", type: "condition", data: { label: "Violations Found", condition: ">", left: "agent3.output.count", right: 0 } },
      { id: "action1", type: "action", data: { label: "Flag Issue", action: "flag_compliance_issue", input: [{ field: "violation_data", mapping: "agent3.output" }] } },
      { id: "action2", type: "action", data: { label: "Notify Compliance", action: "notify_compliance", input: [{ field: "status", value: "Compliance check completed" }] } },
    ],
    edges: [
      { id: "edge1", source: "trigger1", target: "agent1" },
      { id: "edge2", source: "agent1", target: "agent2" },
      { id: "edge3", source: "agent2", target: "agent3" },
      { id: "edge4", source: "agent3", target: "condition1" },
      { id: "edge5", source: "condition1", target: "action1", style: { stroke: "red" } },
      { id: "edge6", source: "condition1", target: "action2", style: { stroke: "green" } },
    ],
  },
  {
    name: "Inventory Optimizer",
    description: "Optimize inventory levels with demand forecasting",
    category: "Inventory",
    industry: "manufacturing",
    requiredAgents: ["A2", "A3", "A7"],
    nodes: [
      { id: "trigger1", type: "trigger", data: { label: "Inventory Update", trigger: "stock_updated" } },
      { id: "agent1", type: "agent", data: { label: "Business Pro", agentId: "A2", input: [{ field: "stock_data", mapping: "trigger1.output" }] } },
      { id: "agent2", type: "agent", data: { label: "Content Pro", agentId: "A3", input: [{ field: "forecast_data", mapping: "agent1.output.forecast" }] } },
      { id: "agent3", type: "agent", data: { label: "Finance Pro", agentId: "A7", input: [{ field: "optimization_suggestion", mapping: "agent2.output.suggestion" }] } },
      { id: "action1", type: "action", data: { label: "Update Levels", action: "update_inventory", input: [{ field: "optimized_levels", mapping: "agent3.output.recommendation" }] } },
      { id: "notification1", type: "notification", data: { label: "Alert", action: "send_alert", input: [{ field: "optimization_result", mapping: "agent3.output.result" }] } },
    ],
    edges: [
      { id: "edge1", source: "trigger1", target: "agent1" },
      { id: "edge2", source: "agent1", target: "agent2" },
      { id: "edge3", source: "agent2", target: "agent3" },
      { id: "edge4", source: "agent3", target: "action1" },
      { id: "edge5", source: "action1", target: "notification1" },
    ],
  },
];