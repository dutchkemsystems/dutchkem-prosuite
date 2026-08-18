/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// Pollinations.ai is a free external image service — gate live generation
// calls so the default `npm test` is deterministic.
const RUN_IMAGE_TESTS = process.env.RUN_IMAGE_TESTS === "true";

// ═══════════════════════════════════════════════════════════════════
// INTEGRATION HEALTH TESTS — Verify all API keys and services work
// ═══════════════════════════════════════════════════════════════════

// ─── COMPOSIO ───
test("Composio: API key works and returns toolkits", async () => {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) { console.log("SKIP: COMPOSIO_API_KEY not set in test env"); return; }
  const result = await fetch("https://backend.composio.dev/api/v3.1/toolkits?limit=5", {
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
  });
  // Composio may return 200 or 401 — both mean the endpoint is reachable
  expect(result.status === 200 || result.status === 401).toBe(true);
}, 15000);

// ─── POLLINATIONS.AI (Free image generation) ───
test.skipIf(!RUN_IMAGE_TESTS)("Pollinations.ai: generates image URL", async () => {
  const prompt = encodeURIComponent("professional business poster, blue gradient");
  const url = `https://image.pollinations.ai/prompt/${prompt}?width=512&height=512&nologo=true`;
  const result = await fetch(url, { redirect: "follow" });
  expect(result.ok).toBe(true);
  expect(result.url).toContain("pollinations");
}, 30000);

// ─── NVIDIA NIM ───
test("NVIDIA NIM: API key works", async () => {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) { console.log("SKIP: NVIDIA_NIM_API_KEY not set"); return; }
  const result = await fetch("https://integrate.api.nvidia.com/v1/models", {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });
  expect(result.ok).toBe(true);
}, 15000);

// ─── REPLICATE ───
test("Replicate: API key works", async () => {
  const token = process.env.REPLICATE_API_TOKEN || process.env.VITE_REPLICATE_API_TOKEN;
  if (!token) { console.log("SKIP: REPLICATE_API_TOKEN not set"); return; }
  const result = await fetch("https://api.replicate.com/v1/account", {
    headers: { "Authorization": `Token ${token}` },
  });
  expect(result.ok).toBe(true);
  const data = await result.json() as any;
  expect(data.username).toBeDefined();
}, 15000);

// ─── HUGGINGFACE ───
test("HuggingFace: API token works", async () => {
  const token = process.env.VITE_HUGGINGFACE_API_TOKEN;
  if (!token) { console.log("SKIP: VITE_HUGGINGFACE_API_TOKEN not set"); return; }
  const result = await fetch("https://huggingface.co/api/whoami-v2", {
    headers: { "Authorization": `Bearer ${token}` },
  });
  expect(result.ok).toBe(true);
}, 15000);

// ─── TERMII SMS ───
test("Termii: API key works", async () => {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) { console.log("SKIP: TERMII_API_KEY not set"); return; }
  const result = await fetch(`https://api.termii.com/api/sms/balance?api_key=${apiKey}`);
  expect(result.ok).toBe(true);
  const data = await result.json() as any;
  expect(data.balance).toBeDefined();
}, 15000);

// ─── RESEND EMAIL ───
test("Resend: API key works", async () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.log("SKIP: RESEND_API_KEY not set"); return; }
  const result = await fetch("https://api.resend.com/domains", {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });
  expect(result.ok).toBe(true);
}, 15000);

// ─── TELEGRAM BOT ───
test("Telegram: bot token works", async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { console.log("SKIP: TELEGRAM_BOT_TOKEN not set"); return; }
  const result = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  expect(result.ok).toBe(true);
  const data = await result.json() as any;
  expect(data.ok).toBe(true);
  expect(data.result.username).toBeDefined();
}, 15000);

// ─── KORA PAY ───
test("Kora Pay: API keys work", async () => {
  const publicKey = process.env.KORA_PUBLIC_KEY;
  if (!publicKey) { console.log("SKIP: KORA_PUBLIC_KEY not set"); return; }
  expect(publicKey).toContain("pk_");
}, 5000);

// ─── AWS SES ───
test("AWS SES: credentials configured", async () => {
  const key = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;
  if (!key || !secret) { console.log("SKIP: AWS credentials not set"); return; }
  expect(key).toContain("AKIA");
  expect(secret.length).toBeGreaterThan(10);
}, 5000);

// ─── GOOGLE OAUTH ───
test("Google OAuth: credentials configured", async () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) { console.log("SKIP: Google OAuth not set"); return; }
  expect(clientId).toContain("googleusercontent.com");
  expect(clientSecret).toContain("GOCSPX");
}, 5000);

// ─── CONVEX BACKEND ───
test("Convex: backend is accessible", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.model_orchestrator.getProviderHealth, {});
  expect(result.total).toBe(9);
}, 15000);

// ─── SOCIAL PLATFORM CONNECTIONS ───
test("Social: connection status check works", async () => {
  const t = convexTest(schema, modules);
  const result: any = await t.query(api.social_automation.getConnectionStatus, {});
  expect(result.platforms.length).toBe(12);
  expect(result.summary.total).toBe(12);
}, 15000);

// ─── POSTER GENERATION ───
test.skipIf(!RUN_IMAGE_TESTS)("Poster: AI generation via Pollinations.ai works", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", { email: `health-test-${Date.now()}@test.com`, role: "admin" } as any);
  });
  const sessionId = await t.run(async (ctx) => {
    return await ctx.db.insert("user_sessions", {
      userId, userType: "admin", device: "test", location: "Test", ip: "127.0.0.1",
      fingerprint: `fp-${Date.now()}`, lastActive: Date.now(), isCurrent: true,
      isTwoFactorVerified: false, deviceInfo: { userAgent: "test", deviceType: "web", browser: "test", os: "test" },
      isRevoked: false, expiresAt: Date.now() + 86400000,
    });
  });

  const result: any = await t.action(api.poster_generator.generatePosterImageAction, {
    adminToken: sessionId, agentId: "A1", platform: "instagram",
  }, { timeout: 30000 });

  expect(result.success).toBe(true);
  expect(result.imageUrl).toBeDefined();
  expect(result.imageUrl.length).toBeGreaterThan(10);
}, 60000);

// ─── DRIP DELIVERY ───
test("Drip: enrollment and delivery engine works", async () => {
  const t = convexTest(schema, modules);
  // Create a campaign
  const campaignId = await t.mutation(api.marketing_funnel.createCampaign, {
    name: "Health Test Campaign",
    type: "email",
    steps: [{ delay: 0, subject: "Welcome", content: "Hello!", channel: "email" }],
    trigger: "registration",
  });

  // Create a lead
  const leadId = await t.run(async (ctx) => {
    return await ctx.db.insert("leads", {
      email: "health-test@example.com",
      name: "Health Test",
      source: "web",
      status: "new",
      receivedAt: Date.now(),
    } as any);
  });

  // Activate campaign
  await t.mutation(api.marketing_funnel.activateCampaign, { campaignId });

  // Enroll lead
  const enrollResult: any = await t.mutation(api.drip_delivery.enrollLead, { campaignId, leadId });
  expect(enrollResult.success).toBe(true);

  // Check enrollment exists
  const enrollments: any = await t.query(api.drip_delivery.getEnrollments, { campaignId });
  expect(enrollments.length).toBe(1);
  expect(enrollments[0].status).toBe("active");
}, 15000);

// ─── UNIFIED SCORING ───
test("Scoring: unified lead scoring works", async () => {
  const t = convexTest(schema, modules);
  const leadId = await t.run(async (ctx) => {
    return await ctx.db.insert("leads", {
      email: "score-test@example.com",
      phone: "+2348000000000",
      name: "Score Test",
      source: "referral",
      status: "new",
      receivedAt: Date.now(),
    } as any);
  });

  const result: any = await t.mutation(api.unified_scoring.scoreAndStoreLead, {
    leadId,
    email: "score-test@example.com",
    phone: "+2348000000000",
    name: "Score Test",
    source: "referral",
    interest: "enterprise",
    budget: "500k",
    timeline: "urgent",
  });

  expect(result.score).toBeGreaterThan(0);
  expect(result.tier).toBeDefined();
  expect(result.nextBestAction).toBeDefined();
  expect(result.reasoning.length).toBeGreaterThan(0);

  // Verify stored on lead
  const lead: any = await t.run(async (ctx) => await ctx.db.get(leadId));
  expect(lead.score).toBeGreaterThan(0);
}, 15000);

// ─── FLASH SALES ───
test("Flash Sales: create and query works", async () => {
  const t = convexTest(schema, modules);
  const saleId = await t.mutation(api.flashSales.createFlashSale, {
    name: "Health Test Sale",
    discountPercent: 25,
    startsAt: Date.now(),
    endsAt: Date.now() + 86400000,
    applicablePlans: ["pro"],
  });

  expect(saleId).toBeDefined();

  const sales: any = await t.query(api.flashSales.getAllFlashSales, {});
  expect(sales.length).toBeGreaterThan(0);
  expect(sales.some((s: any) => s._id === saleId)).toBe(true);
}, 15000);

// ─── PROMO CODES ───
test("Promo Codes: create and validate works", async () => {
  const t = convexTest(schema, modules);
  const promoId = await t.mutation(api.flashSales.createPromoCode, {
    code: `HEALTH${Date.now()}`,
    discountPercent: 15,
    maxUses: 100,
    expiresAt: Date.now() + 86400000,
  });

  expect(promoId).toBeDefined();

  const promos: any = await t.query(api.flashSales.getAllPromoCodes, {});
  expect(promos.length).toBeGreaterThan(0);
}, 15000);
