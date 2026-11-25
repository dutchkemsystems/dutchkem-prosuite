/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Dutchkem Ventures Presents: Lagos Run — Hustle Empire
 * Build pipeline.
 *
 *   node build.js          → development build (unminified, unmodified game.js)
 *   node build.js --prod   → production build (terser + javascript-obfuscator)
 *
 * Required in .env at the package root (see .env.example):
 *   API_BASE_URL, ADMOB_REWARDED_ID, ADMOB_INTERSTITIAL_ID, APP_VERSION
 * Optional: SENTRY_DSN, KORAPAY_PUBLIC_KEY (publishable key — never a secret)
 *
 * The pipeline refuses to finish if any server-side secret pattern is found
 * anywhere in dist/, so a stray key can never ship to a player's browser.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const CLIENT = path.join(ROOT, 'client');
const DIST = path.join(ROOT, 'dist');
const ENV_PATH = path.join(ROOT, '.env');

const REQUIRED_VARS = ['API_BASE_URL', 'ADMOB_REWARDED_ID', 'ADMOB_INTERSTITIAL_ID', 'APP_VERSION'];
const CONFIG_VARS = REQUIRED_VARS.concat(['SENTRY_DSN', 'KORAPAY_PUBLIC_KEY']);

const STATIC_FILES = [
  'index.html',
  'styles.css',
  'manifest.json',
  'privacy.html',
  'terms.html',
  'consent.html',
  'robots.txt',
  'sitemap.xml',
  'game.js',
  'sw.js',
  'vercel.json',
];

const ICONS_DIR = 'icons';

const SCANNED_EXTENSIONS = ['.js', '.html', '.json', '.css', '.map'];

const SECRET_PATTERNS = [
  /SIGNING_SECRET/i,
  /KORAPAY_SECRET/i,
  /PRIVATE_KEY/i,
  /service_account/i,
  /APPLE_SHARED_SECRET/i,
  /GOOGLE_PLAY_SERVICE_ACCOUNT/i,
];

/* Production obfuscation flags. Kept as CLI flags (not an options object) so
 * the exact configuration is auditable in one place and matches the CLI docs.
 */
const OBFUSCATOR_FLAGS = [
  '--compact', 'true',
  '--control-flow-flattening', 'true',
  '--control-flow-flattening-threshold', '0.75',
  '--dead-code-injection', 'true',
  '--dead-code-injection-threshold', '0.4',
  '--string-array', 'true',
  '--string-array-encoding', 'base64',
  '--string-array-threshold', '0.75',
  '--split-strings', 'true',
  '--split-strings-chunk-length', '8',
  '--identifier-names-generator', 'hexadecimal',
  '--self-defending', 'true',
  '--disable-console-output', 'false',
];

/* ───────── helpers ───────── */

function log(message) {
  console.log('[build] ' + message);
}

function warn(message) {
  console.warn('[build] WARNING: ' + message);
}

function fail(message) {
  console.error('[build] FAILED: ' + message);
  process.exit(1);
}

function parseMode(argv) {
  const flags = argv.filter((arg) => arg.startsWith('-'));
  const unknown = flags.filter((flag) => flag !== '--prod' && flag !== '--dev');

  for (const flag of unknown) {
    warn('ignoring unknown flag ' + flag);
  }

  if (flags.indexOf('--prod') !== -1 && flags.indexOf('--dev') !== -1) {
    warn('both --prod and --dev were passed; building production');
  }

  return flags.indexOf('--prod') !== -1 ? 'prod' : 'dev';
}

function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) {
    fail('.env not found at ' + ENV_PATH + ' — copy .env.example to .env and fill it in.');
  }

  let dotenv;
  try {
    dotenv = require('dotenv');
  } catch (error) {
    fail('the "dotenv" package is not installed — run npm install first.');
  }

  const result = dotenv.config({ path: ENV_PATH });
  if (result.error) {
    fail('could not read .env: ' + result.error.message);
  }
}

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => {
    const value = process.env[key];
    return typeof value !== 'string' || value.trim() === '';
  });

  if (missing.length > 0) {
    fail(
      'missing required environment variable' + (missing.length > 1 ? 's' : '') +
      ' in .env: ' + missing.join(', ')
    );
  }
}

function resetDist() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
}

function copyStatic() {
  const missing = STATIC_FILES.filter((file) => !fs.existsSync(path.join(CLIENT, file)));
  if (missing.length > 0) {
    throw new Error('missing static file(s) in client/: ' + missing.join(', '));
  }

  for (const file of STATIC_FILES) {
    fs.cpSync(path.join(CLIENT, file), path.join(DIST, file));
  }

  const iconsSource = path.join(CLIENT, ICONS_DIR);
  if (!fs.existsSync(iconsSource)) {
    throw new Error('client/' + ICONS_DIR + '/ is missing — run "npm run icons" first.');
  }
  fs.cpSync(iconsSource, path.join(DIST, ICONS_DIR), { recursive: true });

  log('copied ' + STATIC_FILES.length + ' static files + ' + ICONS_DIR + '/');
}

function writeConfig() {
  const config = {};
  for (const key of CONFIG_VARS) {
    config[key] = (process.env[key] || '').trim();
  }
  config.BUILD_TIME = new Date().toISOString();

  const body = [
    '/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */',
    '',
    '/* Auto-generated by build.js — do not edit by hand. Public values only. */',
    '',
    'window.DUTCHKEM_CONFIG = ' + JSON.stringify(config, null, 2) + ';',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(DIST, 'config.js'), body, 'utf8');
  log('wrote config.js (' + config.APP_VERSION + ')');
}

function npx(binary, args) {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  execFileSync(command, ['--no-install', binary].concat(args), {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

function minify(target) {
  const output = target + '.min.js';
  npx('terser', [target, '--compress', '--mangle', '--format', 'comments=false', '--output', output]);

  if (!fs.existsSync(output)) {
    throw new Error('terser produced no output for ' + path.basename(target));
  }

  fs.renameSync(output, target);
  log('minified game.js → ' + (fs.statSync(target).size / 1024).toFixed(1) + ' KB');
}

function obfuscate(target) {
  const output = target + '.min.js';
  npx('javascript-obfuscator', [target].concat(OBFUSCATOR_FLAGS, ['--output', output]));

  if (!fs.existsSync(output)) {
    throw new Error('javascript-obfuscator produced no output for ' + path.basename(target));
  }

  fs.renameSync(output, target);
}

function buildGame(mode) {
  const gamePath = path.join(DIST, 'game.js');
  if (!fs.existsSync(gamePath)) {
    throw new Error('client/game.js is missing');
  }

  if (mode !== 'prod') {
    log('game.js copied unmodified (' + (fs.statSync(gamePath).size / 1024).toFixed(1) + ' KB)');
    return;
  }

  /* Terser writes game.js.min.js, which javascript-obfuscator then consumes.
   * The intermediate file is always removed, even when a step throws.
   */
  const intermediate = gamePath + '.min.js';
  try {
    minify(gamePath);
    log('obfuscating game.js (control-flow flattening, string array, self-defending)');
    obfuscate(gamePath);
  } finally {
    if (fs.existsSync(intermediate)) fs.rmSync(intermediate, { force: true });
  }

  log('game.js → ' + (fs.statSync(gamePath).size / 1024).toFixed(1) + ' KB (obfuscated)');
}

function versionServiceWorker() {
  const swPath = path.join(DIST, 'sw.js');
  const source = fs.readFileSync(swPath, 'utf8');
  const appVersion = process.env.APP_VERSION.trim();
  const hash = crypto.createHash('sha256').update(String(Date.now())).digest('hex').slice(0, 8);
  const cacheVersion = 'dutchkem-v' + appVersion + '-' + hash;

  const replaced = source.replace(
    /const CACHE_VERSION = '[^']*';/,
    "const CACHE_VERSION = '" + cacheVersion + "';"
  );

  if (replaced === source) {
    throw new Error('CACHE_VERSION line not found in sw.js — refusing to ship a stale cache');
  }

  fs.writeFileSync(swPath, replaced, 'utf8');
  log('service worker cache → ' + cacheVersion);
  return cacheVersion;
}

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function scanForSecrets() {
  const offences = [];

  for (const file of walk(DIST, [])) {
    if (SCANNED_EXTENSIONS.indexOf(path.extname(file).toLowerCase()) === -1) continue;

    const contents = fs.readFileSync(file, 'utf8');
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(contents)) {
        offences.push(path.relative(DIST, file) + ' matched ' + pattern);
        break;
      }
    }
  }

  if (offences.length > 0) {
    console.error('[build] SECRET SCAN FAILED — these files must not ship:');
    for (const offence of offences) console.error('  ✗ ' + offence);
    process.exit(1);
  }

  log('secret scan clean');
}

function summarize(mode, cacheVersion) {
  const files = walk(DIST, []);
  const bytes = files.reduce((total, file) => total + fs.statSync(file).size, 0);

  console.log('');
  log('──────────────────────────────────────────────');
  log('mode      : ' + (mode === 'prod' ? 'PRODUCTION (obfuscated)' : 'DEV (unminified)'));
  log('version   : ' + process.env.APP_VERSION.trim() + '  (' + cacheVersion + ')');
  log('output    : ' + DIST);
  log('files     : ' + files.length);
  log('size      : ' + (bytes / 1024).toFixed(1) + ' KB');
  log('built at  : ' + new Date().toISOString());
  log('──────────────────────────────────────────────');
  log('© 2026 Dutchkem Ventures. All rights reserved.');
}

/* ───────── entry point ───────── */

function main() {
  const mode = parseMode(process.argv.slice(2));

  if (!fs.existsSync(CLIENT)) {
    fail('client/ directory is missing');
  }

  loadEnv();
  validateEnv();

  log('building in ' + mode + ' mode');

  resetDist();
  copyStatic();
  writeConfig();
  buildGame(mode);
  const cacheVersion = versionServiceWorker();
  scanForSecrets();
  summarize(mode, cacheVersion);
}

try {
  main();
} catch (error) {
  fail(error && error.message ? error.message : String(error));
}
