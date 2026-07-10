import { v } from "convex/values";
import { action, query, internalQuery } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// REPORTING & ANALYTICS
// Sales, customers, orders, revenue, growth — all in one module
// ═══════════════════════════════════════════════════════════════════

// ─── SALES REPORT ───

export const getSalesReport = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const start = args.startDate || Date.now() - 30 * 86400000;
    const end = args.endDate || Date.now();

    const orders = await ctx.db.query("orders").take(500);
    const filtered = orders.filter((o: any) => o.createdAt >= start && o.createdAt <= end);

    const totalRevenue = filtered.reduce((s: number, o: any) => s + (o.total || 0), 0);
    const totalOrders = filtered.length;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const paidOrders = filtered.filter((o: any) => o.paymentStatus === "paid");
    const unpaidOrders = filtered.filter((o: any) => o.paymentStatus === "unpaid");

    // Daily revenue
    const dailyRevenue: Record<string, { revenue: number; orders: number }> = {};
    filtered.forEach((o: any) => {
      const day = new Date(o.createdAt).toISOString().split("T")[0];
      if (!dailyRevenue[day]) dailyRevenue[day] = { revenue: 0, orders: 0 };
      dailyRevenue[day].revenue += o.total || 0;
      dailyRevenue[day].orders++;
    });

    // Revenue by status
    const revenueByStatus: Record<string, number> = {};
    filtered.forEach((o: any) => {
      revenueByStatus[o.status] = (revenueByStatus[o.status] || 0) + (o.total || 0);
    });

    // Top items
    const itemCounts: Record<string, { count: number; revenue: number }> = {};
    filtered.forEach((o: any) => {
      (o.items || []).forEach((i: any) => {
        if (!itemCounts[i.name]) itemCounts[i.name] = { count: 0, revenue: 0 };
        itemCounts[i.name].count += i.quantity;
        itemCounts[i.name].revenue += i.quantity * i.unitPrice;
      });
    });
    const topItems = Object.entries(itemCounts)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([name, data]) => ({ name, ...data }));

    return {
      period: { start: new Date(start).toISOString(), end: new Date(end).toISOString() },
      totalRevenue,
      totalOrders,
      averageOrderValue,
      paidCount: paidOrders.length,
      unpaidCount: unpaidOrders.length,
      paidRevenue: paidOrders.reduce((s: number, o: any) => s + (o.total || 0), 0),
      unpaidRevenue: unpaidOrders.reduce((s: number, o: any) => s + (o.total || 0), 0),
      dailyRevenue,
      revenueByStatus,
      topItems,
    };
  },
});

// ─── CUSTOMER REPORT ───

export const getCustomerReport = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const customers = await ctx.db.query("customers").take(500);
    const total = customers.length;

    const totalSpent = customers.reduce((s: number, c: any) => s + (c.totalSpent || 0), 0);
    const totalOrders = customers.reduce((s: number, c: any) => s + (c.totalOrders || 0), 0);
    const totalLoyaltyPoints = customers.reduce((s: number, c: any) => s + (c.loyaltyPoints || 0), 0);

    // Customer tiers by spending
    const tiers = {
      vip: customers.filter((c: any) => (c.totalSpent || 0) >= 500000),
      premium: customers.filter((c: any) => (c.totalSpent || 0) >= 100000 && (c.totalSpent || 0) < 500000),
      regular: customers.filter((c: any) => (c.totalSpent || 0) >= 10000 && (c.totalSpent || 0) < 100000),
      new: customers.filter((c: any) => (c.totalSpent || 0) < 10000),
    };

    // Tag distribution
    const tagCounts: Record<string, number> = {};
    customers.forEach((c: any) => {
      (c.tags || []).forEach((t: string) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    });

    // Acquisition source
    const sourceCounts: Record<string, number> = {};
    customers.forEach((c: any) => {
      const src = c.source || "unknown";
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });

    // Customers acquired per month
    const monthlyAcquisition: Record<string, number> = {};
    customers.forEach((c: any) => {
      const month = new Date(c.createdAt).toISOString().substring(0, 7);
      monthlyAcquisition[month] = (monthlyAcquisition[month] || 0) + 1;
    });

    // Top customers
    const topCustomers = [...customers]
      .sort((a: any, b: any) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 20)
      .map((c: any) => ({
        name: c.name,
        email: c.email,
        totalSpent: c.totalSpent,
        totalOrders: c.totalOrders,
        loyaltyPoints: c.loyaltyPoints,
        tags: c.tags,
      }));

    return {
      total,
      totalSpent,
      totalOrders,
      totalLoyaltyPoints,
      averageSpentPerCustomer: total > 0 ? Math.round(totalSpent / total) : 0,
      averageOrdersPerCustomer: total > 0 ? (totalOrders / total).toFixed(1) : 0,
      tiers: {
        vip: { count: tiers.vip.length, totalSpent: tiers.vip.reduce((s: number, c: any) => s + (c.totalSpent || 0), 0) },
        premium: { count: tiers.premium.length, totalSpent: tiers.premium.reduce((s: number, c: any) => s + (c.totalSpent || 0), 0) },
        regular: { count: tiers.regular.length, totalSpent: tiers.regular.reduce((s: number, c: any) => s + (c.totalSpent || 0), 0) },
        newCustomers: { count: tiers.new.length },
      },
      tagDistribution: tagCounts,
      sourceDistribution: sourceCounts,
      monthlyAcquisition,
      topCustomers,
    };
  },
});

// ─── INVENTORY REPORT ───

export const getInventoryReport = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const products = await ctx.db.query("products").take(500);
    const totalProducts = products.length;
    const publishedProducts = products.filter((p: any) => p.isPublished !== false);
    const totalStock = products.reduce((s: number, p: any) => s + (p.stock || 0), 0);
    const lowStock = products.filter((p: any) => (p.stock || 0) < 10 && (p.stock || 0) > 0);
    const outOfStock = products.filter((p: any) => (p.stock || 0) === 0);

    // Revenue by category
    const categoryRevenue: Record<string, { products: number; totalSales: number }> = {};
    products.forEach((p: any) => {
      const cat = p.category || "uncategorized";
      if (!categoryRevenue[cat]) categoryRevenue[cat] = { products: 0, totalSales: 0 };
      categoryRevenue[cat].products++;
      categoryRevenue[cat].totalSales += (p.salesCount || 0);
    });

    // Top selling products
    const topSelling = [...products]
      .sort((a: any, b: any) => (b.salesCount || 0) - (a.salesCount || 0))
      .slice(0, 10)
      .map((p: any) => ({
        name: p.name,
        price: p.price,
        salesCount: p.salesCount || 0,
        stock: p.stock,
        category: p.category,
      }));

    return {
      totalProducts,
      publishedProducts: publishedProducts.length,
      totalStock,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      lowStockProducts: lowStock.map((p: any) => ({ name: p.name, stock: p.stock })),
      outOfStockProducts: outOfStock.map((p: any) => ({ name: p.name })),
      categoryRevenue,
      topSelling,
    };
  },
});

// ─── COMPREHENSIVE DASHBOARD ───

export const getDashboardSummary = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 86400000;
    const sevenDaysAgo = now - 7 * 86400000;

    // Orders
    const allOrders = await ctx.db.query("orders").take(500);
    const recent30d = allOrders.filter((o: any) => o.createdAt >= thirtyDaysAgo);
    const recent7d = allOrders.filter((o: any) => o.createdAt >= sevenDaysAgo);

    const totalRevenue30d = recent30d.reduce((s: number, o: any) => s + (o.total || 0), 0);
    const totalRevenue7d = recent7d.reduce((s: number, o: any) => s + (o.total || 0), 0);
    const totalRevenueAll = allOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);

    // Customers
    const allCustomers = await ctx.db.query("customers").take(500);
    const newCustomers30d = allCustomers.filter((c: any) => c.createdAt >= thirtyDaysAgo);
    const newCustomers7d = allCustomers.filter((c: any) => c.createdAt >= sevenDaysAgo);

    // Products
    const allProducts = await ctx.db.query("products").take(500);
    const lowStock = allProducts.filter((p: any) => (p.stock || 0) < 10 && (p.stock || 0) > 0);

    // Pending items
    const pendingOrders = allOrders.filter((o: any) => o.status === "pending");
    const unpaidOrders = allOrders.filter((o: any) => o.paymentStatus === "unpaid");

    // Growth metrics (compare last 7 days vs previous 7 days)
    const fourteenDaysAgo = now - 14 * 86400000;
    const prev7d = allOrders.filter((o: any) => o.createdAt >= fourteenDaysAgo && o.createdAt < sevenDaysAgo);
    const prev7dRevenue = prev7d.reduce((s: number, o: any) => s + (o.total || 0), 0);
    const revenueGrowth = prev7dRevenue > 0 ? ((totalRevenue7d - prev7dRevenue) / prev7dRevenue * 100).toFixed(1) : "0";

    return {
      revenue: {
        last7Days: totalRevenue7d,
        last30Days: totalRevenue30d,
        allTime: totalRevenueAll,
        growthPercent: revenueGrowth,
      },
      orders: {
        total: allOrders.length,
        last7Days: recent7d.length,
        last30Days: recent30d.length,
        pending: pendingOrders.length,
        unpaid: unpaidOrders.length,
      },
      customers: {
        total: allCustomers.length,
        newLast7Days: newCustomers7d.length,
        newLast30Days: newCustomers30d.length,
      },
      products: {
        total: allProducts.length,
        lowStock: lowStock.length,
        lowStockItems: lowStock.map((p: any) => ({ name: p.name, stock: p.stock })),
      },
      alerts: [
        ...(pendingOrders.length > 0 ? [`${pendingOrders.length} pending orders need attention`] : []),
        ...(unpaidOrders.length > 0 ? [`${unpaidOrders.length} unpaid orders (NGN ${unpaidOrders.reduce((s: number, o: any) => s + (o.total || 0), 0).toLocaleString()})`] : []),
        ...(lowStock.length > 0 ? [`${lowStock.length} products low on stock`] : []),
      ],
    };
  },
});

// ─── EXPORT REPORT AS HTML ───

export const exportSalesReport = action({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const report = await ctx.runQuery("reporting:getSalesReport", {
      startDate: args.startDate,
      endDate: args.endDate,
    });

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Sales Report</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;padding:40px;color:#333}
  .report{max-width:800px;margin:0 auto}.hdr{text-align:center;margin-bottom:30px;border-bottom:3px solid #FF6B35;padding-bottom:20px}
  .hdr h1{color:#FF6B35;font-size:26px}.hdr p{color:#666;font-size:13px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:30px}
  .card{background:#f8f9fa;border-radius:10px;padding:20px;text-align:center}
  .card .value{font-size:28px;font-weight:700;color:#FF6B35}.card .label{font-size:11px;color:#999;text-transform:uppercase;margin-top:5px}
  table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:10px 15px;text-align:left;border-bottom:1px solid #eee;font-size:13px}
  th{background:#FF6B35;color:#fff;font-size:11px;text-transform:uppercase}th:last-child,td:last-child{text-align:right}
  .footer{text-align:center;margin-top:30px;font-size:11px;color:#999}
</style></head><body><div class="report">
  <div class="hdr"><h1>Sales Report</h1><p>${new Date(report.period.start).toLocaleDateString("en-NG")} — ${new Date(report.period.end).toLocaleDateString("en-NG")}</p></div>
  <div class="grid">
    <div class="card"><div class="value">NGN ${report.totalRevenue.toLocaleString()}</div><div class="label">Total Revenue</div></div>
    <div class="card"><div class="value">${report.totalOrders}</div><div class="label">Total Orders</div></div>
    <div class="card"><div class="value">NGN ${report.averageOrderValue.toLocaleString()}</div><div class="label">Avg Order Value</div></div>
    <div class="card"><div class="value">${report.paidCount}</div><div class="label">Paid Orders</div></div>
  </div>
  <h2 style="font-size:16px;margin-bottom:10px">Top Items</h2>
  <table><thead><tr><th>Item</th><th>Qty Sold</th><th>Revenue</th></tr></thead><tbody>
  ${report.topItems.map((i: any) => `<tr><td>${i.name}</td><td>${i.count}</td><td>NGN ${i.revenue.toLocaleString()}</td></tr>`).join("")}
  </tbody></table>
  <div class="footer">Generated by DutchKem Prosuite · ${new Date().toISOString()}</div>
</div></body></html>`;

    return { success: true, html, report };
  },
});

export const getSalesReportInternal = internalQuery({
  args: { startDate: v.optional(v.number()), endDate: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const start = args.startDate || Date.now() - 30 * 86400000;
    const end = args.endDate || Date.now();
    const orders = await ctx.db.query("orders").take(500);
    const filtered = orders.filter((o: any) => o.createdAt >= start && o.createdAt <= end);
    return {
      totalRevenue: filtered.reduce((s: number, o: any) => s + (o.total || 0), 0),
      totalOrders: filtered.length,
    };
  },
});
