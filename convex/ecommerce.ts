import { v } from "convex/values";
import { action, query, mutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// E-COMMERCE STOREFRONT
// Product listings, cart, checkout for digital/physical products
// ═══════════════════════════════════════════════════════════════════

export const createProduct = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.number(),
    currency: v.optional(v.string()),
    category: v.string(),
    productType: v.string(),
    imageUrl: v.optional(v.string()),
    stock: v.optional(v.number()),
    isPublished: v.optional(v.boolean()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const productId = await ctx.db.insert("products", {
      name: args.name,
      description: args.description,
      price: args.price,
      currency: args.currency || "NGN",
      category: args.category,
      productType: args.productType,
      imageUrl: args.imageUrl || "",
      stock: args.stock ?? 999,
      salesCount: 0,
      isPublished: args.isPublished ?? true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true, productId };
  },
});

export const createOrder = action({
  args: {
    productId: v.string(),
    quantity: v.number(),
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.optional(v.string()),
    shippingAddress: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orderNumber = `ORD-${Date.now()}`;
    const paymentUrl = `https://dutchkem-prosuite-app.vercel.app/pay?ref=${orderNumber}`;

    return {
      success: true,
      orderNumber,
      paymentUrl,
      quantity: args.quantity,
      message: `Order ${orderNumber} created. Payment link generated.`,
    };
  },
});

export const getProducts = query({
  args: { category: v.optional(v.string()), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.category) {
      const results = await ctx.db.query("products").withIndex("by_category", (q2) => q2.eq("category", args.category!)).take(args.limit || 20);
      return results.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return await ctx.db.query("products").order("desc").take(args.limit || 20);
  },
});

export const generateStorefront = action({
  args: {
    storeName: v.string(),
    description: v.optional(v.string()),
    products: v.array(v.object({
      name: v.string(),
      price: v.number(),
      description: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
    })),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const productCards = args.products.map((p, i) => `
      <div class="product">
        <div class="product-img" style="background-image:url('${p.imageUrl || `https://via.placeholder.com/300x200/FF6B35/fff?text=${encodeURIComponent(p.name)}`}')"></div>
        <h3>${p.name}</h3>
        <p>${p.description || ""}</p>
        <div class="price">NGN ${p.price.toLocaleString()}</div>
        <button class="btn">Add to Cart</button>
      </div>
    `).join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${args.storeName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f8f9fa; }
  .header { background: linear-gradient(135deg, #FF6B35, #F7931E); color: white; padding: 60px 20px; text-align: center; }
  .header h1 { font-size: 36px; margin-bottom: 10px; }
  .header p { font-size: 16px; opacity: 0.9; }
  .products { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; max-width: 1200px; margin: 40px auto; padding: 0 20px; }
  .product { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08); transition: transform 0.2s; }
  .product:hover { transform: translateY(-4px); }
  .product-img { height: 200px; background-size: cover; background-position: center; background-color: #FF6B35; }
  .product h3 { padding: 15px 15px 5px; font-size: 18px; }
  .product p { padding: 0 15px; font-size: 13px; color: #666; }
  .price { padding: 10px 15px; font-size: 20px; font-weight: 700; color: #FF6B35; }
  .btn { margin: 0 15px 15px; padding: 10px 20px; background: #FF6B35; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; }
  .btn:hover { background: #E85A2A; }
  .footer { text-align: center; padding: 30px; color: #999; font-size: 12px; }
</style>
</head>
<body>
  <div class="header">
    <h1>${args.storeName}</h1>
    <p>${args.description || "Shop our products"}</p>
  </div>
  <div class="products">${productCards}</div>
  <div class="footer">Powered by DutchKem Prosuite · <a href="https://dutchkem-prosuite-app.vercel.app/auth">Register</a></div>
</body>
</html>`;

    return { success: true, html, productCount: args.products.length };
  },
});
