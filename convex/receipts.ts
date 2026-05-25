import { query } from "./_generated/server";
import { v } from "convex/values";

export const generateReceipt = query({
  args: { amount: v.number(), plan: v.string(), name: v.string(), date: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return {
      company: "Dutchkem Ventures Prosuite NG+",
      address: "26, Opeki Road, Ipaja, Ayobo, Lagos State, Nigeria",
      tel: "(+234)-911-339-3525",
      email: "contact@dutchkem.com",
      rc: "9489855",
      logo: "https://dutchkem.com/logo.png", // Using absolute URL for receipts
      billTo: args.name,
      amount: args.amount,
      plan: args.plan,
      date: new Date(args.date).toLocaleDateString(),
      receiptId: `DKV-${Math.floor(100000 + Math.random() * 900000)}`,
      footer: "Stop Struggling. Start Winning.",
      supportEmail: "support@dutchkem.com"
    };
  }
});
