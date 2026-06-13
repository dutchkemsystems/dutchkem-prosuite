import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

const SLA_TIERS = {
  standard: { uptime: 99.9, credit: 10, price: 0, responseTime: 60, resolutionTime: 24 },
  premium: { uptime: 99.99, credit: 25, price: 999, responseTime: 30, resolutionTime: 8 },
  enterprise: { uptime: 99.999, credit: 50, price: 4999, responseTime: 15, resolutionTime: 4 },
  global: { uptime: 99.9999, credit: 100, price: 9999, responseTime: 5, resolutionTime: 1 },
};

const COMPLIANCE_STANDARDS = [
  { standard: "GDPR", description: "EU General Data Protection Regulation", controls: ["data_processing", "data_subject_rights", "consent_management", "data_breach_notification", "data_protection_impact"] },
  { standard: "SOC2", description: "SOC 2 Type II Security Compliance", controls: ["security", "availability", "processing_integrity", "confidentiality", "privacy"] },
  { standard: "ISO27001", description: "ISO/IEC 27001 Information Security", controls: ["risk_management", "access_control", "cryptography", "physical_security", "operations_security"] },
  { standard: "HIPAA", description: "Health Insurance Portability and Accountability", controls: ["privacy_rule", "security_rule", "breach_notification", "business_associate", "minimum_necessary"] },
  { standard: "PCI_DSS", description: "Payment Card Industry Data Security Standard", controls: ["network_security", "data_protection", "vulnerability_management", "access_control", "monitoring"] },
];

/** Create SLA agreement for a company */
export const createSLAAgreement = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    companyId: v.string(),
    tier: v.union(v.literal("standard"), v.literal("premium"), v.literal("enterprise"), v.literal("global")),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const tierConfig = SLA_TIERS[args.tier];
    const now = Date.now();

    const existing = await ctx.db.query("enterprise_sla_agreements")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    if (existing) return { error: "Active SLA already exists for this company" };

    const recordId = await ctx.db.insert("enterprise_sla_agreements", {
      orgId: args.orgId,
      companyId: args.companyId,
      tier: args.tier,
      uptimeGuarantee: tierConfig.uptime,
      creditPercentage: tierConfig.credit,
      monthlyPrice: tierConfig.price,
      responseTimeMinutes: tierConfig.responseTime,
      resolutionTimeHours: tierConfig.resolutionTime,
      effectiveDate: now,
      expiryDate: now + 365 * 24 * 60 * 60 * 1000,
      terms: [
        `Dutchkem Ventures guarantees ${tierConfig.uptime}% uptime for all core services`,
        `If uptime falls below guarantee, company receives ${tierConfig.credit}% service credit`,
        `Maximum credit per month: ${tierConfig.credit}% of monthly fee`,
        `Response time: Critical issues < ${tierConfig.responseTime} minutes`,
        `Resolution time: Critical issues < ${tierConfig.resolutionTime} hours`,
        `24/7/365 support included`,
      ],
      exclusions: [
        "Scheduled maintenance (notified 48 hours in advance)",
        "Third-party service outages",
        "Force majeure events",
        "Customer-initiated actions",
      ],
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "SLA_CREATED",
      actor: identity._id,
      action: "create_sla",
      target: args.companyId,
      details: { tier: args.tier, uptime: tierConfig.uptime },
      createdAt: now,
    });

    return { success: true, slaId: recordId, tier: tierConfig };
  },
});

/** List SLA agreements */
export const listSLAAgreements = query({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_sla_agreements")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

/** List all SLAs (admin view) */
export const listAllSLAs = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_sla_agreements").collect();
  },
});

/** Create SLA incident */
export const createIncident = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    companyId: v.string(),
    slaId: v.id("enterprise_sla_agreements"),
    title: v.string(),
    description: v.string(),
    severity: v.union(v.literal("minor"), v.literal("major"), v.literal("critical")),
    affectedServices: v.array(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const recordId = await ctx.db.insert("enterprise_sla_incidents", {
      ...args,
      startTime: now,
      durationMinutes: 0,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, incidentId: recordId };
  },
});

/** List incidents */
export const listIncidents = query({
  args: { companyId: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_sla_incidents")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(50);
  },
});

/** Resolve an incident */
export const resolveIncident = mutation({
  args: {
    incidentId: v.id("enterprise_sla_incidents"),
    rootCause: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const incident = await ctx.db.get("enterprise_sla_incidents", args.incidentId);
    if (!incident) return { error: "Incident not found" };

    const now = Date.now();
    const durationMinutes = Math.round((now - incident.startTime) / 60000);

    await ctx.db.patch(args.incidentId, {
      status: "resolved",
      endTime: now,
      durationMinutes,
      rootCause: args.rootCause,
      updatedAt: now,
    });

    return { success: true, durationMinutes };
  },
});

/** Create compliance document */
export const createComplianceDoc = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    companyId: v.string(),
    standard: v.union(v.literal("GDPR"), v.literal("SOC2"), v.literal("ISO27001"), v.literal("HIPAA"), v.literal("PCI_DSS")),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const now = Date.now();
    const standardDef = COMPLIANCE_STANDARDS.find((s) => s.standard === args.standard);
    if (!standardDef) return { error: "Unknown standard" };

    const controls: Record<string, boolean> = {};
    for (const ctrl of standardDef.controls) {
      controls[ctrl] = true;
    }

    const recordId = await ctx.db.insert("enterprise_compliance_docs", {
      orgId: args.orgId,
      companyId: args.companyId,
      standard: args.standard,
      status: "compliant",
      lastAuditDate: now,
      nextAuditDate: now + 365 * 24 * 60 * 60 * 1000,
      controls,
      certifications: [`${standardDef.description} Certified`],
      documents: [],
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, docId: recordId };
  },
});

/** List compliance docs */
export const listComplianceDocs = query({
  args: { companyId: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_compliance_docs")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

/** List all compliance docs (admin view) */
export const listAllComplianceDocs = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_compliance_docs").collect();
  },
});

/** Get SLA dashboard stats */
export const getSLADashboard = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const slas = await ctx.db.query("enterprise_sla_agreements").collect();
    const incidents = await ctx.db.query("enterprise_sla_incidents").collect();
    const compliance = await ctx.db.query("enterprise_compliance_docs").collect();

    const activeSLAs = slas.filter((s: any) => s.status === "active");
    const openIncidents = incidents.filter((i: any) => i.status === "open" || i.status === "investigating");
    const compliantDocs = compliance.filter((c: any) => c.status === "compliant");

    const tierBreakdown = {
      standard: activeSLAs.filter((s: any) => s.tier === "standard").length,
      premium: activeSLAs.filter((s: any) => s.tier === "premium").length,
      enterprise: activeSLAs.filter((s: any) => s.tier === "enterprise").length,
      global: activeSLAs.filter((s: any) => s.tier === "global").length,
    };

    const complianceBreakdown: Record<string, number> = {};
    for (const doc of compliance) {
      complianceBreakdown[doc.standard] = (complianceBreakdown[doc.standard] || 0) + 1;
    }

    return {
      totalSLAs: slas.length,
      activeSLAs: activeSLAs.length,
      totalIncidents: incidents.length,
      openIncidents: openIncidents.length,
      totalCompliance: compliance.length,
      compliantDocs: compliantDocs.length,
      tierBreakdown,
      complianceBreakdown,
      slaTiers: SLA_TIERS,
      complianceStandards: COMPLIANCE_STANDARDS,
    };
  },
});
