// core.test.ts
// Tests for core schema module
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

describe("Core Schema Module", () => {
  test("users table exists and is queryable", async () => {
    const t = convexTest(schema, modules);

    // Insert a test user
    const userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        email: "test@example.com",
        name: "Test User",
        role: "user",
      });
    });

    expect(userId).toBeDefined();

    // Query the user
    const user = await t.run(async (ctx: any) => {
      return await ctx.db.get(userId);
    });

    expect(user).toBeDefined();
    expect(user?.email).toBe("test@example.com");
    expect(user?.name).toBe("Test User");
  });

  test("subscriptions table exists and is queryable", async () => {
    const t = convexTest(schema, modules);

    // First create a user
    const userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        email: "subscriber@example.com",
        name: "Subscriber",
        role: "user",
      });
    });

    // Create a subscription
    const subscriptionId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("subscriptions", {
        userId,
        plan: "monthly",
        status: "active",
        endsAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        autoRenew: true,
        failureCount: 0,
      });
    });

    expect(subscriptionId).toBeDefined();

    // Query the subscription
    const subscription = await t.run(async (ctx: any) => {
      return await ctx.db.get(subscriptionId);
    });

    expect(subscription).toBeDefined();
    expect(subscription?.plan).toBe("monthly");
    expect(subscription?.status).toBe("active");
  });

  test("payment_methods table exists and is queryable", async () => {
    const t = convexTest(schema, modules);

    // Create a user
    const userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        email: "payer@example.com",
        name: "Payer",
        role: "user",
      });
    });

    // Create a payment method
    const paymentMethodId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("payment_methods", {
        userId,
        type: "card",
        provider: "Visa",
        last4: "4242",
        isDefault: true,
      });
    });

    expect(paymentMethodId).toBeDefined();

    // Query the payment method
    const paymentMethod = await t.run(async (ctx: any) => {
      return await ctx.db.get(paymentMethodId);
    });

    expect(paymentMethod).toBeDefined();
    expect(paymentMethod?.type).toBe("card");
    expect(paymentMethod?.provider).toBe("Visa");
  });

  test("notifications table exists and is queryable", async () => {
    const t = convexTest(schema, modules);

    // Create a user
    const userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        email: "notified@example.com",
        name: "Notified",
        role: "user",
      });
    });

    // Create a notification
    const notificationId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("notifications", {
        userId,
        title: "Test Notification",
        message: "This is a test notification",
        type: "system",
        read: false,
        createdAt: Date.now(),
      });
    });

    expect(notificationId).toBeDefined();

    // Query the notification
    const notification = await t.run(async (ctx: any) => {
      return await ctx.db.get(notificationId);
    });

    expect(notification).toBeDefined();
    expect(notification?.title).toBe("Test Notification");
    expect(notification?.type).toBe("system");
  });
});
