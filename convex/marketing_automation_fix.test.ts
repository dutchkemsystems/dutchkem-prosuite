/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("marketing_automation: captureLead stores score in lead metadata (not lead_scores)", async () => {
  const t = convexTest(schema, modules);

  // Call captureLead with a unique email
  const leadId = await t.mutation(api.marketing_automation.captureLead, {
    email: `lead-fix-${Date.now()}@example.com`,
    name: "Fix Test Lead",
    source: "website",
    phone: "+2348000000000",
    company: "Test Corp",
    budget: "50000",
    timeline: "1 month",
  });

  expect(leadId).toBeDefined();

  // Verify lead has score data in metadata
  const lead: any = await t.run(async (ctx) => await ctx.db.get(leadId));
  expect(lead).toBeDefined();
  expect(lead.metadata).toBeDefined();
  expect(lead.metadata.score).toBeGreaterThan(0);
  expect(lead.metadata.scoreBreakdown).toBeDefined();
  expect(Array.isArray(lead.metadata.scoreBreakdown)).toBe(true);
  expect(lead.metadata.scoreBreakdown.length).toBeGreaterThan(0);
  expect(lead.metadata.scoreBreakdown[0]).toHaveProperty("factor");
  expect(lead.metadata.scoreBreakdown[0]).toHaveProperty("points");
  expect(lead.metadata.scoreBreakdown[0]).toHaveProperty("description");
  expect(lead.metadata.nextBestAction).toBeDefined();
  expect(typeof lead.metadata.nextBestAction).toBe("string");
});

test("marketing_automation: captureLead with minimal data still works", async () => {
  const t = convexTest(schema, modules);

  const leadId = await t.mutation(api.marketing_automation.captureLead, {
    source: "web",
  });

  expect(leadId).toBeDefined();
  const lead: any = await t.run(async (ctx) => await ctx.db.get(leadId));
  expect(lead.metadata.score).toBe(0); // No email, phone, company, or referral
});

test("marketing_automation: captureLead with referral gets bonus points", async () => {
  const t = convexTest(schema, modules);

  const leadId = await t.mutation(api.marketing_automation.captureLead, {
    email: `ref-${Date.now()}@example.com`,
    source: "referral",
  });

  const lead: any = await t.run(async (ctx) => await ctx.db.get(leadId));
  expect(lead.metadata.score).toBe(30); // 20 (email) + 10 (referral)
});

test("marketing_automation: logConversionTrigger does not throw", async () => {
  const t = convexTest(schema, modules);

  // Should not throw - the function is now a no-op
  await t.mutation(internal.marketing_automation.logConversionTrigger, {
    userId: "test-user-123",
    trigger: "usage_90_percent",
    action: "upgrade_nudge",
  });
});
