import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════
// CUSTOMER DATABASE (CRM)
// Full customer profiles, tags, loyalty, communication history
// ═══════════════════════════════════════════════════════════════════

export const addCustomer = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    shippingAddress: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    source: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Check for duplicate
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) return { success: false, error: "Customer already exists", customerId: existing._id };

    const customerId = await ctx.db.insert("customers", {
      name: args.name,
      email: args.email,
      phone: args.phone || "",
      shippingAddress: args.shippingAddress || "",
      totalOrders: 0,
      totalSpent: 0,
      lastOrderAt: 0,
      loyaltyPoints: 0,
      tags: args.tags || [],
      notes: args.notes || "",
      source: args.source || "manual",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, customerId };
  },
});

export const updateCustomer = mutation({
  args: {
    customerId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    shippingAddress: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId as Id<"customers">);
    if (!customer) return { success: false, error: "Customer not found" };

    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.email !== undefined) updates.email = args.email;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.shippingAddress !== undefined) updates.shippingAddress = args.shippingAddress;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.customerId as Id<"customers">, updates);
    return { success: true, customerId: args.customerId };
  },
});

export const deleteCustomer = mutation({
  args: { customerId: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId as Id<"customers">);
    if (!customer) return { success: false, error: "Customer not found" };
    await ctx.db.delete(args.customerId as Id<"customers">);
    return { success: true, message: "Customer deleted" };
  },
});

export const getCustomer = query({
  args: { customerId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId as Id<"customers">);
    if (!customer) return null;

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .order("desc")
      .take(20);

    return { ...customer, recentOrders: orders };
  },
});

export const getCustomers = query({
  args: {
    search: v.optional(v.string()),
    tag: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const all = await ctx.db.query("customers").order("desc").take(args.limit || 100);

    let filtered = all;
    if (args.search) {
      const s = args.search.toLowerCase();
      filtered = all.filter((c: any) =>
        c.name.toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s) ||
        (c.phone && c.phone.includes(s))
      );
    }
    if (args.tag) {
      filtered = filtered.filter((c: any) => c.tags && c.tags.includes(args.tag!));
    }

    return filtered;
  },
});

export const addCustomerTag = mutation({
  args: { customerId: v.string(), tag: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId as Id<"customers">);
    if (!customer) return { success: false, error: "Customer not found" };

    const tags = [...new Set([...(customer.tags || []), args.tag])];
    await ctx.db.patch(args.customerId as Id<"customers">, { tags, updatedAt: Date.now() });
    return { success: true, tags };
  },
});

export const removeCustomerTag = mutation({
  args: { customerId: v.string(), tag: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId as Id<"customers">);
    if (!customer) return { success: false, error: "Customer not found" };

    const tags = (customer.tags || []).filter((t: string) => t !== args.tag);
    await ctx.db.patch(args.customerId as Id<"customers">, { tags, updatedAt: Date.now() });
    return { success: true, tags };
  },
});

export const addLoyaltyPoints = mutation({
  args: { customerId: v.string(), points: v.number(), reason: v.optional(v.string()), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId as Id<"customers">);
    if (!customer) return { success: false, error: "Customer not found" };

    const newPoints = (customer.loyaltyPoints || 0) + args.points;
    await ctx.db.patch(args.customerId as Id<"customers">, { loyaltyPoints: newPoints, updatedAt: Date.now() });

    return { success: true, points: newPoints, added: args.points, reason: args.reason || "manual" };
  },
});

export const importCustomers = mutation({
  args: {
    customers: v.array(v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
    })),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let imported = 0;
    let skipped = 0;

    for (const c of args.customers) {
      const existing = await ctx.db
        .query("customers")
        .withIndex("by_email", (q) => q.eq("email", c.email))
        .first();

      if (existing) { skipped++; continue; }

      await ctx.db.insert("customers", {
        name: c.name,
        email: c.email,
        phone: c.phone || "",
        shippingAddress: "",
        totalOrders: 0,
        totalSpent: 0,
        lastOrderAt: 0,
        loyaltyPoints: 0,
        tags: c.tags || [],
        notes: "",
        source: "import",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      imported++;
    }

    return { success: true, imported, skipped, total: args.customers.length };
  },
});

export const getCustomerStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const customers = await ctx.db.query("customers").take(1000);
    const total = customers.length;
    const totalSpent = customers.reduce((s: number, c: any) => s + (c.totalSpent || 0), 0);
    const totalOrders = customers.reduce((s: number, c: any) => s + (c.totalOrders || 0), 0);
    const totalLoyaltyPoints = customers.reduce((s: number, c: any) => s + (c.loyaltyPoints || 0), 0);

    // Tag distribution
    const tagCounts: Record<string, number> = {};
    customers.forEach((c: any) => {
      (c.tags || []).forEach((t: string) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    });

    // Top customers
    const topCustomers = [...customers]
      .sort((a: any, b: any) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 10)
      .map((c: any) => ({ name: c.name, email: c.email, totalSpent: c.totalSpent, totalOrders: c.totalOrders }));

    return {
      total,
      totalSpent,
      totalOrders,
      totalLoyaltyPoints,
      averageSpentPerCustomer: total > 0 ? Math.round(totalSpent / total) : 0,
      tagDistribution: tagCounts,
      topCustomers,
    };
  },
});
