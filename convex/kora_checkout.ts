import { v } from "convex/values";
import { action, mutation, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { tryGetAdminSession } from "./auth_helpers";

// ═══════════════════════════════════════════════════════════════════
// KORA PAY CHECKOUT — Client & Enterprise Payment Integration
// ═══════════════════════════════════════════════════════════════════

const CREDIT_PACKAGES = [
  { id: "starter", credits: 1000, price: 1000, label: "Starter" },
  { id: "basic", credits: 5000, price: 5000, label: "Basic" },
  { id: "standard", credits: 8000, price: 8000, label: "Standard" },
  { id: "pro", credits: 15000, price: 15000, label: "Pro" },
  { id: "premium", credits: 35000, price: 35000, label: "Premium" },
  { id: "enterprise", credits: 100000, price: 100000, label: "Enterprise" },
];

const SUBSCRIPTION_PLANS = [
  { id: "starter", monthlyPrice: 5000, annualPrice: 48000, credits: 500, name: "Starter" },
  { id: "pro", monthlyPrice: 15000, annualPrice: 144000, credits: 2500, name: "Pro Suite NG+" },
  { id: "enterprise", monthlyPrice: 50000, annualPrice: 480000, credits: 20000, name: "Enterprise Elite" },
];

// ─── INITIATE CREDIT PURCHASE ───

export const initiateCreditPurchase = action({
  args: {
    userId: v.string(),
    packageId: v.string(),
    email: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    checkoutUrl: v.optional(v.string()),
    reference: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const secretKey = process.env.KORA_SECRET_KEY;
    if (!secretKey) {
      return { success: false, error: "Payment system not configured" };
    }

    const pkg = CREDIT_PACKAGES.find((p) => p.id === args.packageId);
    if (!pkg) {
      return { success: false, error: "Invalid package" };
    }

    const reference = `CREDIT-${args.userId.slice(-8)}-${Date.now()}`;

    try {
      const response = await fetch("https://api.korapay.com/merchant/api/v1/charges/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: pkg.price,
          currency: "NGN",
          reference,
          customer: { email: args.email },
          metadata: {
            userId: args.userId,
            type: "credit_purchase",
            packageId: args.packageId,
            credits: pkg.credits,
          },
        }),
      });

      const data = await response.json();
      if (data.status && data.data?.checkout_url) {
        // Store the pending transaction
        await ctx.runMutation(internal.kora_checkout.storePendingTransaction, {
          userId: args.userId,
          type: "credit_purchase",
          reference,
          amount: pkg.price,
          packageId: args.packageId,
          credits: pkg.credits,
          email: args.email,
        });

        return {
          success: true,
          checkoutUrl: data.data.checkout_url,
          reference,
        };
      }

      return { success: false, error: data.message || "Payment initialization failed" };
    } catch (e: any) {
      return { success: false, error: e.message || "Payment system error" };
    }
  },
});

// ─── INITIATE SUBSCRIPTION PURCHASE ───

export const initiateSubscriptionPurchase = action({
  args: {
    userId: v.string(),
    planId: v.string(),
    billingCycle: v.union(v.literal("monthly"), v.literal("annual")),
    email: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    checkoutUrl: v.optional(v.string()),
    reference: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const secretKey = process.env.KORA_SECRET_KEY;
    if (!secretKey) {
      return { success: false, error: "Payment system not configured" };
    }

    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === args.planId);
    if (!plan) {
      return { success: false, error: "Invalid plan" };
    }

    const amount = args.billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
    const reference = `SUB-${args.userId.slice(-8)}-${Date.now()}`;

    try {
      const response = await fetch("https://api.korapay.com/merchant/api/v1/charges/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency: "NGN",
          reference,
          customer: { email: args.email },
          metadata: {
            userId: args.userId,
            type: "subscription",
            planId: args.planId,
            billingCycle: args.billingCycle,
            credits: plan.credits,
          },
        }),
      });

      const data = await response.json();
      if (data.status && data.data?.checkout_url) {
        await ctx.runMutation(internal.kora_checkout.storePendingTransaction, {
          userId: args.userId,
          type: "subscription",
          reference,
          amount,
          packageId: args.planId,
          credits: plan.credits,
          email: args.email,
          billingCycle: args.billingCycle,
        });

        return {
          success: true,
          checkoutUrl: data.data.checkout_url,
          reference,
        };
      }

      return { success: false, error: data.message || "Payment initialization failed" };
    } catch (e: any) {
      return { success: false, error: e.message || "Payment system error" };
    }
  },
});

// ─── INITIATE ENTERPRISE ADD-ON PURCHASE ───

export const initiateEnterpriseAddonPurchase = action({
  args: {
    orgId: v.string(),
    addonId: v.string(),
    email: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    checkoutUrl: v.optional(v.string()),
    reference: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const secretKey = process.env.KORA_SECRET_KEY;
    if (!secretKey) {
      return { success: false, error: "Payment system not configured" };
    }

    const addon = await ctx.runQuery(internal.kora_checkout.getAddonById, { addonId: args.addonId });
    if (!addon) {
      return { success: false, error: "Add-on not found" };
    }

    const reference = `ADDON-${args.orgId.slice(-8)}-${Date.now()}`;

    try {
      const response = await fetch("https://api.korapay.com/merchant/api/v1/charges/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: addon.priceNgn,
          currency: "NGN",
          reference,
          customer: { email: args.email },
          metadata: {
            orgId: args.orgId,
            type: "enterprise_addon",
            addonId: args.addonId,
            addonName: addon.name,
            billingCycle: addon.billingCycle,
          },
        }),
      });

      const data = await response.json();
      if (data.status && data.data?.checkout_url) {
        await ctx.runMutation(internal.kora_checkout.storePendingTransaction, {
          userId: args.orgId,
          type: "enterprise_addon",
          reference,
          amount: addon.priceNgn,
          packageId: args.addonId,
          credits: 0,
          email: args.email,
        });

        return {
          success: true,
          checkoutUrl: data.data.checkout_url,
          reference,
        };
      }

      return { success: false, error: data.message || "Payment initialization failed" };
    } catch (e: any) {
      return { success: false, error: e.message || "Payment system error" };
    }
  },
});

// ─── INITIATE WHATSAPP SUBSCRIPTION PURCHASE ───

export const initiateWhatsAppSubscription = action({
  args: {
    userId: v.string(),
    tierId: v.string(),
    systemType: v.union(v.literal("admin"), v.literal("enterprise")),
    phoneNumber: v.string(),
    email: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    checkoutUrl: v.optional(v.string()),
    reference: v.optional(v.string()),
    error: v.optional(v.string()),
    debug: v.optional(v.any()),
  }),
  handler: async (ctx, args) => {
    const secretKey = process.env.KORA_SECRET_KEY;
    if (!secretKey) {
      return { success: false, error: "KORA_SECRET_KEY not configured", debug: { hasKey: false } };
    }

    // Get the tier details
    const tier = await ctx.runQuery(internal.whatsapp_dual.getTierById, { tierId: args.tierId as any });
    if (!tier) {
      return { success: false, error: "Tier not found", debug: { tierId: args.tierId } };
    }

    // Free tier - no payment needed
    if (tier.priceNgn === 0) {
      await ctx.runMutation(internal.whatsapp_dual.createSubscriptionInternal, {
        userId: args.userId,
        systemType: args.systemType,
        tierId: args.tierId,
        phoneNumber: args.phoneNumber,
      });

      // Send welcome message to activate WhatsApp integration immediately
      const welcomeMessage = `🎉 *Welcome to DutchKem Ventures WhatsApp!*\n\nYour *${tier.name}* plan is now active!\n\n✅ *What's included:*\n• ${tier.messagesPerMonth} messages/month\n• ${tier.agentLimit} AI agent${tier.agentLimit > 1 ? 's' : ''} support\n• ${tier.features.join(', ')}\n\n💬 *How to use:*\n• Chat with our AI agents for any service\n• Send messages to your contacts\n• Access all features in your plan\n\n🚀 *Get started now!* Send a message to any of our AI agents:\n• 🎓 Academic Writer\n• 💼 Business Consultant\n• ✍️ Content Strategist\n• 📄 Career Coach\n• 💰 Finance Advisor\n• And 10+ more!\n\n_Dutchkem Ventures — Your AI-Powered Business Partner_`;

      // Try to send via WhatsApp (non-blocking)
      try {
        await ctx.runAction((await import("./_generated/api")).internal.whatsapp_openwa.sendText as any, {
          sessionType: args.systemType,
          to: args.phoneNumber,
          message: welcomeMessage,
        });
      } catch (e) {
        console.log("[WhatsApp] Welcome message send skipped:", e);
      }

      return { success: true, reference: "FREE_TIER" };
    }

    const amount = parseInt(String(tier.priceNgn));
    const reference = `WA-${args.userId.slice(-8)}-${Date.now()}`;

    try {
      const requestBody = {
        amount,
        currency: "NGN",
        reference,
        customer: { email: args.email },
        metadata: {
          userId: args.userId,
          type: "whatsapp_subscription",
          tierId: args.tierId,
          systemType: args.systemType,
          phoneNumber: args.phoneNumber,
          tierName: tier.name,
          messagesPerMonth: tier.messagesPerMonth,
        },
      };

      console.log("[WhatsApp Payment] Request:", JSON.stringify(requestBody));

      const response = await fetch("https://api.korapay.com/merchant/api/v1/charges/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log("[WhatsApp Payment] Response:", JSON.stringify(data));

      if (data.status && data.data?.checkout_url) {
        await ctx.runMutation(internal.kora_checkout.storePendingTransaction, {
          userId: args.userId,
          type: "whatsapp_subscription",
          reference,
          amount,
          packageId: args.tierId,
          credits: tier.messagesPerMonth,
          email: args.email,
          billingCycle: "monthly",
        });

        return {
          success: true,
          checkoutUrl: data.data.checkout_url,
          reference,
          debug: { tierName: tier.name, amount, reference },
        };
      }

      return { 
        success: false, 
        error: data.message || "Payment initialization failed",
        debug: { 
          koraStatus: data.status, 
          koraMessage: data.message,
          koraData: data.data,
          requestBody,
          httpStatus: response.status,
        },
      };
    } catch (e: any) {
      console.error("[WhatsApp Payment] Error:", e.message);
      return { 
        success: false, 
        error: e.message || "Payment system error",
        debug: { exception: e.message, stack: e.stack },
      };
    }
  },
});

// ─── VERIFY PAYMENT ───

export const verifyPayment = action({
  args: {
    reference: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    status: v.string(),
    amount: v.optional(v.number()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const secretKey = process.env.KORA_SECRET_KEY;
    if (!secretKey) {
      return { success: false, status: "error", error: "Payment system not configured" };
    }

    try {
      const response = await fetch(`https://api.korapay.com/merchant/api/v1/charges/${args.reference}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.status) {
        const status = data.data?.status || "unknown";
        const amount = data.data?.amount;

        if (status === "success") {
          const pending = await ctx.runQuery(internal.kora_checkout.getPendingByReference, {
            reference: args.reference,
          });

          if (pending && pending.status === "pending") {
            await ctx.runMutation(internal.kora_checkout.markPendingCompleted, {
              pendingId: pending._id,
            });

            if (pending.type === "credit_purchase") {
              await ctx.runMutation(internal.kora_checkout.addCreditsToUser, {
                userId: pending.userId,
                credits: pending.credits,
                reference: args.reference,
              });
            } else if (pending.type === "subscription") {
              await ctx.runMutation(internal.kora_checkout.activateUserSubscription, {
                userId: pending.userId,
                planId: pending.packageId,
                billingCycle: pending.billingCycle || "monthly",
                reference: args.reference,
              });
            } else if (pending.type === "enterprise_addon") {
              await ctx.runMutation(internal.kora_checkout.activateEnterpriseAddon, {
                orgId: pending.userId,
                addonId: pending.packageId,
                reference: args.reference,
              });
            } else if (pending.type === "whatsapp_subscription") {
              // Activate WhatsApp subscription after payment verification
              const metadata = pending.rawPayload?.metadata || {};
              const tierId = pending.packageId;
              const userId = pending.userId;
              const systemType = metadata.systemType || "admin";
              const phoneNumber = metadata.phoneNumber || "";

              const tier = await ctx.runQuery(internal.whatsapp_dual.getTierById, { tierId: tierId as any });

              await ctx.runMutation(internal.whatsapp_dual.createSubscriptionInternal, {
                userId,
                systemType,
                tierId: tierId as any,
                phoneNumber,
              });

              // Send welcome message
              const tierName = tier?.name || "Premium";
              const features = tier?.features?.join(', ') || "messaging, support, analytics";
              const welcomeMessage = `🎉 *Welcome to DutchKem Ventures WhatsApp!*\n\nYour *${tierName}* plan is now active!\n\n✅ *What's included:*\n• ${tier?.messagesPerMonth || 5000} messages/month\n• ${tier?.agentLimit || 5} AI agent support\n• ${features}\n\n💬 *How to use:*\n• Chat with our AI agents for any service\n• Send messages to your contacts\n• Access all features in your plan\n\n🚀 *Get started now!* Send a message to any of our AI agents:\n• 🎓 Academic Writer\n• 💼 Business Consultant\n• ✍️ Content Strategist\n• 📄 Career Coach\n• 💰 Finance Advisor\n• And 10+ more!\n\n_Dutchkem Ventures — Your AI-Powered Business Partner_`;

              try {
                await ctx.runAction((await import("./_generated/api")).internal.whatsapp_openwa.sendText as any, {
                  sessionType: systemType,
                  to: phoneNumber,
                  message: welcomeMessage,
                });
              } catch (e) {
                console.log("[WhatsApp] Welcome message send skipped:", e);
              }
            }
          }
        }

        return { success: true, status, amount };
      }

      return { success: false, status: "failed", error: data.message };
    } catch (e: any) {
      return { success: false, status: "error", error: e.message };
    }
  },
});

// ─── WEBHOOK HANDLER (Kora Pay calls this) ───

export const handleKoraWebhook = internalMutation({
  args: {
    eventType: v.string(),
    reference: v.string(),
    amount: v.number(),
    status: v.string(),
    rawPayload: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Log the webhook
    await ctx.db.insert("kora_webhook_events", {
      eventType: args.eventType,
      reference: args.reference,
      amount: args.amount,
      status: args.status,
      rawPayload: args.rawPayload,
      verified: true,
      processed: false,
      receivedAt: Date.now(),
    });

    // Process successful payments
    if (args.status === "success" || args.eventType === "charge.success") {
      const pending = await ctx.db
        .query("kora_pending_transactions")
        .withIndex("by_reference", (q) => q.eq("reference", args.reference))
        .first();

        if (pending && pending.status === "pending") {
          // Mark as processed
          await ctx.db.patch(pending._id, {
            status: "completed",
            processedAt: Date.now(),
          });

          // Process based on type
          if (pending.type === "credit_purchase") {
            await ctx.runMutation(internal.kora_checkout.addCreditsToUser, {
              userId: pending.userId,
              credits: pending.credits,
              reference: args.reference,
            });
          } else if (pending.type === "subscription") {
            await ctx.runMutation(internal.kora_checkout.activateUserSubscription, {
              userId: pending.userId,
              planId: pending.packageId,
              billingCycle: pending.billingCycle || "monthly",
              reference: args.reference,
            });
          } else if (pending.type === "enterprise_addon") {
            await ctx.runMutation(internal.kora_checkout.activateEnterpriseAddon, {
              orgId: pending.userId,
              addonId: pending.packageId,
              reference: args.reference,
            });
          } else if (pending.type === "whatsapp_subscription") {
            // Activate WhatsApp subscription after payment
            const metadata = pending.rawPayload?.metadata || {};
            const tierId = pending.packageId;
            const userId = pending.userId;
            const systemType = metadata.systemType || "admin";
            const phoneNumber = metadata.phoneNumber || "";

            // Get tier details for welcome message
            const tier = await ctx.runQuery(internal.whatsapp_dual.getTierById, { tierId: tierId as any });

            await ctx.runMutation(internal.whatsapp_dual.createSubscriptionInternal, {
              userId,
              systemType,
              tierId: tierId as any,
              phoneNumber,
            });

            // Send welcome message
            const tierName = tier?.name || "Premium";
            const features = tier?.features?.join(', ') || "messaging, support, analytics";
            const welcomeMessage = `🎉 *Welcome to DutchKem Ventures WhatsApp!*\n\nYour *${tierName}* plan is now active!\n\n✅ *What's included:*\n• ${tier?.messagesPerMonth || 5000} messages/month\n• ${tier?.agentLimit || 5} AI agent support\n• ${features}\n\n💬 *How to use:*\n• Chat with our AI agents for any service\n• Send messages to your contacts\n• Access all features in your plan\n\n🚀 *Get started now!* Send a message to any of our AI agents:\n• 🎓 Academic Writer\n• 💼 Business Consultant\n• ✍️ Content Strategist\n• 📄 Career Coach\n• 💰 Finance Advisor\n• And 10+ more!\n\n_Dutchkem Ventures — Your AI-Powered Business Partner_`;

            // Try to send via WhatsApp (non-blocking)
            try {
              await ctx.runAction((await import("./_generated/api")).internal.whatsapp_openwa.sendText as any, {
                sessionType: systemType,
                to: phoneNumber,
                message: welcomeMessage,
              });
            } catch (e) {
              console.log("[WhatsApp] Welcome message send skipped:", e);
            }
          }
        }
    }
  },
});

// ─── INTERNAL HELPERS ───

export const storePendingTransaction = internalMutation({
  args: {
    userId: v.string(),
    type: v.string(),
    reference: v.string(),
    amount: v.number(),
    packageId: v.string(),
    credits: v.number(),
    email: v.string(),
    billingCycle: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("kora_pending_transactions", {
      userId: args.userId,
      type: args.type,
      reference: args.reference,
      amount: args.amount,
      packageId: args.packageId,
      credits: args.credits,
      email: args.email,
      billingCycle: args.billingCycle,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const getAddonById = internalQuery({
  args: { addonId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("enterprise_addons")
      .withIndex("by_addon_id", (q) => q.eq("addonId", args.addonId))
      .first();
  },
});

export const addCreditsToUser = internalMutation({
  args: {
    userId: v.string(),
    credits: v.number(),
    reference: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        balance: existing.balance + args.credits,
        lifetimePurchased: existing.lifetimePurchased + args.credits,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("user_credits", {
        userId: args.userId,
        balance: args.credits,
        lifetimePurchased: args.credits,
        lifetimeUsed: 0,
        autoRechargeEnabled: false,
        autoRechargeThreshold: 50,
        autoRechargeAmount: 500,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    await ctx.db.insert("credit_transactions", {
      userId: args.userId,
      amount: args.credits,
      transactionType: "purchase",
      description: `Purchased ${args.credits} credits`,
      reference: args.reference,
      createdAt: Date.now(),
    });
  },
});

export const activateUserSubscription = internalMutation({
  args: {
    userId: v.string(),
    planId: v.string(),
    billingCycle: v.string(),
    reference: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const intervals: Record<string, number> = {
      monthly: 30 * 24 * 60 * 60 * 1000,
      annual: 365 * 24 * 60 * 60 * 1000,
    };
    const endsAt = now + (intervals[args.billingCycle] || intervals.monthly);

    // Check for existing active subscription
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as any))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        endsAt: Math.max(existing.endsAt, now) + (intervals[args.billingCycle] || intervals.monthly),
        status: "active",
        failureCount: 0,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        userId: args.userId as any,
        plan: args.billingCycle === "annual" ? "yearly" : "monthly",
        service: "standard",
        status: "active",
        endsAt,
        autoRenew: true,
        failureCount: 0,
      });
    }

    // Add credits
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === args.planId);
    if (plan) {
      await ctx.runMutation(internal.kora_checkout.addCreditsToUser, {
        userId: args.userId,
        credits: plan.credits,
        reference: args.reference,
      });
    }
  },
});

export const activateEnterpriseAddon = internalMutation({
  args: {
    orgId: v.string(),
    addonId: v.string(),
    reference: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const addon = await ctx.db
      .query("enterprise_addons")
      .withIndex("by_addon_id", (q) => q.eq("addonId", args.addonId))
      .first();

    if (!addon) return;

    const now = Date.now();
    const endDate = addon.billingCycle === "monthly"
      ? now + (30 * 24 * 60 * 60 * 1000)
      : addon.billingCycle === "annual"
      ? now + (365 * 24 * 60 * 60 * 1000)
      : undefined;

    await ctx.db.insert("enterprise_addon_subscriptions", {
      orgId: args.orgId as any,
      addonId: addon.addonId,
      addonName: addon.name,
      status: "active",
      startDate: now,
      endDate,
      lastBillingAt: now,
      nextBillingAt: endDate,
      amountPaid: addon.priceNgn,
      createdAt: now,
    });
  },
});

export const processSuccessfulPayment = internalMutation({
  args: {
    reference: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("kora_webhook_events")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .collect();

    for (const event of events) {
      if (!event.processed) {
        await ctx.db.patch(event._id, { processed: true, processedAt: Date.now() });
      }
    }
  },
});

// ─── GET PENDING BY REFERENCE ───

export const getPendingByReference = internalQuery({
  args: { reference: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("kora_pending_transactions")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .first();
  },
});

// ─── MARK PENDING COMPLETED ───

export const markPendingCompleted = internalMutation({
  args: { pendingId: v.id("kora_pending_transactions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.pendingId, {
      status: "completed",
      processedAt: Date.now(),
    });
  },
});

// ─── GET PENDING TRANSACTIONS ───

export const getPendingTransactions = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("kora_pending_transactions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(20);
  },
});

// ─── GET CLIENT CREDIT PACKAGES ───

export const getCreditPackages = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return CREDIT_PACKAGES;
  },
});

// ─── GET SUBSCRIPTION PLANS ───

export const getSubscriptionPlansPublic = query({
  args: {},
  returns: v.any(),
  handler: async () => {
    return SUBSCRIPTION_PLANS;
  },
});
