import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const createReceipt = mutation({
  args: {
    userId: v.id("users"),
    transactionId: v.string(),
    amount: v.number(),
    service: v.string(),
    agent: v.string(),
    customerName: v.string(),
    customerEmail: v.string(),
    status: v.string(),
  },
  returns: v.object({ receiptId: v.string(), receiptNumber: v.string() }),
  handler: async (ctx, args) => {
    const receiptNumber = `DKV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    
    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: "Payment Receipt",
      message: `Receipt ${receiptNumber} for ₦${args.amount.toLocaleString()} - ${args.service}`,
      type: "receipt",
      read: false,
      createdAt: Date.now(),
    });

    return {
      receiptId: receiptNumber,
      receiptNumber,
    };
  },
});

export const getReceipt = query({
  args: { receiptId: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    return {
      company: "Dutchkem Ventures Prosuite NG+",
      address: "26, Opeki Road, Ipaja, Ayobo, Lagos State, Nigeria",
      tel: "(+234)-911-339-3525",
      email: "contact@dutchkem.com",
      rc: "9489855",
      tin: "2512403526652",
      receiptId: args.receiptId,
      generatedAt: new Date().toISOString(),
      footer: "Stop Struggling. Start Winning.",
      supportEmail: "support@dutchkem.com",
    };
  }
});

export const generateReceipt = query({
  args: { amount: v.number(), plan: v.string(), name: v.string(), date: v.number() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    return {
      company: "Dutchkem Ventures Prosuite NG+",
      address: "26, Opeki Road, Ipaja, Ayobo, Lagos State, Nigeria",
      tel: "(+234)-911-339-3525",
      email: "contact@dutchkem.com",
      rc: "9489855",
      tin: "2512403526652",
      billTo: args.name,
      amount: args.amount,
      plan: args.plan,
      date: new Date(args.date).toLocaleDateString(),
      receiptId: `DKV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      footer: "Stop Struggling. Start Winning.",
      supportEmail: "support@dutchkem.com"
    };
  }
});
