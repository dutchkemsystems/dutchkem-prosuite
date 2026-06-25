const { Composio } = require("@composio/core");
const { execSync } = require("child_process");

const AGENT_ID = "A1";
const SAMPLE_MESSAGES = [
  "Hi, I need help with my thesis. What services do you offer?",
  "How much does a Masters thesis cost?",
  "Can you help with data analysis using SPSS?",
];

async function testAgent(agentId, message) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🤖 Testing ${agentId} (Academic Pro)`);
  console.log(`${"=".repeat(60)}`);
  console.log(`\n💬 User Message: "${message}"\n`);

  const args = {
    agentId: agentId,
    message: message,
    conversationHistory: [],
  };

  const argsStr = JSON.stringify(args).replace(/"/g, '\\"');

  try {
    const result = execSync(`npx convex run customer_support:generateSupportResponse "${argsStr}"`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      timeout: 60000,
    });

    const data = JSON.parse(result);

    if (data.success) {
      console.log(`✅ Response from ${data.agentName}:`);
      console.log(`${"─".repeat(60)}`);
      console.log(data.message);
      console.log(`${"─".repeat(60)}`);
      console.log(`\n📊 Model Used: ${data.modelUsed}`);
      console.log(`⏰ Timestamp: ${data.timestamp}`);
      if (data.fallback) {
        console.log(`⚠️  Used fallback model`);
      }
    } else {
      console.log(`❌ Error: ${data.error}`);
    }

    return data;
  } catch (e) {
    console.log(`❌ Error: ${e.message.substring(0, 200)}`);
    return null;
  }
}

async function main() {
  console.log("🧪 NVIDIA LLM Customer Support Test — Agent A1 (Academic Pro)");
  console.log("━".repeat(60));

  // Test with multiple messages to verify conversation works
  for (const message of SAMPLE_MESSAGES) {
    await testAgent(AGENT_ID, message);
    // Small delay between tests
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("\n" + "━".repeat(60));
  console.log("✅ All tests completed!");
  console.log("━".repeat(60));
}

main();
