import { v } from "convex/values";
import { action, query, mutation } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// LANDING PAGE BUILDER
// Generate professional landing pages from config
// ═══════════════════════════════════════════════════════════════════

export const generateLandingPage = action({
  args: {
    title: v.string(),
    subtitle: v.optional(v.string()),
    ctaText: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    features: v.optional(v.array(v.object({
      icon: v.string(),
      title: v.string(),
      description: v.string(),
    }))),
    testimonials: v.optional(v.array(v.object({
      name: v.string(),
      text: v.string(),
      rating: v.number(),
    }))),
    pricing: v.optional(v.array(v.object({
      name: v.string(),
      price: v.number(),
      features: v.array(v.string()),
      highlighted: v.optional(v.boolean()),
    }))),
    businessName: v.optional(v.string()),
    color: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const color = args.color || "#FF6B35";
    const ctaUrl = args.ctaUrl || "https://dutchkem-prosuite-app.vercel.app/auth";
    const features = args.features || [];
    const testimonials = args.testimonials || [];
    const pricing = args.pricing || [];

    const featuresHtml = features.length > 0 ? `
    <section class="features"><div class="container">
      <h2>Why Choose Us</h2>
      <div class="f-grid">${features.map(f => `
        <div class="f-card"><span class="f-icon">${f.icon}</span><h3>${f.title}</h3><p>${f.description}</p></div>
      `).join("")}</div></div></section>` : "";

    const testimonialsHtml = testimonials.length > 0 ? `
    <section class="testimonials"><div class="container">
      <h2>What Our Customers Say</h2>
      <div class="t-grid">${testimonials.map(t => `
        <div class="t-card"><div class="stars">${"★".repeat(t.rating)}${"☆".repeat(5 - t.rating)}</div><p>"${t.text}"</p><p class="t-name">— ${t.name}</p></div>
      `).join("")}</div></div></section>` : "";

    const pricingHtml = pricing.length > 0 ? `
    <section class="pricing"><div class="container">
      <h2>Pricing</h2>
      <div class="p-grid">${pricing.map(p => `
        <div class="p-card${p.highlighted ? " highlighted" : ""}"><h3>${p.name}</h3><p class="price">NGN ${p.price.toLocaleString()}<span>/mo</span></p>
        <ul>${p.features.map(f => `<li>✓ ${f}</li>`).join("")}</ul>
        <a href="${ctaUrl}" class="btn${p.highlighted ? " btn-hl" : ""}">Get Started</a></div>
      `).join("")}</div></div></section>` : "";

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${args.title}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',system-ui,sans-serif;color:#333}
.hero{background:linear-gradient(135deg,${color},${color}cc);color:#fff;padding:100px 20px;text-align:center}
.hero h1{font-size:48px;max-width:700px;margin:0 auto 15px;line-height:1.2}.hero p{font-size:18px;opacity:0.9;max-width:500px;margin:0 auto 30px}
.btn{display:inline-block;padding:16px 36px;background:#fff;color:${color};border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;transition:transform .2s}
.btn:hover{transform:scale(1.05)}.btn-hl{background:${color};color:#fff}
.container{max-width:1000px;margin:0 auto;padding:60px 20px}.container h2{text-align:center;font-size:28px;margin-bottom:40px}
.features{background:#f8f9fa}.f-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}
.f-card{background:#fff;border-radius:16px;padding:30px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,0.06)}
.f-icon{font-size:36px;margin-bottom:10px;display:block}.f-card h3{font-size:18px;margin-bottom:8px}.f-card p{font-size:14px;color:#666}
.testimonials .t-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}
.t-card{background:#fff;border-radius:16px;padding:25px;box-shadow:0 2px 10px rgba(0,0,0,0.06)}
.stars{color:#FFD700;margin-bottom:10px}.t-card p{font-size:14px;color:#555;line-height:1.6}.t-name{font-weight:700;color:#333;margin-top:10px}
.pricing .p-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}
.p-card{background:#fff;border-radius:16px;padding:30px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,0.06);border:2px solid transparent}
.p-card.highlighted{border-color:${color};transform:scale(1.03)}
.p-card h3{font-size:20px;margin-bottom:10px}.price{font-size:36px;font-weight:800;color:${color}}.price span{font-size:14px;font-weight:400;color:#666}
.p-card ul{list-style:none;margin:20px 0}.p-card li{padding:8px 0;font-size:14px;color:#555;border-bottom:1px solid #f0f0f0}
.cta{text-align:center;padding:80px 20px;background:${color};color:#fff}.cta h2{color:#fff;margin-bottom:15px}.cta .btn{color:${color}}
.footer{text-align:center;padding:30px;font-size:12px;color:#999}
</style></head><body>
<div class="hero"><h1>${args.title}</h1>${args.subtitle ? `<p>${args.subtitle}</p>` : ""}
<a href="${ctaUrl}" class="btn">${args.ctaText || "Get Started"}</a></div>
${featuresHtml}${testimonialsHtml}${pricingHtml}
<div class="cta"><h2>Ready to Get Started?</h2><a href="${ctaUrl}" class="btn">${args.ctaText || "Get Started Now"}</a></div>
<div class="footer">Powered by DutchKem Prosuite</div>
</body></html>`;

    return { success: true, html, title: args.title };
  },
});
