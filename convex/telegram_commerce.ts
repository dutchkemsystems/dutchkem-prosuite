import { v } from "convex/values";
import { action, query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════
// TELEGRAM BOT COMMERCE
// Buy/sell through Telegram bot — product catalog, cart, checkout
// ═══════════════════════════════════════════════════════════════════

export const handleTelegramCommand = action({
  args: {
    chatId: v.string(),
    command: v.string(),
    payload: v.optional(v.string()),
    userId: v.optional(v.string()),
    userName: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return { success: false, error: "Telegram bot not configured" };

    const parts = args.command.split(" ");
    const cmd = parts[0]?.toLowerCase();
    const param = parts.slice(1).join(" ");

    let response = "";

    switch (cmd) {
      case "/start":
      case "/help":
        response = `🛒 *DutchKem Store*\n\nAvailable commands:\n/shop — Browse products\n/cart — View cart\n/order — Place order\n/status — Check order status\n/help — Show this message\n\nBrowse and buy directly from Telegram!`;
        break;

      case "/shop":
      case "/products":
        const products = await ctx.runQuery(api.telegram_commerce.getProducts, {});
        if (products.length === 0) {
          response = "No products available yet.";
        } else {
          response = `🛒 *Product Catalog*\n\n${products.map((p: any, i: number) => `*${i + 1}.* ${p.name}\n💰 NGN ${p.price.toLocaleString()}\n📦 ${p.stock > 0 ? "In stock" : "Out of stock"}\n/id ${p._id}`).join("\n\n")}`;
        }
        break;

      case "/cart":
        const cart = await ctx.runQuery(api.telegram_commerce.getCart, { userId: args.userId || args.chatId });
        if (!cart || cart.items.length === 0) {
          response = "Your cart is empty. Use /shop to browse products.";
        } else {
          const total = cart.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
          response = `🛒 *Your Cart*\n\n${cart.items.map((i: any) => `${i.quantity}x ${i.name} — NGN ${(i.price * i.quantity).toLocaleString()}`).join("\n")}\n\n*Total: NGN ${total.toLocaleString()}*\n\n/pay to checkout`;
        }
        break;

      case "/add":
        if (!param) { response = "Usage: /add <product_id>"; break; }
        const addResult = await ctx.runMutation(api.telegram_commerce.addToCart, {
          userId: args.userId || args.chatId,
          productId: param,
        });
        response = addResult.success ? `✅ ${addResult.productName} added to cart! /cart to view` : `❌ ${addResult.error}`;
        break;

      case "/pay":
      case "/checkout":
        const checkout = await ctx.runAction(api.telegram_commerce.checkout, {
          userId: args.userId || args.chatId,
        });
        response = checkout.success
          ? `✅ *Order Placed!*\nOrder: ${checkout.orderNumber}\nTotal: NGN ${checkout.total.toLocaleString()}\n\nPay here: ${checkout.paymentUrl}`
          : `❌ ${checkout.error}`;
        break;

      case "/status":
        const orders = await ctx.runQuery(api.telegram_commerce.getUserOrders, { userId: args.userId || args.chatId });
        if (orders.length === 0) {
          response = "No orders found.";
        } else {
          response = orders.slice(0, 3).map((o: any) => `📦 ${o.orderNumber} — ${o.status}\n💰 NGN ${o.total.toLocaleString()}`).join("\n\n");
        }
        break;

      default:
        response = "Unknown command. Use /help for available commands.";
    }

    // Send response via Telegram API
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: args.chatId,
          text: response,
          parse_mode: "Markdown",
        }),
      });
    } catch (e) {
      console.log("Telegram send failed:", e);
    }

    return { success: true, response };
  },
});

export const getProducts = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("products").withIndex("by_published", (q) => q.eq("isPublished", true)).take(20);
  },
});

export const getCart = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const cart = await ctx.db.query("telegram_carts").withIndex("by_user", (q) => q.eq("userId", args.userId)).first();
    return cart || { userId: args.userId, items: [] };
  },
});

export const addToCart = mutation({
  args: { userId: v.string(), productId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId as Id<"products">);
    if (!product) return { success: false, error: "Product not found" };
    if (product.stock <= 0) return { success: false, error: "Out of stock" };

    const cart = await ctx.db.query("telegram_carts").withIndex("by_user", (q) => q.eq("userId", args.userId)).first();

    if (cart) {
      const items = [...cart.items];
      const existing = items.findIndex((i) => i.productId === args.productId);
      if (existing >= 0) {
        items[existing].quantity += 1;
      } else {
        items.push({ productId: args.productId, name: product.name, price: product.price, quantity: 1 });
      }
      await ctx.db.patch(cart._id, { items, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("telegram_carts", {
        userId: args.userId,
        items: [{ productId: args.productId, name: product.name, price: product.price, quantity: 1 }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true, productName: product.name };
  },
});

export const checkout = action({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const cart = await ctx.runQuery(api.telegram_commerce.getCart, { userId: args.userId });
    if (!cart || cart.items.length === 0) return { success: false, error: "Cart is empty" };

    const total = cart.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
    const orderResult = await ctx.runMutation(api.order_management.createOrder, {
      customerName: "Telegram Customer",
      customerEmail: `${args.userId}@telegram.dutchkem`,
      items: cart.items.map((i: any) => ({ name: i.name, quantity: i.quantity, unitPrice: i.price })),
      currency: "NGN",
    });

    // Clear cart
    const cartDoc = await ctx.runQuery(api.telegram_commerce.getCart, { userId: args.userId });
    if (cartDoc && cartDoc._id) {
      await ctx.runMutation(api.telegram_commerce.clearCart, { cartId: cartDoc._id });
    }

    return {
      success: true,
      orderNumber: orderResult.orderNumber,
      total,
      paymentUrl: orderResult.paymentUrl,
    };
  },
});

export const clearCart = mutation({
  args: { cartId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.cartId as Id<"telegram_carts">);
  },
});

export const getUserOrders = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("orders")
      .filter((q) => q.eq(q.field("customerEmail"), `${args.userId}@telegram.dutchkem`))
      .order("desc")
      .take(10);
  },
});
