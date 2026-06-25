import { v } from "convex/values";
import { action, query, mutation } from "./_generated/server";
import { api } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════
// ORDER MANAGEMENT
// Full order lifecycle: create → confirm → fulfill → complete
// ═══════════════════════════════════════════════════════════════════

export const createOrder = mutation({
  args: {
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.optional(v.string()),
    items: v.array(v.object({
      productId: v.optional(v.string()),
      name: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
    })),
    shippingAddress: v.optional(v.string()),
    notes: v.optional(v.string()),
    currency: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orderNumber = `ORD-${Date.now()}`;
    const subtotal = args.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    // Find or create customer
    let customerId: any = null;
    const existingCustomer = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", args.customerEmail))
      .first();

    if (existingCustomer) {
      customerId = existingCustomer._id;
      await ctx.db.patch(customerId, {
        totalOrders: (existingCustomer.totalOrders || 0) + 1,
        totalSpent: (existingCustomer.totalSpent || 0) + subtotal,
        lastOrderAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      customerId = await ctx.db.insert("customers", {
        name: args.customerName,
        email: args.customerEmail,
        phone: args.customerPhone || "",
        shippingAddress: args.shippingAddress || "",
        totalOrders: 1,
        totalSpent: subtotal,
        lastOrderAt: Date.now(),
        loyaltyPoints: Math.floor(subtotal / 100),
        tags: [],
        notes: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      customerId,
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      customerPhone: args.customerPhone || "",
      items: args.items,
      itemCount: args.items.length,
      subtotal,
      tax: 0,
      discount: 0,
      total: subtotal,
      currency: args.currency || "NGN",
      shippingAddress: args.shippingAddress || "",
      status: "pending",
      paymentStatus: "unpaid",
      fulfillmentStatus: "unfulfilled",
      notes: args.notes || "",
      timeline: [{
        status: "pending",
        note: "Order created",
        timestamp: Date.now(),
      }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      success: true,
      orderId,
      orderNumber,
      customerId,
      subtotal,
      total: subtotal,
      currency: args.currency || "NGN",
      paymentUrl: `https://dutchkem-prosuite-app.vercel.app/pay?ref=${orderNumber}`,
    };
  },
});

export const updateOrderStatus = mutation({
  args: {
    orderId: v.string(),
    status: v.string(),
    note: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId as any);
    if (!order) return { success: false, error: "Order not found" };

    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "completed", "cancelled", "refunded"];
    if (!validStatuses.includes(args.status)) {
      return { success: false, error: `Invalid status. Valid: ${validStatuses.join(", ")}` };
    }

    const timeline = [...((order as any).timeline || [])];
    timeline.push({
      status: args.status,
      note: args.note || `Status updated to ${args.status}`,
      timestamp: Date.now(),
    });

    const updates: any = {
      status: args.status,
      timeline,
      updatedAt: Date.now(),
    };

    if (args.status === "confirmed") updates.paymentStatus = "paid";
    if (args.status === "shipped") updates.fulfillmentStatus = "shipped";
    if (args.status === "delivered") updates.fulfillmentStatus = "delivered";
    if (args.status === "completed") updates.fulfillmentStatus = "completed";
    if (args.status === "cancelled") {
      updates.cancelledAt = Date.now();
      updates.fulfillmentStatus = "cancelled";
    }

    await ctx.db.patch(args.orderId as any, updates);

    return {
      success: true,
      orderId: args.orderId,
      status: args.status,
      message: `Order updated to ${args.status}`,
    };
  },
});

export const getOrder = query({
  args: { orderId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orderId as any);
  },
});

export const getOrders = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(args.limit || 50);
    }
    return await ctx.db.query("orders").order("desc").take(args.limit || 50);
  },
});

export const getOrdersByCustomer = query({
  args: { customerId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId as any))
      .order("desc")
      .take(50);
  },
});

export const getOrderStats = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const all = await ctx.db.query("orders").take(1000);
    const totalOrders = all.length;
    const totalRevenue = all.reduce((s: number, o: any) => s + (o.total || 0), 0);
    const pending = all.filter((o: any) => o.status === "pending").length;
    const confirmed = all.filter((o: any) => o.status === "confirmed").length;
    const shipped = all.filter((o: any) => o.status === "shipped").length;
    const delivered = all.filter((o: any) => o.status === "delivered").length;
    const completed = all.filter((o: any) => o.status === "completed").length;
    const cancelled = all.filter((o: any) => o.status === "cancelled").length;

    return {
      totalOrders,
      totalRevenue,
      pending,
      confirmed,
      shipped,
      delivered,
      completed,
      cancelled,
      averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════
// ORDER INVOICE
// ═══════════════════════════════════════════════════════════════════

export const generateOrderInvoice = action({
  args: { orderId: v.string(), adminToken: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const order = await ctx.runQuery(api.order_management.getOrder, { orderId: args.orderId });
    if (!order) return { success: false, error: "Order not found" };

    const fmt = (n: number) => `${order.currency} ${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Invoice ${order.orderNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;padding:40px;color:#333}
  .inv{max-width:700px;margin:0 auto}.hdr{display:flex;justify-content:space-between;border-bottom:3px solid #FF6B35;padding-bottom:15px;margin-bottom:25px}
  .brand h1{color:#FF6B35;font-size:22px}.inv-info h2{font-size:20px;text-align:right}.inv-info p{font-size:12px;color:#666;text-align:right}
  .parties{display:flex;justify-content:space-between;margin-bottom:25px}.party{width:45%}.party h3{font-size:10px;text-transform:uppercase;color:#999;margin-bottom:5px}
  .party p{font-size:13px;line-height:1.6}table{width:100%;border-collapse:collapse;margin:15px 0}
  thead th{background:#FF6B35;color:#fff;padding:10px;font-size:11px;text-transform:uppercase;text-align:left}
  thead th:last-child{text-align:right}tbody td{padding:10px;border-bottom:1px solid #eee;font-size:13px}
  tbody td:last-child{text-align:right;font-weight:600}.totals{float:right;width:250px}
  .row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px}
  .row.total{border-top:2px solid #FF6B35;font-size:16px;font-weight:700;color:#FF6B35;padding-top:10px;margin-top:5px}
  .status{display:inline-block;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:700}
  .paid{background:#d4edda;color:#155724}.unpaid{background:#f8d7da;color:#721c24}
</style></head><body><div class="inv">
  <div class="hdr"><div class="brand"><h1>DutchKem Prosuite</h1><p>AI-Powered Business Automation</p></div>
  <div class="inv-info"><h2>INVOICE</h2><p><strong>#${order.orderNumber}</strong></p>
  <p>${new Date(order.createdAt).toLocaleDateString("en-NG")}</p>
  <p><span class="status ${order.paymentStatus === "paid" ? "paid" : "unpaid"}">${order.paymentStatus.toUpperCase()}</span></p></div></div>
  <div class="parties">
    <div class="party"><h3>Bill To</h3><p><strong>${order.customerName}</strong><br>${order.customerEmail}${order.customerPhone ? `<br>${order.customerPhone}` : ""}</p></div>
    <div class="party"><h3>Ship To</h3><p>${order.shippingAddress || "Same as billing"}</p></div>
  </div>
  <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>
  ${order.items.map((i: any) => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${fmt(i.unitPrice)}</td><td>${fmt(i.quantity * i.unitPrice)}</td></tr>`).join("")}
  </tbody></table>
  <div class="totals"><div class="row total"><span>Total</span><span>${fmt(order.total)}</span></div></div>
  <div style="clear:both"></div>
</div></body></html>`;

    return { success: true, html, orderNumber: order.orderNumber, total: order.total };
  },
});
