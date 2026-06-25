import { v } from "convex/values";
import { action, query, mutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// SOCIAL PROOF WIDGETS
// Testimonials, review counters, trust badges, activity feed
// ═══════════════════════════════════════════════════════════════════

export const addTestimonial = mutation({
  args: {
    name: v.string(),
    role: v.optional(v.string()),
    company: v.optional(v.string()),
    text: v.string(),
    rating: v.number(),
    avatarUrl: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("testimonials", {
      name: args.name,
      role: args.role || "",
      company: args.company || "",
      text: args.text,
      rating: args.rating,
      avatarUrl: args.avatarUrl || "",
      isPublished: args.isPublished ?? true,
      createdAt: Date.now(),
    });
    return { success: true, testimonialId: id };
  },
});

export const getTestimonials = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("testimonials")
      .filter((q) => q.eq(q.field("isPublished"), true))
      .order("desc")
      .take(args.limit || 10);
  },
});

export const generateTestimonialWidget = action({
  args: {
    businessName: v.string(),
    style: v.optional(v.string()),
    count: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const testimonials = await ctx.runQuery(api.social_proof.getTestimonials, { limit: args.count || 6 });
    const count = testimonials.length;
    const avgRating = count > 0
      ? (testimonials.reduce((s: number, t: any) => s + t.rating, 0) / count).toFixed(1)
      : "0";

    const cards = testimonials.map((t: any) => `
      <div class="testimonial">
        <div class="stars">${"★".repeat(t.rating)}${"☆".repeat(5 - t.rating)}</div>
        <p class="text">"${t.text}"</p>
        <div class="author">
          <div class="avatar">${t.name.charAt(0)}</div>
          <div><p class="name">${t.name}</p><p class="role">${t.role ? `${t.role} at ` : ""}${t.company || args.businessName}</p></div>
        </div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;background:#f8f9fa;padding:40px}
.header{text-align:center;margin-bottom:30px}.header h2{color:#333;font-size:24px}.header p{color:#666;font-size:13px}
.stats{display:flex;justify-content:center;gap:30px;margin:20px 0}.stat{text-align:center}.stat .num{font-size:32px;font-weight:800;color:#FF6B35}.stat .label{font-size:11px;color:#999;text-transform:uppercase}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;max-width:1000px;margin:0 auto}
.testimonial{background:#fff;border-radius:16px;padding:25px;box-shadow:0 2px 10px rgba(0,0,0,0.06)}
.stars{color:#FFD700;font-size:16px;margin-bottom:12px}
.text{font-size:14px;color:#555;line-height:1.6;margin-bottom:15px}
.author{display:flex;align-items:center;gap:10px}
.avatar{width:40px;height:40px;border-radius:50%;background:#FF6B35;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px}
.name{font-weight:700;font-size:13px}.role{font-size:11px;color:#999}
.footer{text-align:center;margin-top:25px;font-size:11px;color:#999}
</style></head><body>
<div class="header"><h2>What Our Customers Say</h2><p>${count} verified reviews · ${avgRating} average rating</p></div>
<div class="stats">
  <div class="stat"><div class="num">${avgRating}</div><div class="label">Average Rating</div></div>
  <div class="stat"><div class="num">${count}</div><div class="label">Reviews</div></div>
  <div class="stat"><div class="num">${testimonials.filter((t: any) => t.rating >= 4).length}</div><div class="label">5-Star Reviews</div></div>
</div>
<div class="grid">${cards}</div>
<p class="footer">Powered by DutchKem Prosuite</p>
</body></html>`;

    return { success: true, html, count, avgRating };
  },
});

export const generateTrustBadge = action({
  args: {
    type: v.string(),
    value: v.string(),
    businessName: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const colors: Record<string, string> = {
      reviews: "#FF6B35", uptime: "#28a745", customers: "#007bff", awards: "#FFD700",
    };
    const icons: Record<string, string> = { reviews: "⭐", uptime: "🟢", customers: "👥", awards: "🏆" };

    const html = `<div style="display:inline-flex;align-items:center;gap:8px;padding:8px 16px;background:${colors[args.type] || "#666"}11;border:1px solid ${colors[args.type] || "#666"}33;border-radius:8px;font-family:'Segoe UI',sans-serif">
<span style="font-size:20px">${icons[args.type] || "✓"}</span>
<div><p style="font-size:16px;font-weight:800;color:${colors[args.type] || "#333"};margin:0">${args.value}</p>
<p style="font-size:10px;color:#666;margin:0">${args.type.charAt(0).toUpperCase() + args.type.slice(1)}${args.businessName ? ` · ${args.businessName}` : ""}</p></div></div>`;

    return { success: true, html };
  },
});
