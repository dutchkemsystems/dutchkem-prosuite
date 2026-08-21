#!/usr/bin/env node
/**
 * Checks that all process.env.* references in src/ and convex/ are
 * documented in .env.example. Fails CI if any are missing.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const envExamplePath = path.join(ROOT, '.env.example');

if (!fs.existsSync(envExamplePath)) {
  console.error('❌ .env.example not found');
  process.exit(1);
}

const envExample = fs.readFileSync(envExamplePath, 'utf8');
const definedVars = new Set(
  envExample
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[A-Z_][A-Z0-9_]*=/.test(l))
    .map((l) => l.split('=')[0])
);

function findRefs(dir) {
  const refs = new Set();
  if (!fs.existsSync(dir)) return refs;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '_generated' || entry.name === 'dist') continue;
      for (const r of findRefs(full)) refs.add(r);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      const matches = content.match(/process\.env\.([A-Z_][A-Z0-9_]*)/g) || [];
      for (const m of matches) refs.add(m.replace('process.env.', ''));
    }
  }
  return refs;
}

const allRefs = new Set([...findRefs(path.join(ROOT, 'src')), ...findRefs(path.join(ROOT, 'convex'))]);

// Exclude known auto-generated and internal vars
const exclude = new Set([
  'NODE_ENV',
  'CONVEX_DEPLOYMENT',
]);

const missing = [...allRefs].filter((v) => !definedVars.has(v) && !exclude.has(v));

if (missing.length > 0) {
  console.error(`\n❌ Missing environment variables in .env.example (${missing.length}):\n`);
  for (const v of missing.sort()) console.error(`  - ${v}`);
  console.error('\nAdd them to .env.example to pass this check.\n');
  process.exit(1);
}

console.log(`✅ All ${allRefs.size} environment variables are documented in .env.example`);
process.exit(0);
