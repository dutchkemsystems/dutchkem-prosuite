const { execSync } = require('child_process');
const fs = require('fs');

const platforms = ["x", "tiktok", "pinterest"];

for (const platform of platforms) {
  console.log(`\n--- ${platform.toUpperCase()} OAuth URL ---`);

  // Write args to temp file
  const args = JSON.stringify({ platform });
  fs.writeFileSync('temp_args.json', args);

  try {
    // Use stdin redirect
    const result = execSync('type temp_args.json | npx convex run social:generateOAuthUrl', {
      encoding: 'utf-8',
      cwd: process.cwd(),
      timeout: 30000,
      shell: true,
    });
    console.log(result);
  } catch (e) {
    console.log(`Error: ${e.stderr || e.message}`.substring(0, 300));
  }
}

// Clean up
try { fs.unlinkSync('temp_args.json'); } catch {}
