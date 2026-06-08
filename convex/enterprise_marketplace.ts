import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MARKETPLACE_AGENTS = [
  { id: "cs-bot", name: "Customer Support Bot", category: "Support", description: "24/7 automated customer support with ticket routing and response suggestions", installs: 2340, rating: 4.8, price: 0, icon: "🎧", color: "from-blue-500 to-cyan-500", features: ["Auto-ticket routing", "Response templates", "Sentiment analysis", "Escalation rules"] },
  { id: "sales-qualifier", name: "Sales Lead Qualifier", category: "Sales", description: "Automatically qualify and score incoming leads based on your criteria", installs: 1890, rating: 4.7, price: 5000, icon: "💼", color: "from-emerald-500 to-green-500", features: ["Lead scoring", "CRM integration", "Follow-up automation", "Pipeline reporting"] },
  { id: "content-writer", name: "Content Writer Pro", category: "Marketing", description: "Generate blog posts, social media content, and marketing copy", installs: 3120, rating: 4.9, price: 8000, icon: "✍️", color: "from-orange-500 to-amber-500", features: ["Blog generation", "Social media posts", "SEO optimization", "Brand voice matching"] },
  { id: "data-analyst", name: "Data Analyst Agent", category: "Analytics", description: "Analyze datasets, generate insights, and create visualizations", installs: 1560, rating: 4.6, price: 12000, icon: "📊", color: "from-violet-500 to-purple-500", features: ["Automated analysis", "Chart generation", "Anomaly detection", "Report scheduling"] },
  { id: "hr-onboard", name: "HR Onboarding Bot", category: "Human Resources", description: "Streamline new employee onboarding with automated task management", installs: 980, rating: 4.5, price: 0, icon: "🤝", color: "from-pink-500 to-rose-500", features: ["Task automation", "Document collection", "Training scheduling", "Welcome sequences"] },
  { id: "legal-review", name: "Legal Document Review", category: "Legal", description: "Review contracts and legal documents for compliance and risk", installs: 720, rating: 4.8, price: 15000, icon: "⚖️", color: "from-slate-500 to-gray-600", features: ["Clause analysis", "Risk scoring", "Compliance checks", "Version comparison"] },
  { id: "finance-assistant", name: "Finance Assistant", category: "Finance", description: "Automate expense tracking, invoicing, and financial reporting", installs: 1120, rating: 4.7, price: 10000, icon: "💰", color: "from-yellow-500 to-amber-600", features: ["Expense categorization", "Invoice generation", "Budget tracking", "Financial summaries"] },
  { id: "project-manager", name: "Project Manager Agent", category: "Operations", description: "Track project progress, assign tasks, and send deadline reminders", installs: 890, rating: 4.4, price: 7000, icon: "📋", color: "from-indigo-500 to-blue-600", features: ["Task tracking", "Deadline alerts", "Progress reports", "Resource allocation"] },
];

async function getOrgFromToken(ctx: any, token: string) {
  const session = await ctx.db.query("enterprise_sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
  if (!session || !session.isCurrent || session.expiresAt < Date.now()) return null;
  return session.orgId;
}

/** List all marketplace agents */
export const listAgents = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return MARKETPLACE_AGENTS;
  },
});

/** Get agents installed by an org */
export const getInstalledAgents = query({
  args: { token: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return [];

    const installs = await ctx.db.query("enterprise_marketplace_installs")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    return installs.filter((i: any) => i.status === "installed").map((i: any) => ({
      templateId: i.templateId,
      templateName: i.templateName,
      installedAt: i.installedAt,
    }));
  },
});

/** Install an agent */
export const installAgent = mutation({
  args: {
    token: v.string(),
    templateId: v.string(),
    templateName: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };

    const existing = await ctx.db.query("enterprise_marketplace_installs")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const alreadyInstalled = existing.find((i: any) => i.templateId === args.templateId && i.status === "installed");
    if (alreadyInstalled) return { error: "Already installed" };

    const now = Date.now();

    // Check if previously uninstalled and reinstall
    const prev = existing.find((i: any) => i.templateId === args.templateId && i.status === "uninstalled");
    if (prev) {
      await ctx.db.patch(prev._id, { status: "installed", installedAt: now });
    } else {
      await ctx.db.insert("enterprise_marketplace_installs", {
        orgId,
        templateId: args.templateId,
        templateName: args.templateName,
        status: "installed",
        installedAt: now,
      });
    }

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "AGENT_INSTALLED",
      actor: orgId,
      action: "install_agent",
      target: args.templateId,
      details: { name: args.templateName },
      createdAt: now,
    });

    return { success: true };
  },
});

/** Uninstall an agent */
export const uninstallAgent = mutation({
  args: { token: v.string(), templateId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orgId = await getOrgFromToken(ctx, args.token);
    if (!orgId) return { error: "Invalid session" };

    const installs = await ctx.db.query("enterprise_marketplace_installs")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();

    const installed = installs.find((i: any) => i.templateId === args.templateId && i.status === "installed");
    if (!installed) return { error: "Not installed" };

    await ctx.db.patch(installed._id, { status: "uninstalled" });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "AGENT_UNINSTALLED",
      actor: orgId,
      action: "uninstall_agent",
      target: args.templateId,
      details: { name: installed.templateName },
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
