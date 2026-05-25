import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'dist-ssr', 'build', '.vercel', '.cache',
  '.tanstack', '.output', '.nitro', 'logs', 'coverage',
]);

const KEY_PATTERNS = [
  { pattern: /sk_live_[a-zA-Z0-9]{16,}/, name: 'Stripe live secret key' },
  { pattern: /pk_live_[a-zA-Z0-9]{16,}/, name: 'Stripe live public key' },
  { pattern: /nvapi-[a-zA-Z0-9]{20,}/, name: 'NVIDIA NIM API key' },
  { pattern: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key ID' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/, name: 'GitHub Personal Access Token' },
  { pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, name: 'Private key block' },
];

const SKIP_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2',
  '.ttf', '.eot', '.mp4', '.webm', '.ogg', '.mp3', '.wav',
]);

let totalFiles = 0;
let findings = 0;

function scanDir(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(entry) && !entry.startsWith('.')) {
        scanDir(fullPath);
      }
    } else if (stat.isFile()) {
      const ext = extname(entry).toLowerCase();
      if (SKIP_EXTS.has(ext)) continue;
      if (entry === '.env' || entry.startsWith('.env.')) continue;

      totalFiles++;
      let content;
      try {
        content = readFileSync(fullPath, 'utf-8');
      } catch {
        continue;
      }

      for (const kp of KEY_PATTERNS) {
        const matches = content.match(kp.pattern);
        if (matches) {
          const lineNum = content.substring(0, matches.index).split('\n').length;
          const display = matches[0].length > 16
            ? matches[0].slice(0, 8) + '...' + matches[0].slice(-8)
            : matches[0];
          console.warn(`⚠  ${kp.name} found in ${fullPath}:${lineNum} (${display})`);
          findings++;
        }
      }
    }
  }
}

console.log('🔒 Security Audit — Hardcoded Key Scanner\n');
console.log(`Scanning: ${ROOT}\n`);
scanDir(ROOT);
console.log(`\n📊 Scanned ${totalFiles} files`);
if (findings === 0) {
  console.log('✅ No hardcoded API keys detected.');
} else {
  console.warn(`⚠️  ${findings} potential key(s) found — review and remove.`);
}
