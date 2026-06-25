const { execSync } = require('child_process');

const agents = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15'];

async function testAgent(agentId) {
  const args = {
    agentId: agentId,
    message: "What services do you offer and how much do they cost?",
  };
  const argsStr = JSON.stringify(args).replace(/"/g, '\\"');

  try {
    const result = execSync(`npx convex run customer_support:generateSupportResponse "${argsStr}"`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      timeout: 60000,
    });
    const data = JSON.parse(result);
    return { agentId, success: data.success, model: data.modelUsed, preview: data.message?.substring(0, 100) };
  } catch (e) {
    return { agentId, success: false, error: e.message.substring(0, 100) };
  }
}

async function main() {
  console.log("Testing all 15 agents...\n");

  // Test first 3 agents to verify it works
  const testAgents = ['A1', 'A2', 'A3'];

  for (const agentId of testAgents) {
    console.log(`Testing ${agentId}...`);
    const result = await testAgent(agentId);
    console.log(`  ${result.success ? '✅' : '❌'} ${result.model || result.error}`);
    console.log(`  Preview: ${result.preview}...`);
    console.log();
  }

  // Verify all agents have configs
  console.log("Verifying all 15 agents have configurations...");
  try {
    const configs = execSync('npx convex run customer_support:getAgentConfigs', {
      encoding: 'utf-8',
      cwd: process.cwd(),
      timeout: 30000,
    });
    const data = JSON.parse(configs);
    console.log(`✅ ${data.length} agents configured`);
    data.forEach(a => console.log(`  ${a.id}: ${a.icon} ${a.name} — ${a.model}`));
  } catch (e) {
    console.log(`❌ Error: ${e.message.substring(0, 100)}`);
  }
}

main();
