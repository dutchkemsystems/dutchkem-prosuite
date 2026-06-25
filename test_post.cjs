const { execSync } = require('child_process');

console.log("Testing Composio v3 LinkedIn post...");

try {
  // Use node -e to properly handle JSON escaping
  const result = execSync(`node -e "const {execSync}=require('child_process'); const r=execSync('npx convex run test_composio_v3:postViaComposio',{input:JSON.stringify({platform:'linkedin',content:'Test post from Dutchkem Pro Suite - AI Business Automation'}),encoding:'utf-8',timeout:120000}); console.log(r);"`, {
    encoding: 'utf-8',
    cwd: process.cwd(),
    timeout: 180000
  });
  console.log(result);
} catch (e) {
  console.error(e.stderr || e.message);
}
