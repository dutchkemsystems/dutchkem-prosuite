const { execSync } = require('child_process');

// Test listing available tools
const cmd = `npx convex run test_composio_v3:listTools`;
console.log("Listing available tools...");

try {
  const result = execSync(cmd, {
    encoding: 'utf-8',
    cwd: process.cwd()
  });
  console.log(result);
} catch (e) {
  console.error(e.stderr || e.message);
}
