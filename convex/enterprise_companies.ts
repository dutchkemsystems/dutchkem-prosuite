import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tryGetAdminSession } from "./auth_helpers";

/** 20 company type definitions (S1-S5 small, M1-M5 enterprise, H1-H10 hyper-scale) */
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
  { id: "H1", name: "Global Banking & Finance", size: "hyper-scale" as const, employees: "500,000+", price: 49999, subdomain: "globalbanking", agents: 25, description: "50+ Countries · Fraud, KYC, Risk, Compliance, Trading", icon: "🏦", countries: "50+", features: ["Fraud Detection", "KYC Automation", "Risk Management", "Compliance Monitoring", "Trading Algorithms"] },
  { id: "H2", name: "International Manufacturing", size: "hyper-scale" as const, employees: "1,000,000+", price: 59999, subdomain: "globalmanufacturing", agents: 30, description: "40+ Countries · Supply Chain, Predictive Maintenance, Quality", icon: "🏭", countries: "40+", features: ["Supply Chain Optimization", "Predictive Maintenance", "Quality Control", "Inventory Management"] },
  { id: "H3", name: "Worldwide E-commerce", size: "hyper-scale" as const, employees: "800,000+", price: 69999, subdomain: "globalecommerce", agents: 35, description: "60+ Countries · Personalization, Fraud, Logistics, Customer AI", icon: "🛒", countries: "60+", features: ["Personalization Engine", "Fraud Detection", "Logistics Optimization", "Customer Service AI"] },
  { id: "H4", name: "Global Healthcare Network", size: "hyper-scale" as const, employees: "600,000+", price: 79999, subdomain: "globalhealthcare", agents: 28, description: "30+ Countries · Patient Records, Telemedicine, Insurance, HIPAA", icon: "🏥", countries: "30+", features: ["Patient Records", "Telemedicine", "Insurance Processing", "Compliance (HIPAA)"] },
  { id: "H5", name: "Multi-National Telecom", size: "hyper-scale" as const, employees: "700,000+", price: 89999, subdomain: "globaltelecom", agents: 32, description: "45+ Countries · Network, Churn Prediction, Billing, Infrastructure", icon: "📡", countries: "45+", features: ["Network Optimization", "Customer Churn Prediction", "Billing Automation", "Infrastructure Monitoring"] },
  { id: "H6", name: "Global Logistics & Shipping", size: "hyper-scale" as const, employees: "500,000+", price: 99999, subdomain: "globallogistics", agents: 40, description: "80+ Countries · Route, Fleet, Warehouse, Real-time Tracking", icon: "🚚", countries: "80+", features: ["Route Optimization", "Fleet Management", "Warehouse Automation", "Real-time Tracking"] },
  { id: "H7", name: "International Energy Corp", size: "hyper-scale" as const, employees: "400,000+", price: 119999, subdomain: "globalenergy", agents: 38, description: "35+ Countries · Grid, Predictive Analytics, Safety, Compliance", icon: "⚡", countries: "35+", features: ["Grid Management", "Predictive Analytics", "Safety Monitoring", "Compliance Reporting"] },
  { id: "H8", name: "Worldwide Retail Chain", size: "hyper-scale" as const, employees: "900,000+", price: 129999, subdomain: "globalretail", agents: 45, description: "55+ Countries · Inventory, Price Optimization, Customer Insights", icon: "🛍️", countries: "55+", features: ["Inventory Optimization", "Price Optimization", "Customer Insights", "Store Operations"] },
  { id: "H9", name: "Global Tech Conglomerate", size: "hyper-scale" as const, employees: "1,500,000+", price: 149999, subdomain: "globaltech", agents: 50, description: "70+ Countries · DevOps, Security, Collaboration, Product Dev", icon: "🖥️", countries: "70+", features: ["DevOps Automation", "Security Monitoring", "Employee Collaboration", "Product Development"] },
  { id: "H10", name: "Mega Government Agency", size: "hyper-scale" as const, employees: "2,000,000+", price: 199999, subdomain: "government", agents: 60, description: "100+ Countries · Citizen Services, Documents, Compliance, Analytics", icon: "🏛️", countries: "100+", features: ["Citizen Services", "Document Processing", "Compliance Enforcement", "Data Analytics"] },
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
