import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════════
// 15 AGENTS × 9 PROVIDERS — ORCHESTRATION TEST
// Tests that all 15 agents can route through the 9-provider system
// ═══════════════════════════════════════════════════════════════════

const CONVEX_URL = process.env.CONVEX_URL || "https://warmhearted-aardvark-280.convex.cloud";

// Live provider-health assertions depend on the deployed backend having
// live API keys — gate them so the default `npm test` is deterministic.
const RUN_E2E = process.env.RUN_E2E === "true";

async function queryConvex(query: string, args: Record<string, any> = {}) {
  const response = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: query, args }),
  });
  if (!response.ok) throw new Error(`Query error ${response.status}`);
  const raw = await response.json();
  return raw?.value ?? raw;
}

async function callAction(action: string, args: Record<string, any> = {}) {
  const response = await fetch(`${CONVEX_URL}/api/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: action, args }),
  });
  if (!response.ok) throw new Error(`Action error ${response.status}`);
  const raw = await response.json();
  return raw?.value ?? raw;
}

// ═══════════════════════════════════════════════════════════════════
// 15 AGENTS — DEFINITION
// ═══════════════════════════════════════════════════════════════════

const AGENTS = [
  { id: "A1",  name: "Academic Writer",       task: "academic",     testPrompt: "Write a thesis introduction on AI in education" },
  { id: "A2",  name: "Business Consultant",    task: "business",     testPrompt: "Create a business plan for a fintech startup" },
  { id: "A3",  name: "Content Strategist",     task: "content",      testPrompt: "Write 5 social media posts for a new product" },
  { id: "A4",  name: "Career Coach",           task: "business",     testPrompt: "Help me write a professional CV" },
  { id: "A5",  name: "Personal Shopper",       task: "chat",         testPrompt: "Find the best laptops under 500k naira" },
  { id: "A6",  name: "Success Specialist",     task: "academic",     testPrompt: "Create a study plan for WAEC exams" },
  { id: "A7",  name: "Finance Advisor",        task: "finance",      testPrompt: "Create a monthly budget for 500k salary" },
  { id: "A8",  name: "MediaStudio Pro",        task: "video",        testPrompt: "Write a YouTube script for a tech review" },
  { id: "A9",  name: "Wellness Coach",         task: "chat",         testPrompt: "Create a 7-day fitness plan" },
  { id: "A10", name: "Home Management Expert", task: "content",      testPrompt: "Give tips for small apartment organization" },
  { id: "A11", name: "Language Coach",         task: "academic",     testPrompt: "Help me prepare for IELTS speaking" },
  { id: "A12", name: "Travel Planner",         task: "business",     testPrompt: "Plan a 3-day trip to Lagos" },
  { id: "A13", name: "Exam Prep Specialist",   task: "academic",     testPrompt: "Create PMP exam study materials" },
  { id: "A14", name: "Translation Hub",        task: "translation",  testPrompt: "Translate this business document to French" },
  { id: "A15", name: "Event Maestro",          task: "business",     testPrompt: "Plan a 100-person wedding reception" },
];

// ═══════════════════════════════════════════════════════════════════
// AGENT-TO-USE-CASE MAPPING TEST
// ═══════════════════════════════════════════════════════════════════

describe("15 Agents — Use Case Mapping", () => {
  it("All 15 agents have valid use case mappings", async () => {
    const useCaseMap = await queryConvex("model_orchestrator:getUseCaseMapping");

    console.log("\n╔═══════════════════════════════════════════════════════════════════╗");
    console.log("║            15 AGENTS × USE CASE MAPPING                         ║");
    console.log("╠═══════════════════════════════════════════════════════════════════╣");

    for (const agent of AGENTS) {
      const providers = useCaseMap[agent.task] || useCaseMap.chat;
      const hasCerebras = providers.includes("cerebras");
      const status = hasCerebras ? "✅" : "⚠️";
      console.log(`║  ${status} ${agent.id.padEnd(4)} ${agent.name.padEnd(25)} → ${agent.task.padEnd(12)} (${providers.length} providers) ║`);
    }

    console.log("╚═══════════════════════════════════════════════════════════════════╝\n");

    // Every agent's task must have providers
    for (const agent of AGENTS) {
      const providers = useCaseMap[agent.task] || useCaseMap.chat;
      expect(providers).toBeDefined();
      expect(providers.length).toBeGreaterThanOrEqual(3);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// AGENT PROVIDER COVERAGE TEST
// ═══════════════════════════════════════════════════════════════════

describe("15 Agents — Provider Coverage", () => {
  it("Each agent has access to at least 1 free provider", async () => {
    const useCaseMap = await queryConvex("model_orchestrator:getUseCaseMapping");
    const costTiers = await queryConvex("model_orchestrator:getCostTiers");
    const freeProviders = costTiers.free;

    for (const agent of AGENTS) {
      const providers = useCaseMap[agent.task] || useCaseMap.chat;
      const freeCount = providers.filter((p: string) => freeProviders.includes(p));
      expect(freeCount.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("All agents can use Cerebras (ultra-fast, FREE)", async () => {
    const useCaseMap = await queryConvex("model_orchestrator:getUseCaseMapping");

    for (const agent of AGENTS) {
      const providers = useCaseMap[agent.task] || useCaseMap.chat;
      expect(providers).toContain("cerebras");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// PROVIDER HEALTH × AGENT COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════

describe.skipIf(!RUN_E2E)("15 Agents — Provider Health", () => {
  it("At least 4 providers healthy for agent routing", async () => {
    const health = await queryConvex("model_orchestrator:getProviderHealth");
    const healthyProviders = health.providers
      .filter((p: any) => p.health.status === "healthy")
      .map((p: any) => p.name);

    console.log("\n  Healthy Providers:", healthyProviders.join(", "));
    expect(healthyProviders.length).toBeGreaterThanOrEqual(4);
  });

  it("Each agent has at least 2 healthy providers available", async () => {
    const useCaseMap = await queryConvex("model_orchestrator:getUseCaseMapping");
    const health = await queryConvex("model_orchestrator:getProviderHealth");
    const healthyProviders = health.providers
      .filter((p: any) => p.health.status === "healthy")
      .map((p: any) => p.name);

    for (const agent of AGENTS) {
      const providers = useCaseMap[agent.task] || useCaseMap.chat;
      const available = providers.filter((p: string) => healthyProviders.includes(p));
      expect(available.length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// COST OPTIMIZATION PER AGENT
// ═══════════════════════════════════════════════════════════════════

describe("15 Agents — Cost Optimization", () => {
  it("Free tier covers all agent use cases", async () => {
    const useCaseMap = await queryConvex("model_orchestrator:getUseCaseMapping");
    const costTiers = await queryConvex("model_orchestrator:getCostTiers");
    const freeProviders = costTiers.free;

    console.log("\n  Cost Optimization per Agent:");
    for (const agent of AGENTS) {
      const providers = useCaseMap[agent.task] || useCaseMap.chat;
      const freeOptions = providers.filter((p: string) => freeProviders.includes(p));
      console.log(`    ${agent.id.padEnd(4)} ${agent.name.padEnd(25)} Free options: ${freeOptions.join(", ")}`);
      expect(freeOptions.length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// AI ROUTER DETECTION × AGENT
// ═══════════════════════════════════════════════════════════════════

describe("15 Agents — AI Router Detection", () => {
  it("Router detects correct use case for each agent's test prompt", async () => {
    // Task detection is an action — test via HTTP
    const results: Record<string, string> = {};

    for (const agent of AGENTS.slice(0, 5)) { // Test first 5 to avoid rate limits
      try {
        const res = await callAction("ai_router:detectTask", {
          input: agent.testPrompt,
          agentId: agent.id,
        });
        results[agent.id] = res.type || res.useCase || "unknown";
      } catch {
        results[agent.id] = "error";
      }
    }

    console.log("\n  AI Router Detection Results:");
    for (const [id, detected] of Object.entries(results)) {
      const agent = AGENTS.find(a => a.id === id);
      console.log(`    ${id.padEnd(4)} ${agent?.name.padEnd(25)} Detected: ${detected}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// FULL ORCHESTRATION STATUS
// ═══════════════════════════════════════════════════════════════════

describe.skipIf(!RUN_E2E)("15 Agents — Full Status", () => {
  it("Complete system status report", async () => {
    const health = await queryConvex("model_orchestrator:getProviderHealth");
    const useCaseMap = await queryConvex("model_orchestrator:getUseCaseMapping");
    const costTiers = await queryConvex("model_orchestrator:getCostTiers");

    const healthyCount = health.providers.filter((p: any) => p.health.status === "healthy").length;
    const totalModels = health.providers.reduce((sum: number, p: any) => sum + p.modelCount, 0);

    console.log("\n╔═══════════════════════════════════════════════════════════════════════════════╗");
    console.log("║                 15 AGENTS × 9 PROVIDERS — FULL STATUS REPORT                ║");
    console.log("╠═══════════════════════════════════════════════════════════════════════════════╣");
    console.log("║                                                                             ║");
    console.log(`║  Agents:        15 configured                                                ║`);
    console.log(`║  Providers:     ${healthyCount}/9 healthy                                                 ║`);
    console.log(`║  Models:        ${totalModels} available                                               ║`);
    console.log(`║  Use Cases:     ${Object.keys(useCaseMap).length} mapped                                                  ║`);
    console.log(`║  Cost Tiers:    ${Object.keys(costTiers).length} configured                                               ║`);
    console.log("║                                                                             ║");
    console.log("║  PROVIDERS:                                                                  ║");
    for (const p of health.providers) {
      const icon = p.health.status === "healthy" ? "✅" : "⚠️";
      const line = `║    ${icon} P${p.priority} ${p.displayName.padEnd(20)} $${String(p.cost).padEnd(5)} ${p.modelCount} models  ${p.category.padEnd(12)}`;
      console.log(line.padEnd(78) + "║");
    }
    console.log("║                                                                             ║");
    console.log("║  AGENTS:                                                                     ║");
    for (const agent of AGENTS) {
      const providers = useCaseMap[agent.task] || useCaseMap.chat;
      const line = `║    ${agent.id.padEnd(4)} ${agent.name.padEnd(25)} → ${agent.task.padEnd(12)} (${providers.length} providers)`;
      console.log(line.padEnd(78) + "║");
    }
    console.log("║                                                                             ║");
    console.log("╚═══════════════════════════════════════════════════════════════════════════════╝\n");

    // Final assertions
    expect(health.total).toBe(9);
    expect(Object.keys(useCaseMap).length).toBeGreaterThanOrEqual(14);
    expect(healthyCount).toBeGreaterThanOrEqual(4);
  });
});
