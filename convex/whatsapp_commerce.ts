import { v } from "convex/values";
import { action, query, mutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// WHATSAPP COMMERCE
// Buy/sell through WhatsApp — catalog, cart, checkout via messages
// ═══════════════════════════════════════════════════════════════════

export const sendWhatsAppCatalog = action({
  args: {
    phoneNumber: v.string(),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const products = await ctx.runQuery("whatsapp_integration:getProducts" as any, {}).catch(() => []);

    const productList = products.length > 0
      ? products.map((p: any, i: number) => `${i + 1}. *${p.name}* — NGN ${p.price.toLocaleString()}\n   ${p.description || ""}`).join("\n\n")
      : "No products available yet.";

    const message = `🛒 *DutchKem Store — WhatsApp*\n\nBrowse our products:\n\n${productList}\n\nTo order, reply with:\n📦 *order [product number] [quantity]*\nExample: order 2 3\n\n🛒 *cart* — View your cart\n💰 *pay* — Checkout\n❓ *help* — Show commands`;

    return { success: true, message, productCount: products.length };
  },
});

export const processWhatsAppOrder = action({
  args: {
    phoneNumber: v.string(),
    message: v.string(),
    customerName: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const text = args.message.toLowerCase().trim();
    const parts = text.split(" ");
    const cmd = parts[0];

    switch (cmd) {
      case "order": {
        const productIndex = parseInt(parts[1]) - 1;
        const quantity = parseInt(parts[2]) || 1;
        const products = await ctx.runQuery("whatsapp_integration:getProducts" as any, {}).catch(() => []);
        const product = products[productIndex];

        if (!product) return { success: true, reply: "❌ Product not found. Reply with 'shop' to see products." };
        if (product.stock < quantity) return { success: true, reply: `❌ Only ${product.stock} in stock.` };

        // Create order
        const order = await ctx.runMutation("order_management:createOrder" as any, {
          customerName: args.customerName || "WhatsApp Customer",
          customerEmail: `${args.phoneNumber.replace(/[^0-9]/g, "")}@whatsapp.dutchkem`,
          items: [{ name: product.name, quantity, unitPrice: product.price }],
          currency: "NGN",
        });

        return {
          success: true,
          reply: `✅ *Order Placed!*\n📦 ${product.name} x${quantity}\n💰 NGN ${(product.price * quantity).toLocaleString()}\n\nOrder: ${order.orderNumber}\nPay: ${order.paymentUrl}`,
        };
      }

      case "shop":
      case "catalog": {
        const products = await ctx.runQuery("whatsapp_integration:getProducts" as any, {}).catch(() => []);
        const list = products.map((p: any, i: number) => `${i + 1}. *${p.name}* — NGN ${p.price.toLocaleString()}`).join("\n");
        return { success: true, reply: `🛒 *Products:*\n\n${list || "No products available"}\n\nReply: order [number] [qty]` };
      }

      case "help":
        return {
          success: true,
          reply: `🛒 *DutchKem Store*\n\n/shop — Browse products\norder [num] [qty] — Place order\n/cart — View cart\n/pay — Checkout\n/status — Check orders\n/help — This message`,
        };

      default:
        return { success: true, reply: "I'm a shopping assistant! Reply with /shop to browse products or /help for commands." };
    }
  },
});

export const generateWhatsAppCatalogPage = action({
  args: {
    businessName: v.string(),
    whatsappNumber: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Shop on WhatsApp — ${args.businessName}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;background:#25D366;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px}
.card{background:#fff;border-radius:20px;padding:40px;max-width:400px;width:100%;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.2)}
.logo{font-size:48px;margin-bottom:15px}h1{color:#333;font-size:22px;margin-bottom:5px}.sub{color:#666;font-size:14px;margin-bottom:25px}
.btn{display:inline-flex;align-items:center;gap:10px;padding:16px 32px;background:#25D366;color:#fff;border-radius:12px;text-decoration:none;font-size:16px;font-weight:700;transition:transform .2s}
.btn:hover{transform:scale(1.05)}.btn svg{width:24px;height:24px}
.features{text-align:left;margin-top:25px;font-size:13px;color:#555;line-height:2}
.footer{margin-top:20px;font-size:11px;color:#999}
</style></head><body><div class="card">
<div class="logo">🛒</div>
<h1>${args.businessName}</h1>
<p class="sub">Shop directly on WhatsApp</p>
<a href="https://wa.me/${args.whatsappNumber.replace(/[^0-9]/g, "")}?text=Hi%20I%20want%20to%20shop" class="btn" target="_blank">
<svg viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.632-1.214A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.82c-2.09 0-4.025-.66-5.6-1.778l-.4-.268-2.744.719.733-2.675-.292-.463A9.777 9.777 0 012.18 12c0-5.422 4.398-9.82 9.82-9.82 5.422 0 9.82 4.398 9.82 9.82 0 5.422-4.398 9.82-9.82 9.82z"/></svg>
Chat to Shop
</a>
<div class="features">✅ Browse product catalog\n✅ Place orders directly\n✅ Pay via secure link\n✅ Track your orders</div>
<p class="footer">Powered by DutchKem Prosuite</p>
</div></body></html>`;

    return { success: true, html };
  },
});
