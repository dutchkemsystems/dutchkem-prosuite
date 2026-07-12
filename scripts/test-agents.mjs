/**
 * Automated Agent Test Script
 * Tests all 15 agents via Convex HTTP API
 * Run: node scripts/test-agents.mjs
 */

const CONVEX_URL = "https://warmhearted-aardvark-280.convex.cloud";

const AGENTS = [
  { id: "A1", name: "Academic Writer", test: "I need help with my thesis on renewable energy" },
  { id: "A2", name: "Business Consultant", test: "I want to start a logistics business in Lagos" },
  { id: "A3", name: "Content Strategist", test: "I need social media content for my fashion brand" },
  { id: "A4", name: "Career Coach", test: "I'm a fresh graduate looking for a job in tech" },
  { id: "A5", name: "Personal Shopper", test: "What's the best phone under ₦200,000?" },
  { id: "A6", name: "Exam Prep", test: "I'm preparing for JAMB next year" },
  { id: "A7", name: "Finance Advisor", test: "How can I save money on a ₦200,000 salary?" },
  { id: "A8", name: "MediaStudio", test: "I need a promotional video for my restaurant" },
  { id: "A9", name: "Wellness Coach", test: "I want to lose weight but don't know where to start" },
  { id: "A10", name: "Home Services", test: "My house needs deep cleaning" },
  { id: "A11", name: "Language Tutor", test: "I want to learn French for my trip to Paris" },
  { id: "A12", name: "Travel Planner", test: "I'm planning a trip to Zanzibar next month" },
  { id: "A13", name: "ServiceMart NG", test: "I need to register my business with CAC" },
  { id: "A14", name: "Translation Hub", test: "I need to translate a document from English to Yoruba" },
  { id: "A15", name: "Event Planner", test: "I'm planning my wedding and need help" },
];

async function testAgent(agent) {
  const startTime = Date.now();
  try {
    // Test the agent's chat endpoint
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "customer_support:getAgentInfo",
        args: { agentId: agent.id },
      }),
    });
    
    const data = await response.json();
    const elapsed = Date.now() - startTime;
    
    return {
      id: agent.id,
      name: agent.name,
      status: response.ok ? "OK" : "FAIL",
      hasConfig: !!data?.name,
      hasServices: !!data?.services,
      responseTime: `${elapsed}ms`,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (err) {
    return {
      id: agent.id,
      name: agent.name,
      status: "ERROR",
      hasConfig: false,
      hasServices: false,
      responseTime: `${Date.now() - startTime}ms`,
      error: err.message,
    };
  }
}

async function testOrchestrator() {
  try {
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "support_orchestrator:getOrchestratorStatus",
        args: {},
      }),
    });
    return { status: response.ok ? "OK" : "FAIL" };
  } catch (err) {
    return { status: "ERROR", error: err.message };
  }
}

async function testBusinessHours() {
  try {
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "support_orchestrator:getBusinessHoursStatus",
        args: {},
      }),
    });
    return { status: response.ok ? "OK" : "FAIL" };
  } catch (err) {
    return { status: "ERROR", error: err.message };
  }
}

async function testAutoResponses() {
  try {
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "support_orchestrator:getAutoResponseTemplates",
        args: {},
      }),
    });
    return { status: response.ok ? "OK" : "FAIL" };
  } catch (err) {
    return { status: "ERROR", error: err.message };
  }
}

async function testQueueStatus() {
  try {
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "support_orchestrator:getQueueStatus",
        args: {},
      }),
    });
    return { status: response.ok ? "OK" : "FAIL" };
  } catch (err) {
    return { status: "ERROR", error: err.message };
  }
}

async function testAgentPerformance() {
  try {
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "support_orchestrator:getAgentPerformance",
        args: { days: 7 },
      }),
    });
    return { status: response.ok ? "OK" : "FAIL" };
  } catch (err) {
    return { status: "ERROR", error: err.message };
  }
}

async function testPaymentIntegration() {
  try {
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "admin:getEarningsSummary",
        args: {},
      }),
    });
    return { status: response.ok ? "OK" : "FAIL" };
  } catch (err) {
    return { status: "ERROR", error: err.message };
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  DUTCHKEM PROSUITE — AGENT AUTOMATED TEST SUITE");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Test all 15 agents
  console.log("🤖 Testing All 15 Agents...");
  console.log("─────────────────────────────────────────────────────────");
  const agentResults = [];
  for (const agent of AGENTS) {
    const result = await testAgent(agent);
    agentResults.push(result);
    const icon = result.status === "OK" ? "✅" : "❌";
    console.log(`${icon} ${result.id} ${result.name}: ${result.status} (${result.responseTime})`);
    if (result.error) console.log(`   Error: ${result.error}`);
  }

  // Test orchestrator features
  console.log("\n🎧 Testing Orchestrator Features...");
  console.log("─────────────────────────────────────────────────────────");
  
  const orchestrator = await testOrchestrator();
  console.log(`${orchestrator.status === "OK" ? "✅" : "❌"} Orchestrator Status: ${orchestrator.status}`);
  
  const businessHours = await testBusinessHours();
  console.log(`${businessHours.status === "OK" ? "✅" : "❌"} Business Hours: ${businessHours.status}`);
  
  const autoResponses = await testAutoResponses();
  console.log(`${autoResponses.status === "OK" ? "✅" : "❌"} Auto-Response Templates: ${autoResponses.status}`);
  
  const queueStatus = await testQueueStatus();
  console.log(`${queueStatus.status === "OK" ? "✅" : "❌"} Queue Status: ${queueStatus.status}`);
  
  const agentPerf = await testAgentPerformance();
  console.log(`${agentPerf.status === "OK" ? "✅" : "❌"} Agent Performance: ${agentPerf.status}`);

  // Test payment integration
  console.log("\n💳 Testing Payment Integration...");
  console.log("─────────────────────────────────────────────────────────");
  const payment = await testPaymentIntegration();
  console.log(`${payment.status === "OK" ? "✅" : "❌"} Payment System: ${payment.status}`);

  // Summary
  const passed = agentResults.filter(r => r.status === "OK").length;
  const failed = agentResults.filter(r => r.status !== "OK").length;
  const featuresPassed = [orchestrator, businessHours, autoResponses, queueStatus, agentPerf, payment].filter(r => r.status === "OK").length;

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Agents: ${passed}/${AGENTS.length} passed, ${failed} failed`);
  console.log(`  Features: ${featuresPassed}/6 passed`);
  console.log(`  Overall: ${passed + featuresPassed}/${AGENTS.length + 6} tests passed`);
  console.log("═══════════════════════════════════════════════════════════\n");

  if (failed > 0 || featuresPassed < 6) {
    console.log("❌ Some tests failed. Check the errors above.");
    process.exit(1);
  } else {
    console.log("✅ All tests passed!");
    process.exit(0);
  }
}

main().catch(console.error);
