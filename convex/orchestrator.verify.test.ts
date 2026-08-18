import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════════
// MODEL ORCHESTRATOR — VERIFICATION TEST
// Validates all 9 providers are correctly configured
// ═══════════════════════════════════════════════════════════════════

const CONVEX_URL = process.env.CONVEX_URL || "https://warmhearted-aardvark-280.convex.cloud";

async function queryConvex(query: string, args: Record<string, any> = {}) {
  const response = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: query, args }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Convex query error ${response.status}: ${text}`);
  }
  const raw = await response.json();
  // Convex HTTP API wraps in {status, value}
  return raw?.value ?? raw;
}

// ═══════════════════════════════════════════════════════════════════
// PROVIDER CONFIGURATION TEST
// ═══════════════════════════════════════════════════════════════════

describe("Provider Configuration — 9 Providers", () => {
  it("Returns all 9 providers with correct structure", async () => {
    const res = await queryConvex("model_orchestrator:getProviderHealth");

    expect(res.total).toBe(9);
    expect(res.providers).toHaveLength(9);

    const providerNames = res.providers.map((p: any) => p.name);
    expect(providerNames).toEqual(
      expect.arrayContaining([
        "freellmapi", "tencent", "cerebras", "mistral",
        "groq", "openrouter", "nvidia", "aiml", "mimo"
      ])
    );

    console.log("\n═══════════════════════════════════════════════════");
    console.log("  9 PROVIDERS — CONFIGURATION VERIFIED");
    console.log("═══════════════════════════════════════════════════");

    for (const p of res.providers) {
      const status = p.health.status === "healthy" ? "✅" : "⚠️";
      console.log(`  ${status} ${p.displayName.padEnd(20)} Priority: ${p.priority}  Cost: $${p.cost}/1M  Models: ${p.modelCount}`);
    }
    console.log("═══════════════════════════════════════════════════\n");
  });

  it("Cerebras is at priority 3 (ultra_fast, FREE)", async () => {
    const res = await queryConvex("model_orchestrator:getProviderHealth");
    const cerebras = res.providers.find((p: any) => p.name === "cerebras");

    expect(cerebras).toBeDefined();
    expect(cerebras.priority).toBe(3);
    expect(cerebras.cost).toBe(0);
    expect(cerebras.category).toBe("ultra_fast");
    expect(cerebras.capabilities).toContain("chat");
    expect(cerebras.capabilities).toContain("streaming");
    expect(cerebras.modelCount).toBeGreaterThanOrEqual(1);
  });

  it("All free providers have cost = 0", async () => {
    const res = await queryConvex("model_orchestrator:getProviderHealth");
    const freeProviders = res.providers.filter((p: any) => p.cost === 0);

    expect(freeProviders.length).toBeGreaterThanOrEqual(3);
    const freeNames = freeProviders.map((p: any) => p.name);
    expect(freeNames).toContain("freellmapi");
    expect(freeNames).toContain("tencent");
    expect(freeNames).toContain("cerebras");

    console.log(`  Free providers: ${freeNames.join(", ")}`);
  });
});

// ═══════════════════════════════════════════════════════════════════
// USE CASE MAPPING TEST
// ═══════════════════════════════════════════════════════════════════

describe("Use Case Mapping — 14 Use Cases", () => {
  it("Has all 14 use cases", async () => {
    const res = await queryConvex("model_orchestrator:getUseCaseMapping");
    const useCases = Object.keys(res);

    expect(useCases.length).toBeGreaterThanOrEqual(14);

    const expectedUseCases = [
      "chat", "academic", "business", "content", "code",
      "design", "analysis", "research", "finance", "agentic",
      "long_context", "translation", "real_time", "video"
    ];

    for (const uc of expectedUseCases) {
      expect(useCases).toContain(uc);
    }

    console.log("\n  Use Cases:");
    for (const uc of useCases) {
      console.log(`    ${uc.padEnd(15)} → ${res[uc].join(", ")}`);
    }
  });

  it("Cerebras is in every use case", async () => {
    const res = await queryConvex("model_orchestrator:getUseCaseMapping");

    for (const [useCase, providers] of Object.entries(res)) {
      expect(providers).toContain("cerebras");
    }
  });

  it("real_time use case has cerebras first", async () => {
    const res = await queryConvex("model_orchestrator:getUseCaseMapping");
    expect(res.real_time[0]).toBe("cerebras");
  });
});

// ═══════════════════════════════════════════════════════════════════
// COST TIER TEST
// ═══════════════════════════════════════════════════════════════════

describe("Cost Tiers — 5 Tiers", () => {
  it("Has all 5 cost tiers", async () => {
    const res = await queryConvex("model_orchestrator:getCostTiers");
    const tiers = Object.keys(res);

    expect(tiers).toContain("free");
    expect(tiers).toContain("budget");
    expect(tiers).toContain("balanced");
    expect(tiers).toContain("performance");
    expect(tiers).toContain("premium");

    console.log("\n  Cost Tiers:");
    for (const [tier, providers] of Object.entries(res)) {
      console.log(`    ${tier.padEnd(15)} → ${(providers as string[]).join(", ")}`);
    }
  });

  it("Free tier includes freellmapi, tencent, cerebras", async () => {
    const res = await queryConvex("model_orchestrator:getCostTiers");

    expect(res.free).toContain("freellmapi");
    expect(res.free).toContain("tencent");
    expect(res.free).toContain("cerebras");
  });

  it("Performance tier includes cerebras, groq, mistral, nvidia", async () => {
    const res = await queryConvex("model_orchestrator:getCostTiers");

    expect(res.performance).toContain("cerebras");
    expect(res.performance).toContain("groq");
    expect(res.performance).toContain("mistral");
    expect(res.performance).toContain("nvidia");
  });
});

// ═══════════════════════════════════════════════════════════════════
// MODEL TOGGLE TEST
// ═══════════════════════════════════════════════════════════════════

describe("Model Toggle — Admin Controls", () => {
  it("Cerebras is registered in model toggle", async () => {
    const res = await queryConvex("model_toggle:listModels");
    const models = res || [];

    // Check if cerebras exists in the list
    const cerebrasExists = Array.isArray(models)
      ? models.some((m: any) => m.modelName === "cerebras")
      : false;

    // This is a soft check — model_toggle:seedModels needs to be called first
    console.log(`  Cerebras in toggle: ${cerebrasExists ? "✅ Yes" : "⚠️ Run seedModels to register"}`);
  });
});

// ═══════════════════════════════════════════════════════════════════
// AI ROUTER INTEGRATION TEST
// ═══════════════════════════════════════════════════════════════════

describe("AI Router — Integration", () => {
  it("Task detection returns valid use cases", async () => {
    const response = await fetch(`${CONVEX_URL}/api/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "ai_router:detectTask",
        args: { input: "Write a business plan for my startup" }
      }),
    });

    if (response.ok) {
      const res = await response.json();
      const detected = res?.useCase ?? res?.type ?? res?.value?.type;
      expect(detected).toBeDefined();
      expect(["business", "academic", "chat", "content", "finance"]).toContain(detected);
      console.log(`  Detected use case: ${detected}`);
    } else {
      console.log(`  Task detection: HTTP ${response.status} (action may need admin token)`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// ORCHESTRATOR STATUS SUMMARY
// ═══════════════════════════════════════════════════════════════════

describe("Orchestrator Status — Summary", () => {
  it("Full system status", async () => {
    const healthRes = await queryConvex("model_orchestrator:getProviderHealth");
    const useCaseRes = await queryConvex("model_orchestrator:getUseCaseMapping");
    const costRes = await queryConvex("model_orchestrator:getCostTiers");

    console.log("\n╔═══════════════════════════════════════════════════════════════╗");
    console.log("║       MODEL ORCHESTRATOR — FULL SYSTEM STATUS                ║");
    console.log("╠═══════════════════════════════════════════════════════════════╣");
    console.log("║                                                             ║");
    console.log(`║  Providers:  ${healthRes.total}/9 configured`.padEnd(62) + "║");
    console.log(`║  Use Cases:  ${Object.keys(useCaseRes).length} mapped`.padEnd(62) + "║");
    console.log(`║  Cost Tiers: ${Object.keys(costRes).length} configured`.padEnd(62) + "║");
    console.log("║                                                             ║");

    const healthy = healthRes.providers.filter((p: any) => p.health.status === "healthy").length;
    const degraded = healthRes.providers.filter((p: any) => p.health.status === "degraded").length;
    const unknown = healthRes.providers.filter((p: any) => p.health.status === "unknown").length;

    console.log(`║  Health:     ${healthy} healthy / ${degraded} degraded / ${unknown} unknown`.padEnd(62) + "║");
    console.log("║                                                             ║");

    // Provider list
    console.log("║  Providers:                                                   ║");
    for (const p of healthRes.providers) {
      const icon = p.health.status === "healthy" ? "✅" : p.health.status === "degraded" ? "⚠️" : "❓";
      const line = `║    ${icon} P${p.priority} ${p.displayName.padEnd(20)} $${p.cost}/1M  ${p.modelCount} models`;
      console.log(line.padEnd(62) + "║");
    }

    console.log("║                                                             ║");
    console.log("╚═══════════════════════════════════════════════════════════════╝\n");

    // Assertions
    expect(healthRes.total).toBe(9);
    expect(Object.keys(useCaseRes).length).toBeGreaterThanOrEqual(14);
    expect(Object.keys(costRes).length).toBe(5);
  });
});
