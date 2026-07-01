const { ConvexClient } = require("convex/browser");

async function main() {
  const client = new ConvexClient("https://warmhearted-aardvark-280.convex.cloud");
  let pass = 0, fail = 0;
  const ok = (n, r) => { if (r) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}`); } };

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  MODEL USAGE ANALYTICS — TEST SUITE");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // 1. Log simulated usage data
  console.log("TEST 1: Log Usage Data");
  const usageData = [
    { modelName: "groq", taskType: "chat", input: "Hello, how are you?", success: true, responseTimeMs: 120, tokenCount: 45 },
    { modelName: "groq", taskType: "content", input: "Write a blog post", success: true, responseTimeMs: 350, tokenCount: 120 },
    { modelName: "groq", taskType: "chat", input: "Help me", success: false, responseTimeMs: 5000, errorMessage: "Timeout" },
    { modelName: "openrouter", taskType: "academic", input: "Write a thesis on AI", success: true, responseTimeMs: 800, tokenCount: 350 },
    { modelName: "openrouter", taskType: "business", input: "Business plan for SME", success: true, responseTimeMs: 650, tokenCount: 280 },
    { modelName: "openrouter", taskType: "analysis", input: "Analyze market trends", success: true, responseTimeMs: 400, tokenCount: 200 },
    { modelName: "mimo", taskType: "design", input: "Design a flyer", success: true, responseTimeMs: 1200, tokenCount: 50 },
    { modelName: "mimo", taskType: "agentic", input: "Execute task autonomously", success: true, responseTimeMs: 2500, tokenCount: 150 },
    { modelName: "mimo", taskType: "audio", input: "Generate voiceover", success: true, responseTimeMs: 1800, tokenCount: 80 },
    { modelName: "nvidia", taskType: "analysis", input: "Complex reasoning task", success: true, responseTimeMs: 900, tokenCount: 400 },
    { modelName: "nvidia", taskType: "business", input: "Financial analysis", success: false, responseTimeMs: 3000, errorMessage: "Rate limit" },
    { modelName: "groq", taskType: "content", input: "Generate ad copy", success: true, responseTimeMs: 200, tokenCount: 60 },
    { modelName: "openrouter", taskType: "video", input: "Write video script", success: true, responseTimeMs: 500, tokenCount: 180 },
    { modelName: "aiml", taskType: "design", input: "Generate logo image", success: true, responseTimeMs: 4500, tokenCount: 0 },
    { modelName: "groq", taskType: "chat", input: "Good morning", success: true, responseTimeMs: 80, tokenCount: 20 },
  ];

  for (const u of usageData) {
    await client.mutation("model_analytics:logUsagePublic", u);
  }
  ok("Logged 15 usage entries", true);

  // 2. Overview stats
  console.log("\nTEST 2: Overview Stats");
  const overview = await client.query("model_analytics:getOverview", {});
  ok(`Total: ${overview.total}`, overview.total >= 15);
  ok(`Success rate: ${overview.successRate}%`, parseFloat(overview.successRate) > 50);
  ok(`Avg response time: ${overview.avgResponseTime}ms`, overview.avgResponseTime > 0);
  ok(`By model breakdown exists`, Object.keys(overview.byModel).length > 0);
  ok(`By task breakdown exists`, Object.keys(overview.byTask).length > 0);
  ok(`Hourly trend exists`, Object.keys(overview.hourlyTrend).length === 24);

  // 3. Model performance
  console.log("\nTEST 3: Model Performance");
  const perf = await client.query("model_analytics:getModelPerformance", {});
  ok(`5 models in performance`, perf.length === 5);
  const groqPerf = perf.find(p => p.model === "groq");
  ok(`GROQ has ${groqPerf.total} calls`, groqPerf.total >= 4);
  ok(`GROQ success rate: ${groqPerf.successRate}%`, parseFloat(groqPerf.successRate) > 50);
  ok(`GROQ avg time: ${groqPerf.avgResponseTime}ms`, groqPerf.avgResponseTime > 0);

  const mimoPerf = perf.find(p => p.model === "mimo");
  ok(`MiMo has ${mimoPerf.total} calls`, mimoPerf.total >= 2);
  ok(`MiMo all success`, parseFloat(mimoPerf.successRate) === 100);

  // 4. Task distribution
  console.log("\nTEST 4: Task Distribution");
  const tasks = await client.query("model_analytics:getTaskDistribution", {});
  ok(`Multiple task types`, Object.keys(tasks).length >= 5);
  ok(`chat task exists`, !!tasks.chat);
  ok(`design task uses mimo`, !!tasks.design?.byModel?.mimo);
  ok(`academic task uses openrouter`, !!tasks.academic?.byModel?.openrouter);

  // 5. Recent usage
  console.log("\nTEST 5: Recent Usage");
  const recent = await client.query("model_analytics:getRecentUsage", { limit: 10 });
  ok(`Recent entries: ${recent.length}`, recent.length >= 10);
  ok(`Has model name`, recent[0].modelName);
  ok(`Has task type`, recent[0].taskType);
  ok(`Has success status`, recent[0].success !== undefined);
  ok(`Has response time`, recent[0].responseTimeMs > 0);

  // Summary
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`  RESULTS: ${pass} passed, ${fail} failed`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("Analytics Dashboard Tabs:");
  console.log("  📊 Overview — KPIs, model breakdown, hourly trend");
  console.log("  ⚡ Model Performance — success rate, avg/P95 latency, errors");
  console.log("  🎯 Task Distribution — requests per task type, per model");
  console.log("  📋 Recent Usage — last 50 requests with details");

  client.close();
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
