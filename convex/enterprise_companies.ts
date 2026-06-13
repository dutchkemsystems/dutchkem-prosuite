import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

/** 10 company type definitions */
export const COMPANY_TYPES = [
  { id: "S1", name: "Local Service Business", size: "small" as const, employees: "5-20", price: 199, subdomain: "localservice", agents: 3, description: "Plumbing, Electrical, Cleaning", icon: "🔧" },
  { id: "S2", name: "E-commerce Store", size: "small" as const, employees: "5-30", price: 299, subdomain: "ecommercestore", agents: 5, description: "Online Retail / E-commerce", icon: "🛒" },
  { id: "S3", name: "Marketing Agency", size: "small" as const, employees: "5-40", price: 349, subdomain: "marketingagency", agents: 5, description: "Digital Marketing & Advertising", icon: "📣" },
  { id: "S4", name: "Real Estate Agency", size: "small" as const, employees: "5-35", price: 299, subdomain: "realestate", agents: 4, description: "Property Sales & Leasing", icon: "🏠" },
  { id: "S5", name: "SaaS Startup", size: "small" as const, employees: "5-50", price: 399, subdomain: "saasstartup", agents: 5, description: "Software as a Service", icon: "💻" },
  { id: "M1", name: "Manufacturing Corp", size: "enterprise" as const, employees: "500-5,000", price: 2999, subdomain: "manufacturing", agents: 10, description: "Industrial Manufacturing", icon: "🏭" },
  { id: "M2", name: "Healthcare Provider", size: "enterprise" as const, employees: "500-10,000", price: 4999, subdomain: "healthcare", agents: 10, description: "Hospitals & Clinics", icon: "🏥" },
  { id: "M3", name: "Financial Services", size: "enterprise" as const, employees: "500-10,000", price: 9999, subdomain: "financial", agents: 12, description: "Banking & Insurance", icon: "🏦" },
  { id: "M4", name: "Logistics & Supply Chain", size: "enterprise" as const, employees: "500-10,000", price: 7499, subdomain: "logistics", agents: 10, description: "Transport & Warehousing", icon: "🚚" },
  { id: "M5", name: "Enterprise Tech", size: "enterprise" as const, employees: "1,000-10,000", price: 14999, subdomain: "enterprisetech", agents: 15, description: "Enterprise Software & IT", icon: "🖥️" },
];

/** List all company types */
export const listCompanyTypes = query({
  args: {},
  returns: v.any(),
  handler: async () => COMPANY_TYPES,
});

/** Create a company under an organization */
export const createCompany = mutation({
  args: {
    orgId: v.id("enterprise_organizations"),
    companyType: v.string(),
    companyName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const companyType = COMPANY_TYPES.find((t) => t.id === args.companyType);
    if (!companyType) return { error: "Invalid company type" };

    const existing = await ctx.db.query("enterprise_companies")
      .withIndex("by_company_id", (q) => q.eq("companyId", companyType.id + "_" + args.orgId))
      .first();
    if (existing) return { error: "Company type already created for this organization" };

    const now = Date.now();
    const companyId = companyType.id + "_" + args.orgId;

    const recordId = await ctx.db.insert("enterprise_companies", {
      orgId: args.orgId,
      companyId,
      companyType: companyType.id,
      typeName: companyType.name,
      size: companyType.size,
      employeeRange: companyType.employees,
      monthlyPrice: companyType.price,
      subdomain: companyType.subdomain,
      agentsCount: companyType.agents,
      companyName: args.companyName,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      address: args.address,
      status: "active",
      syncStatus: "synced",
      loginUrl: `https://${companyType.subdomain}.enterprise.dutchkem.com/login`,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("enterprise_audit_logs", {
      eventType: "COMPANY_CREATED",
      actor: identity._id,
      action: "create_company",
      target: companyId,
      details: { companyName: args.companyName, companyType: companyType.id, typeName: companyType.name, price: companyType.price },
      createdAt: now,
    });

    return { success: true, companyId: recordId, loginUrl: `https://${companyType.subdomain}.enterprise.dutchkem.com/login` };
  },
});

/** List all companies for an org */
export const listCompanies = query({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_companies")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

/** List all companies across all orgs (admin view) */
export const listAllCompanies = query({
  args: { adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.query("enterprise_companies").collect();
  },
});

/** Get company stats */
export const getCompanyStats = query({
  args: { orgId: v.id("enterprise_organizations"), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const companies = await ctx.db.query("enterprise_companies")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    const subadmins = await ctx.db.query("enterprise_subadmins")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    const clients = await ctx.db.query("enterprise_clients")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    return {
      totalCompanies: companies.length,
      activeCompanies: companies.filter((c: any) => c.status === "active").length,
      totalSubAdmins: subadmins.length,
      activeSubAdmins: subadmins.filter((s: any) => s.status === "active").length,
      totalClients: clients.length,
      activeClients: clients.filter((c: any) => c.status === "active").length,
      monthlyRevenue: companies.reduce((sum: number, c: any) => sum + c.monthlyPrice, 0),
    };
  },
});

/** Update company status */
export const updateCompanyStatus = mutation({
  args: {
    companyId: v.string(),
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("pending")),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const company = await ctx.db.query("enterprise_companies")
      .withIndex("by_company_id", (q) => q.eq("companyId", args.companyId))
      .first();
    if (!company) return { error: "Company not found" };

    await ctx.db.patch(company._id, { status: args.status, updatedAt: Date.now() });
    return { success: true };
  },
});

/** Delete a company */
export const deleteCompany = mutation({
  args: { companyId: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await tryGetAdminSession(ctx, args.adminToken);
    if (!identity) throw new Error("Not authenticated");

    const company = await ctx.db.query("enterprise_companies")
      .withIndex("by_company_id", (q) => q.eq("companyId", args.companyId))
      .first();
    if (!company) return { error: "Company not found" };

    await ctx.db.delete(company._id);
    return { success: true };
  },
});
