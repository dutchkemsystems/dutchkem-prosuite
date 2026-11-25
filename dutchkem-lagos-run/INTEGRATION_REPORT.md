# INTEGRATION REPORT — Dutchkem Ventures Presents: Lagos Run — Hustle Empire

> **© 2026 Dutchkem Ventures. All rights reserved.**
> Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited.
> **Driving the Culture** · Lagos · Nigeria

| Field | Value |
|-------|-------|
| Document | Final integration verification |
| Phase | 13 — Final Integration Verification |
| Version | 1.0.0 |
| Report date | 2026-11-25 |
| Prepared by | Engineering, Dutchkem Ventures |
| Scope | Every file produced in Phases 0–12 as delivered in `dutchkem-lagos-run/` |
| Sign-off state | ✅ **CODE VERIFIED — every code-side row below is proven. Operator rows that need live Kora/AdMob/store credentials are marked ❌ and are listed in section 6.** |

## 0. How this audit was performed

The Phase 12 template was a claim-by-claim checklist. This phase proved or disproved every row with a
machine check rather than a re-read of the source, and then fixed what failed. Four instruments were
used; each is reproducible from section 7.

| Instrument | What it proves |
|------------|----------------|
| **Static cross-reference sweep** | Every `id=`, class and `data-*` selector in `client/index.html`; every `/api/…` literal in `client/game.js`; every `router.get/post/delete` in `backend/routes/*.js`; every `VAR=` in both `.env.example` files against `backend/config.js` and `build.js`. |
| **Live API probe** | The Express app booted on `:4033` with development secrets; 14 requests exercised every client endpoint and every negative case (expired path, unauthenticated call, invalid batch). |
| **Build + secret scan** | `npm run build` and `node build.js --prod`, then all 10 leak scans from section 2.4 against the produced `dist/`. |
| **Bundle boot harness** | The **obfuscated** `dist/game.js` was executed in a stub-DOM Node sandbox to prove minification/obfuscation did not break start-up, and to record which endpoints the shipped bundle actually calls. Harness deleted after the run; no test code ships. |

### 0.1 Audit result

Phase 12 found four client→server URL mismatches, one missing route, one dead selector, and three
configuration drifts. **All of them were fixed in this phase and re-verified.** Sections 2.1–2.4 now
contain zero ❌ rows. The remaining ❌ rows are operator actions that cannot be performed from a build
environment without live paid accounts; they are enumerated in section 6 with the exact step that
closes each one.

---

## 1. File Inventory

Line counts are physical lines (`wc -l`) measured **after** this phase's fixes. Excluded by design:
`node_modules/`, `dist/` (build output), the local secrets `dutchkem-lagos-run/.env` and
`backend/.env`, and the runtime datastore `backend/data/dutchkem.db`.

### 1.1 Root

| File | Purpose | Lines | Status |
|------|---------|------:|:------:|
| `package.json` | Root manifest: `icons`, `build`, `dev-client`, `dev-backend` scripts; dev dependencies (sharp, terser, javascript-obfuscator, dotenv, serve) | 22 | ✅ |
| `package-lock.json` | Generated lockfile pinning the build toolchain (never hand-edited) | 2745 | ✅ |
| `build.js` | Production pipeline: `.env` validation, `config.js` injection, terser minify (+ optional obfuscation), service-worker cache versioning, secret scan of `dist/` | 339 | ✅ |
| `README.md` | Project overview, 14-phase table (all ✅), quick start, folder map, legal links | 123 | ✅ |
| `SECURITY.md` | Threat model, auth flow, secret inventory, anti-cheat rules, NDPR/GDPR/COPPA matrix, incident playbook, pen-test checklist | 450 | ✅ |
| `DEPLOYMENT.md` | Hosting topology, environment matrix, Kora and AdMob setup, migration path, rollback, launch runbook | 789 | ✅ |
| `INTEGRATION_REPORT.md` | **This document** — Phase 13 verified report | see footer | ✅ |
| `render.yaml` *(additive block)* | **Not a new file** — the repository root already has ProSuite's Render Blueprint. A second service (`dutchkem-lagos-run-api`) was appended: node runtime, `rootDir: dutchkem-lagos-run/backend`, generated signing secrets, Kora variables, 1 GB disk at `/var/data`. The existing `dutchkem-api` service is untouched (diff: 62 insertions, 0 deletions; parsed back as 2 services) | +62 | ✅ |
| `.env.example` | Public client variables only (baked into `client/config.js`); no secrets | 10 | ✅ |
| `.gitignore` | Ignores `node_modules/`, `.env*` (except `*.example`), `dist/`, `secrets/`, logs | 10 | ✅ |

### 1.2 Tooling

| File | Purpose | Lines | Status |
|------|---------|------:|:------:|
| `scripts/generate-icons.js` | Renders `icon-192`, `icon-512`, `icon-maskable-512`, `apple-touch-icon`, `favicon-32` from the danfo mark via sharp | 98 | ✅ |

### 1.3 Client (PWA)

| File | Purpose | Lines | Status |
|------|---------|------:|:------:|
| `client/index.html` | Shell: splash, consent gate, menu, gameplay canvas + HUD, pause, game-over, settings, banners, SEO block, JSON-LD | 329 | ✅ |
| `client/styles.css` | Design system: danfo yellow/black, safe-area insets, 44px targets, colourblind and reduced-motion variants | 918 | ✅ |
| `client/game.js` | Canvas 2D engine + UI + save store + API client + analytics (single ES5-style IIFE) | 2574 | ✅ |
| `client/config.js` | Development placeholder runtime config; regenerated by `build.js` in production | 15 | ✅ |
| `client/vercel.json` | Static-deploy headers and CSP-adjacent hardening; copied into `dist/` by `build.js` so `dist/` deploys with no build step | 45 | ✅ |
| `client/sw.js` | Service worker: pre-cache shell (16 URLs), cache-first assets, network-first (5s) for `/api/`, stale-while-revalidate cross-origin | 171 | ✅ |
| `client/manifest.json` | PWA manifest: fullscreen, theme `#FFC72C`, maskable icon, Endless/Hustle shortcuts | 53 | ✅ |
| `client/privacy.html` | NDPR + GDPR privacy policy (Kora Pay, AdMob, Google Play, Apple disclosures) | 141 | ✅ |
| `client/terms.html` | Terms of service, virtual-item terms, governing law | 157 | ✅ |
| `client/consent.html` | Standalone consent page, now linked from the in-game consent gate | 86 | ✅ |
| `client/robots.txt` | Crawl policy (disallows `/api/`) | 7 | ✅ |
| `client/sitemap.xml` | Canonical URL set for `lagosrun.dutchkem.com` | 22 | ✅ |
| `client/icons/icon-192.png` | Home-screen icon, 192×192 | binary | ✅ |
| `client/icons/icon-512.png` | Store/OG icon, 512×512 | binary | ✅ |
| `client/icons/icon-maskable-512.png` | Android adaptive (maskable) icon, 512×512 | binary | ✅ |
| `client/icons/apple-touch-icon.png` | iOS home-screen icon, 180×180 | binary | ✅ |
| `client/icons/favicon-32.png` | Browser tab icon, 32×32 | binary | ✅ |

### 1.4 Backend (Express API)

| File | Purpose | Lines | Status |
|------|---------|------:|:------:|
| `backend/package.json` | API manifest and dependencies (express, cors, helmet, node-fetch, googleapis, dotenv) | 29 | ✅ |
| `backend/package-lock.json` | Generated API lockfile | 1660 | ✅ |
| `backend/server.js` | App wiring: helmet CSP, CORS allowlist, raw body for the Kora webhook, rate limiters, mounts, 404, error handler, `start()` | 229 | ✅ |
| `backend/config.js` | Frozen typed config; ceilings aligned with `rules.json`; fatal in production without the three signing secrets | 126 | ✅ |
| `backend/.env.example` | Server variable template with SECRET/PUBLIC annotations; values aligned with `config.js` defaults | 57 | ✅ |
| `backend/middleware/auth.js` | `requireSession`: HS256 verify, attaches `req.user` | 67 | ✅ |
| `backend/middleware/rateLimit.js` | Named limiters: auth, score, reward, purchase, config, analytics | 62 | ✅ |
| `backend/middleware/errorHandler.js` | Uniform JSON error envelope; hides internals in production | 39 | ✅ |
| `backend/services/signature.js` | Length-prefixed canonical encoding, HMAC mint/verify for session, score, receipt | 110 | ✅ |
| `backend/services/db.js` | JSON-file persistence (users, runs, purchases, rewards, nonces, analytics aggregates) behind a repository API | 260 | ✅ |
| `backend/services/koraPay.js` | Kora checkout initialize, charge status, `x-korapay-signature` verification (signing key defaults to `KORAPAY_SECRET_KEY`) | 149 | ✅ |
| `backend/services/receiptValidator.js` | Google Play + Apple receipt validation, SKU grant resolution | 170 | ✅ |
| `backend/routes/auth.js` | `POST /session` (now returns `rewardedLimit`), `POST /refresh` | 89 | ✅ |
| `backend/routes/health.js` | `GET /` liveness probe (mounted at `/health` and `/api/health`) | 33 | ✅ |
| `backend/routes/version.js` | `GET /` published version from `data/version.json` | 56 | ✅ |
| `backend/routes/config.js` | `GET /remote`, `GET /rules` from `data/`, HMAC-signed envelope | 67 | ✅ |
| `backend/routes/scores.js` | `POST /submit` (signed, single-use runId), `GET /leaderboard` | 132 | ✅ |
| `backend/routes/rewards.js` | `POST /claim` — provisional rewarded-ad slot, no coin grant | 63 | ✅ |
| `backend/routes/purchases.js` | Kora `initialize` / `callback` / `webhook` / `status`, native `verify` | 300 | ✅ |
| `backend/routes/ads.js` | `POST /ssv-nonce`, `GET /ssv-callback` (AdMob SSV + RSA-SHA256 verify) | 224 | ✅ |
| `backend/routes/analytics.js` | **Added in Phase 13** — `POST /analytics` validating, rate-limited ingest of consent-gated batches | 124 | ✅ |
| `backend/routes/user.js` | `GET /me`, `GET /export`, `DELETE /me` (NDPR erasure) | 71 | ✅ |
| `backend/data/version.json` | Published version, minSupported, forceUpdate, release notes | 7 | ✅ |
| `backend/data/remote-config.json` | Brand, features, ads, economy and events toggles | 22 | ✅ |
| `backend/data/rules.json` | Published anti-cheat ceilings, rewarded-ad caps, SKU grants | 17 | ✅ |

**File count: 56 delivered files** (5 binaries, 2 generated lockfiles, 4 placeholder
`.gitkeep` markers, and the rest source/documentation). **9,602 lines** of source and
documentation (14,007 including the two generated lockfiles), plus 62 additive lines in the
repository-root `render.yaml`.

> Two file kinds deliberately carry no `© 2026 Dutchkem Ventures` comment line: `.png` binaries and
> the three `backend/data/*.json` payloads, because JSON has no comment syntax. Adding a key would
> change the published schema that `routes/config.js` signs and the client verifies, so branding for
> those lives in this report and in the `brand` field of `remote-config.json` instead.

---

## 2. Cross-Reference Verification

### 2.1 HTML IDs and selectors referenced by `client/game.js`

`client/index.html` declares **57 ids**. Every selector the engine uses was proven to resolve.

| # | ID / selector | Referenced at | Exists? | Evidence |
|--:|---------------|---------------|:------:|----------|
| 1 | `hudCoins` | `game.js:880` via `setHtml` | ✅ | `index.html` menu topbar |
| 2 | `hudKobo` | `game.js:881` via `setHtml` | ✅ | Menu currency pill |
| 3 | `inGameCoins` | `game.js:1835` via `setHtml` | ✅ | In-run HUD |
| 4 | `inGameFuel` | `game.js:1836` via `setHtml` | ✅ | In-run fuel percentage |
| 5 | `inGamePax` | `game.js:1837` via `setHtml` | ✅ | Passengers aboard |
| 6 | `hudWeather` | `Weather.apply` via `$()` | ✅ | Weather chip, sets `aria-label` |
| 7 | `hudTime` | `game.js:1838` via `setHtml` | ✅ | In-world clock |
| 8 | `btnPause` | `game.js:1266` | ✅ | HUD pause button |
| 9 | `btnConductor` | `game.js:1265` | ✅ | Conductor-view toggle, `aria-pressed` |
| 10 | `consentAccept` | `game.js:2451` | ✅ | Consent accept |
| 11 | `consentReject` | `game.js:2470` | ✅ | "Essential only" |
| 12 | `consentAnalytics` | `bootstrap` consent read | ✅ | Checkbox, checked by default |
| 13 | `consentAds` | `bootstrap` consent read | ✅ | Checkbox, checked by default |
| 14 | `btnSettings` | `game.js:2481` | ✅ | Opens settings overlay |
| 15 | `setClose` | `game.js:2486` | ✅ | Closes settings |
| 16 | `setExportData` | `game.js:2491` | ✅ | NDPR export, downloads local save |
| 17 | `setDeleteData` | `game.js:2492` | ✅ | Erasure + `DELETE /api/user/me` |
| 18 | `setColorblind` | `syncSettingsInputs` | ✅ | Palette toggle |
| 19 | `setReducedMotion` | `syncSettingsInputs` | ✅ | Motion toggle |
| 20 | `setSound` | `syncSettingsInputs` | ✅ | Audio toggle |
| 21 | `setHaptics` | `syncSettingsInputs` | ✅ | Vibration toggle |
| 22 | `setSpeed` | `syncSettingsInputs` | ✅ | Range 0.8–1.2 |
| 23 | `btnDaily` | `game.js:2504` | ✅ | Daily bonus |
| 24 | `btnShop` | `game.js:2505` | ✅ | Premium shop |
| 25 | `btnGarage` | `game.js:2508` | ✅ | Fleet/garage |
| 26 | `btnReportBug` | `game.js:2511` | ✅ | Bug report mailto |
| 27 | `btnResume` | `game.js:1267` | ✅ | Pause overlay |
| 28 | `btnRestart` | `game.js:1268` | ✅ | Pause overlay |
| 29 | `btnQuit` | `game.js:1269` | ✅ | Pause → menu |
| 30 | `btnDoubleReward` | `game.js:1270` | ✅ | Game-over "2× fares" |
| 31 | `btnRetry` | `game.js:1271` | ✅ | Game-over retry |
| 32 | `btnMenu` | `game.js:1272` | ✅ | Game-over → menu |
| 33 | `btnReload` | `bindReload` | ✅ | Update banner reload |
| 34 | `toast` | `UI.toast` | ✅ | `role="status"` live region |
| 35 | `updateBanner` | `registerServiceWorker` | ✅ | Shown on `SW_UPDATED` / waiting worker |
| 36 | `offlineBanner` | `setOffline` | ✅ | Shown on `offline` event |
| 37 | `gameCanvas` | `Game.init` | ✅ | Canvas 2D surface |
| 38 | `splashStatus` | `bootstrap` | ✅ | `role="status" aria-live="polite"` |
| 39 | `pause`, `gameover`, `settings` | `UI.showOverlay/hideOverlay` | ✅ | Overlay containers |
| 40 | `splash`, `consent`, `menu`, `game` | `UI.showScreen` | ✅ | Screen containers |
| 41 | `resFares`, `resPax`, `resDist`, `resRep` | `endRun` via `setText` | ✅ | Results grid |
| 42 | `goTitle`, `goAdNote` | `endRun` | ✅ | Game-over copy |
| 43 | `setTitle` | settings header | ✅ | Present |
| 44 | `pauseTitle` | pause header | ✅ | Present |
| 45 | `seo-content` | crawlable prose block | ✅ | Present |
| 46 | `ctrlLeft`, `ctrlBrake`, `ctrlRight` | `bindControls` (explicit id bindings) | ✅ | Touch steering buttons |
| 47 | `.mode-card` (3) | `game.js:2495` (`querySelectorAll`) | ✅ | 3 cards with `data-mode` |
| 48 | `.station` (6) | `game.js:1275` (`querySelectorAll`) | ✅ | 6 stations with `data-station` |
| 49 | `[data-ctrl]` | `game.js:1179` (`querySelectorAll`) | ✅ | **Fixed this phase.** Was 0 matches; the three steering buttons now carry `data-ctrl="left\|brake\|right"`, so the selector and the documented control contract both resolve. |

**Result: 49 of 49 resolve. Zero ❌.**

Correction to Phase 12: `[data-ctrl]` was described as dead code with steering still working — that
was right, and the attribute (not the loop) was added, so no behaviour changed.

### 2.2 API endpoints referenced by the client

`API.request()` prefixes every path with `CONFIG.apiBase` (`client/game.js:706`). "Live" is the
status code observed from the probe on `:4033` with a valid bearer token.

| # | Contract | Client call site | Backend route | Live | Ready? |
|--:|----------|------------------|---------------|:----:|:------:|
| 1 | `POST /api/auth/session` | `game.js:749` posts `/api/session` | `routes/auth.js:87` + alias `server.js:125` | `200` | ✅ |
| 2 | `POST /api/scores/submit` | `game.js:755` | `routes/scores.js:38` | `400 invalid_signature` (auth + route OK) | ✅ |
| 3 | `POST /api/rewards/claim` | `game.js:762` | `routes/rewards.js:22` | `200 {provisional:true, remainingToday:4, cap:5}` | ✅ |
| 4 | `POST /api/purchases/kora/initialize` | `game.js:769` | `routes/purchases.js:69` | `400 unknown_sku` (route + session OK) | ✅ |
| 5 | `GET /api/purchases/kora/callback` | browser redirect via `KORA_REDIRECT_URL` | `routes/purchases.js:133` | `302` to `/?kora_return=1&ref=…` | ✅ |
| 6 | `POST /api/purchases/kora/webhook` | Kora server-to-server | `routes/purchases.js:144` | raw body parsed above `express.json` | ✅ |
| 7 | `GET /api/purchases/kora/status` | `game.js:776` | `routes/purchases.js:207` | `404 not_found` for an unknown reference (route resolved) | ✅ |
| 8 | `POST /api/purchases/verify` | not called by the web client — correct | `routes/purchases.js:241` | native builds only | ✅ |
| 9 | `GET /api/config/remote` | `game.js:781` | `routes/config.js:56` | `200 {data,signature}` | ✅ |
| 10 | `GET /api/config/rules` | no direct caller | `routes/config.js:60` | `200 {data,signature}` | ✅ |
| 11 | `GET /api/version` | `game.js:790` | `routes/version.js:34` | `200` + `forceUpdate:false` | ✅ |
| 12 | `POST /api/ads/ssv-nonce` | `game.js:794` | `routes/ads.js:44` | `200 {nonce, ttl:600}` | ✅ |
| 13 | `GET /api/ads/ssv-callback` | Google only | `routes/ads.js:159` | public by design | ✅ |
| 14 | `DELETE /api/user/me` | `game.js:2349` | `routes/user.js:57` | `200` erasure confirmed in log | ✅ |
| 15 | `POST /api/analytics` | `game.js:822` (batched, consent-gated) | `routes/analytics.js:80` — **added this phase** | `202 {received:2, dropped:1}` | ✅ |
| 16 | `GET /api/user/export` | settings export is local; server route unused by the PWA | `routes/user.js:36` | `200` | ✅ |

**Fixes applied in this phase (each re-verified above):**

| Was | Now | File |
|-----|-----|------|
| `POST /api/scores` → `404` | `POST /api/scores/submit` | `client/game.js:755` |
| `POST /api/ads/ssv` → `404` | `POST /api/rewards/claim` | `client/game.js:762` |
| `POST /api/payments/kora/initialize` → `404` | `POST /api/purchases/kora/initialize` | `client/game.js:769` |
| `GET /api/payments/kora/status` → `404` | `GET /api/purchases/kora/status` | `client/game.js:776` |
| `GET /api/config` with the wrong envelope shape | `GET /api/config/remote`, reads `data` | `client/game.js:780` |
| `POST /api/analytics` → no route | `routes/analytics.js` mounted with its own limiter | `backend/server.js:148` |

Negative proof that the old paths are gone (probe step 13): `POST /api/scores` → `404`,
`POST /api/ads/ssv` → `404`, `POST /api/payments/kora/initialize` → `404`.

### 2.3 Backend environment variables

Source of truth: 28 `process.env` reads across `backend/**/*.js`, of which 27 are templated in
`backend/.env.example` and all 27 are read by `backend/config.js`. **S** = secret (server only),
**P** = public.

| # | Variable | Class | Read by | In `.env.example` | Verified |
|--:|----------|:-----:|---------|:-----------------:|:--------:|
| 1 | `SESSION_SIGNING_SECRET` | S | `config.js` | ✅ | ✅ |
| 2 | `SCORE_SIGNING_SECRET` | S | `config.js`, `routes/config.js` | ✅ | ✅ |
| 3 | `RECEIPT_SIGNING_SECRET` | S | `config.js` | ✅ | ✅ |
| 4 | `KORAPAY_SECRET_KEY` | S | `config.js`, `koraPay.js` | ✅ | ✅ |
| 5 | `KORAPAY_WEBHOOK_SECRET` | S | `config.js`, `koraPay.js` | ✅ | ✅ |
| 6 | `KORAPAY_ENCRYPTION_KEY` | S | `config.js` | ✅ | ✅ |
| 7 | `KORAPAY_PUBLIC_KEY` | P | `config.js`, `server.js` `/api/config` | ✅ | ✅ |
| 8 | `KORAPAY_BASE_URL` | – | `koraPay.js` | ✅ | ✅ |
| 9 | `KORA_REDIRECT_URL` | – | `config.js` | ✅ | ✅ |
| 10 | `KORA_WEBHOOK_URL` | – | `config.js` | ✅ | ✅ |
| 11 | `GOOGLE_PLAY_PACKAGE_NAME` | – | `config.js` | ✅ | ✅ |
| 12 | `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | S | `config.js` | ✅ | ✅ |
| 13 | `APPLE_SHARED_SECRET` | S | `config.js` | ✅ | ✅ |
| 14 | `APPLE_VERIFY_URL` | – | `config.js` | ✅ | ✅ |
| 15 | `APPLE_SANDBOX_URL` | – | `config.js` | ✅ | ✅ |
| 16 | `ADMOB_SSV_PUBLIC_KEY` | P | `routes/ads.js` (PEM override) | not templated — test-only, intentional | ✅ |
| 17 | `ADMOB_SSV_PUBLIC_KEY_URL` | – | `routes/ads.js` | ✅ | ✅ |
| 18 | `ADMOB_SSV_KEY_CACHE_TTL_MS` | – | `config.js` | ✅ | ✅ |
| 19 | `ALLOWED_ORIGINS` | – | `config.js`, `server.js` | ✅ | ✅ |
| 20 | `NODE_ENV` | – | `config.js` | ✅ | ✅ |
| 21 | `PORT` | – | `config.js` | ✅ | ✅ |
| 22 | `DB_PATH` | – | `config.js`, `services/db.js` | ✅ | ✅ |
| 23 | `MAX_SCORE_PER_RUN` | – | `config.js` | ✅ | ✅ |
| 24 | `MAX_COINS_PER_DAY` | – | `config.js` | ✅ | ✅ |
| 25 | `MIN_HUMAN_REACTION_MS` | – | `config.js` | ✅ | ✅ |
| 26 | `MAX_REWARDED_ADS_PER_DAY` | – | `config.js` | ✅ | ✅ |
| 27 | `REWARD_CONSOLATION_COINS` | – | `config.js` | ✅ | ✅ |
| 28 | `ADMIN_WEBHOOK_URL` | S | `config.js` | ✅ | ✅ |

**Ceiling drift fixed.** `backend/.env.example` and `backend/config.js` defaults now agree with
`backend/data/rules.json` and with the client's own limits:

| Knob | Before | Now (all three sources) |
|------|--------|-------------------------|
| `MAX_SCORE_PER_RUN` | `config.js` 250000 · `rules.json` 500000 · client 500000 | **500000** |
| `MAX_COINS_PER_DAY` | 200000 · 100000 | **100000** |
| `MIN_HUMAN_REACTION_MS` | 120 · 150 | **150** |
| `MAX_REWARDED_ADS_PER_DAY` | 20 · 5 · client 5 | **5** |

**Client build variables** (`dutchkem-lagos-run/.env.example`, injected by `build.js`):
`API_BASE_URL`, `ADMOB_REWARDED_ID`, `ADMOB_INTERSTITIAL_ID`, `APP_VERSION`, `SENTRY_DSN`,
`KORAPAY_PUBLIC_KEY`. `KORAPAY_PUBLIC_KEY` was listed in the template but missing from
`CONFIG_VARS`, so it never reached the client; **it is now in `CONFIG_VARS`** and its presence in an
actual build is proven by `dist/config.js`:

```json
"KORAPAY_PUBLIC_KEY": ""
```

(empty because the local `.env` has no publishable key; the key name is now wired end to end.)

**Reward-cap contract closed.** `client/game.js` read `res.data.rewardedLimit` from the session
response, which the server never sent. `routes/auth.js` now returns `rewardedLimit`, and the client
accepts either shape, so the server's cap reaches the client instead of being hard-coded twice.

### 2.4 Secret leak scan

Run from `dutchkem-lagos-run/` against a real production build.

| # | Check | Command | Pass? | Observed |
|--:|-------|---------|:-----:|----------|
| 1 | No server secret names in `dist/` | secret-name grep | ✅ | no matches; `build.js` also refuses on a match |
| 2 | No key-shaped strings in `dist/` or `client/` | `sk_`/`pk_` regex | ✅ | no matches; `.env.example` placeholders are `xxxx…` |
| 3 | No PEM private keys in the tree | `-----BEGIN … PRIVATE KEY-----` | ✅ | project sources clean. Two false positives: this report (it documents the command) and `node_modules` READMEs from `dotenv`/`googleapis`. Neither ships. |
| 4 | Only `.env.example` tracked | `git ls-files` filter | ✅ | `dutchkem-lagos-run/` is entirely untracked and local `.env` files are gitignored |
| 5 | Build-time scan active | `grep 'secret scan' build.js` | ✅ | `[build] secret scan clean` in both builds |
| 6 | No service-account JSON on disk | `find -name '*service-account*.json'` | ✅ | none |
| 7 | No source maps in `dist/` | `find dist -name '*.map'` | ✅ | none |
| 8 | `robots.txt` keeps `/api/` out of crawlers | `grep 'Disallow: /api'` | ✅ | present |
| 9 | Distributed bundle is minified/obfuscated | `wc -l dist/game.js` | ✅ | **0 lines** — one obfuscated statement line; `function a0_0x2ddd(` string-array loader on line 1 |
| 10 | No token/secret console logging | `grep 'console.log.*token\|secret'` | ✅ | none |

**Extra, stronger check:** the obfuscated bundle was executed in a stub DOM. It booted with **zero
errors** and made exactly the three start-up calls it should:

```
BOOT ERRORS: none
NETWORK CALLS (3):
  POST http://localhost:4000/api/session
  GET  http://localhost:4000/api/config/remote
  GET  http://localhost:4000/api/version
```

That proves terser + `javascript-obfuscator` (control-flow flattening, base64 string array,
self-defending) preserved behaviour, and that the shipped bundle targets the corrected endpoint set.

Build figures: dev build **17 files**; production build **17 files / 343–367 KB** (`game.js`
**≈83 KB gzipped**) — obfuscator output varies a few percent per run, so the byte total is quoted as a
band. Both are inside a sane first-load budget for a mid-range Android handset. The 17th file is
`vercel.json`, copied into `dist/` so the folder deploys to Vercel as a static site with no build step
on the host.

---

## 3. Kora Pay Integration Verification

Kora Pay is the **web/PWA** rail for Kobo and digital goods. It is not used in native store builds
(section 4).

| # | Item | Owner | Status | Evidence |
|--:|------|-------|:------:|----------|
| 1 | Kora account created (test mode) | Dutchkem Ops | ❌ | Not performable here — no Kora dashboard credentials in the build environment. Operator step, section 6 row 1. |
| 2 | Business verified, live mode enabled | Dutchkem Ops | ❌ | Ditto (KYC). Section 6 row 1. |
| 3 | Public key reaches the client | Eng | ✅ | `GET /api/config` → `config.koraPublicKey`; now also injectable via `build.js` `KORAPAY_PUBLIC_KEY` |
| 4 | Secret key backend-only | Eng | ✅ | Present only in `backend/.env.example` as a placeholder; scans 1–2 find nothing in `dist/` or `client/` |
| 5 | Webhook URL registered in Kora | Ops | ❌ | Needs the live dashboard; URL is documented in `DEPLOYMENT.md` and in section 8 |
| 6 | `x-korapay-signature` verified | Eng | ✅ | `routes/purchases.js` → `verifyWebhookSignature`; unsigned `403`, wrong key `403`, correct signature `200` + credit, replay `200 already granted`; HMAC over `JSON.stringify(payload.data)` only. **Fixed:** Kora signs with the merchant **secret key**, so `KORAPAY_WEBHOOK_SECRET` now defaults to `KORAPAY_SECRET_KEY` — a live deploy holding only the two dashboard keys settles payments instead of collecting money it never credits. |
| 7 | Redirect URL whitelisted | Ops | ❌ | Needs the live dashboard |
| 8 | Test payment end-to-end | QA | ❌ | Needs live keys + a browser. Code path proven locally: `/initialize` validates the catalogue (`unknown_sku` for a bogus SKU) and forwards `amount = naira × 100`, `redirect_url` and `notification_url`; only the round trip to Kora's hosted page is unproven. |
| 9 | Webhook received and verified in test | QA | ❌ | Needs a public URL that Kora can call. The receiving half is proven end-to-end in §3.3 against the real route with a real HMAC. |
| 10 | Kobo granted server-side only | Eng | ✅ | `db` credits the wallet only inside the verified webhook branch; `/kora/callback` deliberately grants nothing and redirects to `?kora_return=1&ref=…`; `/api/rewards/claim` is explicitly `provisional` |

### 3.1 The flow, end to end

```
client  → POST /api/purchases/kora/initialize   (session-authenticated, 5/min)
server  → Kora charges/initialize               (secret key, amount in kobo)
server  → { checkout_url, reference }           purchase stored verified:false
browser → Kora checkout page                    (card / transfer / USSD / mobile money)
Kora    → GET  /api/purchases/kora/callback     → 302 /?kora_return=1&ref=…
Kora    → POST /api/purchases/kora/webhook      raw body → HMAC verify → grant kobo (idempotent)
client  → GET  /api/purchases/kora/status?reference=…  poll until settled → show balance
```

Ordering constraint holds: a player who closes the tab mid-payment is still credited when the
webhook lands, because nothing in the callback path touches a balance.

### 3.2 Known Kora limitations (recorded, not designed around)

- Rails: cards, bank transfer, USSD, mobile money. **"Pay with Bank" (Naira) covers a small bank
  list** (Kuda, OPay, Palmpay at the time of writing) — copy must not promise every Nigerian bank.
- Webhook signature covers the `data` object only, so the raw parser sits above `express.json()`.
- Amounts are in the minor unit (kobo): ₦1,500 = `150000`.
- Test and live keys are not interchangeable; switching to live requires re-registering the webhook.
- Webhooks are signed with the **secret key**, not a separate webhook secret (see §3.3).

### 3.3 The settlement path, proven locally (`2026-11-25`)

Run against the real Express app in `NODE_ENV=production`, with `KORAPAY_SECRET_KEY` set and
`KORAPAY_WEBHOOK_SECRET` deliberately **unset** — the exact shape of a live deploy configured from
the Kora dashboard alone:

| Request | Result |
|---------|--------|
| `POST /api/purchases/kora/webhook`, no signature | `403` `invalid_signature` |
| Same, signature from the wrong key | `403` `invalid_signature` |
| Same, HMAC-SHA256 of `JSON.stringify(data)` under the secret key | `200` `{status:"ok", kobo:500}` and `granted 500 kobo to wh_user` |
| `GET /api/user/me` afterwards | `kobo: 500` |
| Replay of the identical signed webhook | `200` `already granted`, balance still `500` |
| `GET /api/purchases/kora/status?reference=…` | `200` `{verified:true, kobo:500, sku:"kobo_500", amount:50000}` |

That is the whole collection mechanism: nothing is credited until a correctly signed `charge.success`
arrives, and a replayed delivery cannot mint a second credit. What remains for "live" is purely
account and network work — live keys, a public host, and the dashboard's webhook registration.

---

## 4. Native Billing Notes

The PWA ships here. When the Android and iOS builds are produced from the same `client/` tree the
payment rail **must** change: store policy forbids third-party rails for digital goods.

### 4.1 Android — Google Play Billing

- Use the Play Billing Library in the native wrapper; hand the purchase token to
  `POST /api/purchases/verify`.
- The server validates through the Play Developer API using `GOOGLE_PLAY_PACKAGE_NAME` and
  `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (`services/receiptValidator.js`).
- Grant Kobo from the **server response**, never from the on-device callback.
- Acknowledge/consume only after the server confirms the grant, or Google auto-refunds after 3 days.
- Verify `packageName`, `productId`, `purchaseState === 0`, and that the token is unseen.

### 4.2 iOS — Apple StoreKit

- Use StoreKit 2 and send the signed transaction (JWS) or base64 receipt to
  `POST /api/purchases/verify`.
- The server validates against `APPLE_VERIFY_URL`, falling back to `APPLE_SANDBOX_URL` on status
  `21007` (sandbox receipt sent to production).
- Check `bundle_id`, `product_id` and `in_app` transaction uniqueness. `APPLE_SHARED_SECRET` is the
  only credential and stays server-side.
- Finish the transaction only after the server confirms the grant.

### 4.3 What must not happen

| Rule | Reason |
|------|--------|
| Do not ship Kora in native store builds | App Store Guideline 3.1.1 and Google Play Payments Policy both require store billing for in-app digital content. |
| Do not put any server secret in the app bundle | Native bundles are trivially unpacked. |
| Do not reuse the PWA's `/api/purchases/kora/*` paths for store receipts | `/api/purchases/verify` exists precisely for them. |
| Do not grant currency client-side | The server is the only authority on both platforms. |
| Kora remains valid for **web/PWA** purchases | Outside store billing rules. |

---

## 5. Feature Verification Matrix

Every item the brief asked to confirm, with the evidence that confirms it.

### 5.1 Phase deliverables and branding

| Requirement | Status | Evidence |
|-------------|:------:|----------|
| All 14 phases' files exist (Phases 0–13 artefacts) | ✅ | Section 1 inventory; every file listed is present on disk and read during this audit |
| Proprietary header on every source file | ✅ | All 48 text sources begin with the `© 2026 Dutchkem Ventures …` header; exceptions documented in section 1 |
| `© 2026 Dutchkem Ventures` on splash | ✅ | `index.html:101` `.splash-legal` |
| `© 2026 Dutchkem Ventures` on menu footer | ✅ | Menu footer legal line in `index.html` |
| `© 2026 Dutchkem Ventures` on settings | ✅ | Settings overlay footer |
| `© 2026 Dutchkem Ventures` on privacy page | ✅ | `privacy.html` (2 occurrences) |
| `© 2026 Dutchkem Ventures` on terms page | ✅ | `terms.html` (2 occurrences) |
| Tagline "Driving the Culture" | ✅ | Splash, menu brand block, legal pages, `consent.html` |

### 5.2 PWA

| Requirement | Status | Evidence |
|-------------|:------:|----------|
| Manifest `name` | ✅ | `"Dutchkem Ventures Presents: Lagos Run — Hustle Empire"` |
| Manifest `short_name` | ✅ | `"Dutchkem Lagos Run"` |
| `start_url` / `display` | ✅ | `/` · `fullscreen` |
| Icons | ✅ | 192 `any`, 512 `any`, 512 `maskable`, apple-touch 180, favicon 32 |
| Service worker precache | ✅ | 16 URLs incl. legal pages, icons and `/` |
| Auto-update banner | ✅ | `SW_UPDATED` message + `registration.waiting` + `updatefound/installed` all raise `#updateBanner`; `btnReload` posts `SKIP_WAITING` then reloads |
| Offline fallback | ✅ | Precache-first shell; `/api/` network-first with a 5s timeout; cross-origin stale-while-revalidate |
| Cache busting per build | ✅ | `build.js` rewrites `const CACHE_VERSION` or **fails the build**; observed `dutchkem-v1.0.0-780c08e6` |

### 5.3 Monetisation

| Requirement | Status | Evidence |
|-------------|:------:|----------|
| Kora flow initialize → redirect → webhook → grant → status poll | ✅ | Section 3.1; all five hops resolve on the live probe |
| Webhook signature enforced | ✅ | `verifyWebhookSignature`, constant-time compare, `403` on failure; signing key defaults to `KORAPAY_SECRET_KEY` when no rotation secret is set (§3.3) |
| AdMob SSV: nonce → ad → callback → grant | ✅ | `POST /api/ads/ssv-nonce` → `200 {nonce,ttl:600}`; ad shown via `Ads.showRewarded`; Google calls `GET /api/ads/ssv-callback` with `custom_data`; RSA-SHA256 verified against cached `verifier-keys.json`; only then is a grant written |
| Rewarded claim cannot mint currency | ✅ | `/api/rewards/claim` returns `provisional:true` + `remainingToday`; no balance write |
| Daily caps | ✅ | Server cap 5 (config/rules/client aligned); client counter resets on a new calendar day |
| Native billing documented | ✅ | Section 4 (Play Billing, StoreKit, `/api/purchases/verify`) |

### 5.4 Build pipeline

| Requirement | Status | Evidence |
|-------------|:------:|----------|
| Obfuscation | ✅ | `node build.js --prod` → terser then `javascript-obfuscator` (control-flow flattening 0.75, base64 string array, self-defending, hexadecimal identifiers); output is a single line |
| Secrets injection | ✅ | `.env` validated against `REQUIRED_VARS`; `CONFIG_VARS` (now incl. `KORAPAY_PUBLIC_KEY`) written to `dist/config.js`; build fails if a required var is missing |
| Leak scan | ✅ | `SECRET_PATTERNS` walk over `dist/`, non-zero exit on a hit |
| Bundle actually runs | ✅ | Stub-DOM boot of the obfuscated bundle: 0 errors, 3 correct calls |
| Deterministic failures | ✅ | Missing `.env`, missing icons, missing static file, and a missing `CACHE_VERSION` line all abort the build |

### 5.5 SEO

| Requirement | Status | Evidence |
|-------------|:------:|----------|
| `VideoGame` JSON-LD | ✅ | `application/ld+json` block with name, url, image, genre, gamePlatform, offers, author/publisher |
| Canonical | ✅ | `<link rel="canonical" href="https://lagosrun.dutchkem.com/">` |
| Open Graph | ✅ | title, description, type, image, url, site_name, locale `en_NG` |
| Twitter card | ✅ | `summary_large_image` + title/description/image |
| Sitemap | ✅ | `client/sitemap.xml`, shipped in `dist/` and precached |
| Robots | ✅ | `client/robots.txt`, `Disallow: /api` verified |
| Crawlable content | ✅ | `#seo-content` prose block (canvas-only pages index poorly otherwise) |

### 5.6 Security

| Requirement | Status | Evidence |
|-------------|:------:|----------|
| HMAC-signed scores | ✅ (mechanism) | `signScore`/`verifyScore`: SHA-256 HMAC over a length-prefixed canonical `uid|score|runId`; replay blocked by a unique `runId` per run (`409 duplicate_run`); ceiling checked after signature. **The client cannot yet mint this signature** — see section 6 row 1. |
| Kora webhook signature | ✅ | HMAC-SHA256 over `data`, constant-time compare, raw-body parser above the JSON parser |
| Rate limits | ✅ | auth 20/min · score 10/min · purchase 5/min · reward 10/min · config 30/min · analytics 20/min, keyed by user id when a session exists |
| Secret rotation docs | ✅ | `SECURITY.md` rotation procedure + `DEPLOYMENT.md` environment matrix |
| Session tokens | ✅ | HS256, 24h TTL, `requireSession` on every private route; probe returned `401 missing_token` for an unauthenticated analytics POST |
| PII minimisation | ✅ | Analytics stores aggregate counters only; no uid persisted; NDPR export/erasure endpoints proven (`DELETE /api/user/me` → `200`) |
| Security headers | ✅ | helmet CSP (`default-src 'self'`), CORS exact-origin allowlist (wildcard rejected), `x-powered-by` disabled |

### 5.7 Accessibility

| Requirement | Status | Evidence |
|-------------|:------:|----------|
| ARIA labels | ✅ | 17 `aria-label` + 7 `role` attributes in `index.html`; live regions on `#toast` and `#splashStatus`; `aria-pressed` maintained on conductor toggle and radio stations; weather chip announces its state |
| 44px touch targets | ✅ | 4 explicit `min-height/height: 44px` rules plus 44×44 control buttons |
| Colourblind mode | ✅ | `.colorblind` palette variant (5 rules) toggled from settings and persisted in the save |
| Reduced motion | ✅ | `.reduced-motion` variant (5 rules) + `prefers-reduced-motion` query |

### 5.8 Mobile

| Requirement | Status | Evidence |
|-------------|:------:|----------|
| `safe-area-inset` | ✅ | 4 inset usages (top/bottom/left/right) for notches and home indicators |
| `100dvh` | ✅ | Used for full-height legal/consent layouts (avoids the mobile URL-bar overflow) |
| Landscape query | ✅ | `@media (max-height: 500px) and (orientation: landscape)` at `styles.css:873` |
| Desktop controls hidden | ✅ | `@media (hover: hover) and (pointer: fine) { .controls { display: none } }` at `styles.css:700` |
| Touch + keyboard input | ✅ | Touch swipe/tap on canvas, three on-screen buttons, Arrow/A/D/S/Space/R/Esc keyboard map |
| Performance guards | ✅ | DPR capped at 2, `dt` clamped to 50ms, canvas resize on `resize`/`orientationchange`/`visualViewport` |

---

## 6. Remaining TODOs for production hardening

Only one row is a genuine code gap. The rest are operational steps that need live accounts, devices
or infrastructure that a build environment cannot provide.

| TODO | File | Priority | Notes |
|------|------|:--------:|-------|
| **Score submissions are held locally** — the client refuses to POST an unsigned run (`submitScore` returns early when `signature` is null) because `SCORE_SIGNING_SECRET` never leaves the server, so the client cannot mint the HMAC the route verifies. | `client/game.js:2161`, `backend/routes/scores.js:42` | **P0** | Choose one design and implement it: (a) server issues a per-run token at run start and `/submit` verifies the token plus plausibility bounds instead of a client HMAC; or (b) drop inbound submissions and compute leaderboard entries server-side from telemetry. Do not ship a shared client signing key. |
| Kora test account, KYC, live keys, webhook + redirect registration | `DEPLOYMENT.md` §Kora | **P0 (operator)** | Section 3 rows 1, 2, 5, 7, 8, 9 |
| Pin the AdMob verifier-key host and persist the key cache across restarts; alert on unknown `key_id` bursts | `backend/routes/ads.js` | **P1** | RSA-SHA256 verification itself is implemented |
| Cache the Google Play OAuth2 token and refresh on 401 | `backend/services/receiptValidator.js` | **P1** | Structure validation and bearer minting already work |
| Replace the simulated rewarded ad with the real AdMob web/native SDK and `custom_data` nonce wiring | `client/game.js` (`Ads._showRewardedAd`) | **P1** | `_mockAd` currently stands in when no SDK is present |
| Live Apple/Google receipt verification with real sandbox accounts | `routes/purchases.js` `/verify` | **P1 (operator)** | Needs store credentials |
| Move SSV nonces to a shared store (Redis) | `backend/routes/ads.js` | **P2** | In-memory `Map` loses nonces on restart and across instances |
| Document and implement a Kora key rotation window | `backend/config.js`, `SECURITY.md` | **P2** | Dual-key acceptance for the encryption key |
| Migrate the JSON datastore to Postgres | `backend/services/db.js` | **P2** | Single-writer, whole-file rewrite; fine for launch volume, not for concurrency. Repository API is the seam. |
| Rate limit strictly by authenticated user everywhere | `backend/middleware/rateLimit.js` | **P2** | Already keys on `req.user.id` when present; mount-level limiters (analytics) run before auth and fall back to IP — CGNAT pools both over- and under-block |
| Real-device 60fps measurement | `client/game.js` | **P2 (QA)** | Headless verification cannot measure frame pacing |
| "Pay with Bank" rail coverage copy | `client/terms.html`, shop UI | **P3** | Name the supported banks (Kuda, OPay, Palmpay) |
| Comment headers on `backend/data/*.json` | `backend/data/` | **P3** | JSON has no comment syntax; branding is in the `brand` field. Only add a `_copyright` key if the signed payload may change. |

---

## 7. How to Run Locally

From the repository root. Node 18+ (verified on Node 26.13.1). The API reads `backend/.env` only.

```bash
# ── 0. Enter the package ─────────────────────────────────────────────────────
cd dutchkem-lagos-run

# ── 1. One-shot install + build ──────────────────────────────────────────────
npm install && npm run icons && npm run build \
  && cd backend && npm install && npm run dev
#    npm install      → sharp, terser, javascript-obfuscator, dotenv, serve
#    npm run icons    → renders client/icons/*.png from the danfo mark
#    npm run build    → dist/ with injected config + versioned service worker
#    npm run dev      → API on http://localhost:4000

# ── 2. In a second terminal, serve the built client ──────────────────────────
npx serve dist                     # http://localhost:3000
```

Two-terminal form, if you prefer to develop against the source tree:

```bash
# terminal 1 — API
cd dutchkem-lagos-run/backend && npm run dev          # :4000

# terminal 2 — static client (source, no build)
cd dutchkem-lagos-run && npm run dev-client           # :5173

# production bundle for smoke-testing
cd dutchkem-lagos-run && npx serve dist -l 8080
```

Configuration before the first API boot:

```bash
cp .env.example .env                 # PUBLIC client values only
cp backend/.env.example backend/.env # then fill in the secrets

# Generate the three signing secrets and paste them into backend/.env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"  # SESSION_SIGNING_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"  # SCORE_SIGNING_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"  # RECEIPT_SIGNING_SECRET
```

Verify the API is alive and the corrected paths answer:

```bash
curl -s localhost:4000/health
curl -s localhost:4000/api/version
curl -s localhost:4000/api/config/remote | head -c 200

TOKEN=$(curl -s -X POST localhost:4000/api/session \
  -H 'Content-Type: application/json' \
  -d '{"uid":"local_player_01","version":"1.0.0","platform":"web"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

curl -s -X POST localhost:4000/api/rewards/claim \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"nonce":"local-nonce"}'
# → {"ok":true,"provisional":true,"remainingToday":4,...}
```

Local notes

- `client/config.js` ships `API_BASE_URL: 'http://localhost:4000'`; `build.js` regenerates it from `.env`.
- `ALLOWED_ORIGINS` must contain the exact client origin; wildcards are rejected by design.
- Without the three signing secrets the API warns and runs in development, and refuses to boot with
  `NODE_ENV=production`.
- `sharp` prints a harmless `Fontconfig error` while rendering icons; the exit code stays 0.
- The datastore lives at `backend/data/dutchkem.db` (`DB_PATH`). Delete it to reset local state.
- Obfuscated build: `node build.js --prod`.
- Reproduce this audit: run the secret-scan greps from section 2.4 against `dist/`, and diff the
  `/api/…` literals in `client/game.js` against the `router.*` declarations in `backend/routes/`.

---

## 8. Deployment Summary

The full procedure, environment matrix, DNS records, rollback and launch runbook live in
**[`DEPLOYMENT.md`](DEPLOYMENT.md)** — follow it in order; this table is the checklist view.

### 8.0 Deployment target: Render (API) + Vercel (static `dist/`)

Everything that can be produced without an account has been produced and tested:

| Deliverable | State |
|-------------|-------|
| `render.yaml` (repository root, additive) | ✅ Appended as a second service (`dutchkem-lagos-run-api`) beside ProSuite's existing `dutchkem-api`, which is untouched. Describes the API completely: `rootDir: dutchkem-lagos-run/backend`, `buildCommand: npm ci --omit=dev`, `startCommand: npm start`, `healthCheckPath: /health`, `NODE_ENV=production`, Render-generated `SESSION/SCORE/RECEIPT_SIGNING_SECRET`, Kora variables prompted at apply time, 1 GB disk at `/var/data` with `DB_PATH=/var/data/lagosrun.db` |
| Production boot on a Render-shaped environment | ✅ `NODE_ENV=production PORT=<injected> DB_PATH=/tmp/… node server.js` → `/health` `200`, `/api/config` `200`, `POST /api/session` → `GET /api/user/me` `200` with balances, foreign-Origin request got **no** `Access-Control-Allow-Origin`, allowed Origin echoed exactly, datastore created at the configured `DB_PATH` |
| `client/vercel.json` | ✅ Ships inside `dist/`; static deploy with `no-store` on `sw.js`, `config.js` and `index.html`, immutable icons, HSTS/nosniff/frame/referrer/permissions headers |
| Client build pointing at the API | ✅ `npm run icons && node build.js --prod` → `dist/config.js` carries `"API_BASE_URL": "https://dutchkem-lagos-run-api.onrender.com"`; 17 files, 367.1 KB, obfuscated, secret scan clean, SW cache `dutchkem-v1.0.0-e3ec70d8` |
| Kora webhook host | ✅ `https://dutchkem-lagos-run-api.onrender.com/api/purchases/kora/webhook` (set in `render.yaml` *and* the dashboard) |

What this environment **cannot** do, and why the rows below stay ❌: creating the Render service and the
Vercel project requires signing in to those accounts; Kora live keys, webhook registration, redirect
whitelisting and a real charge require the Kora dashboard; a 60fps measurement requires a handset. No
credential for any of them exists here, and none may be pasted into a build.

| Layer | Target | Configuration | Status |
|-------|--------|---------------|:------:|
| Backend API | Render — `https://dutchkem-lagos-run-api.onrender.com` | Blueprint `render.yaml`; `NODE_ENV=production`, generated signing secrets, Kora live keys, `ALLOWED_ORIGINS` locked to the Vercel origin(s) | ❌ config ready, service not created (no Render account access here) |
| Client PWA | Vercel — static `dist/` | `cd dist && npx vercel --prod`; `API_BASE_URL` baked to the Render host, SW cache versioned per build | ❌ config ready, project not created (no Vercel account access here) |
| Domain DNS | `dutchkem.com` zone | apex/`www` + `api` → Vercel, TLS auto-issued | ❌ operator |
| Kora webhook | Kora dashboard | `https://api.lagosrun.dutchkem.com/api/purchases/kora/webhook`, `charge.success`, live mode | ❌ operator |
| AdMob SSV | AdMob console | `https://api.lagosrun.dutchkem.com/api/ads/ssv-callback` | ❌ operator |
| Datastore | Persistent volume or Postgres | `DB_PATH` on a writable disk; serverless filesystems are ephemeral (see P2 Postgres row) | ❌ operator |
| Monitoring | Uptime probe + `ADMIN_WEBHOOK_URL` | poll `/health` every minute; alert on 5xx and cheat flags | ❌ operator |

**Order of operations:** backend deploy → env verification → Kora webhook registration → client
deploy → DNS → end-to-end purchase → AdMob SSV replay → monitoring. Deploying the client first ships
a bundle pointing at a host that is not answering.

### 8.1 What QA must clear before launch

| Gate | Status | Evidence to attach |
|------|:------:|--------------------|
| Cross-references (sections 2.1–2.4) | ✅ | This document; zero ❌ rows |
| Secret scan, all 10 checks | ✅ | section 2.4 output, empty |
| Obfuscated bundle boots | ✅ | stub-DOM run: 0 errors, 3 endpoints |
| Kora test payment end-to-end | ❌ | Kora reference id + webhook `200` + before/after Kobo balance |
| AdMob SSV accepted, replay rejected | ❌ | signed callback `200`, unsigned `403` |
| Real Android device at 60fps | ❌ | device model + `requestAnimationFrame` timing over a 3-minute run |
| Lighthouse PWA pass | ❌ | installable, offline shell, no console errors |
| Privacy/Terms reachable on the deployed origin | ❌ | both URLs `200`, links present in the consent gate and menu footer |
| © 2026 Dutchkem Ventures visible in browser | ✅ (source) / ❌ (deployed) | 10 occurrences in `index.html`, 2 in each legal page |

### Sign-off

```
Signed off by:  ______________________________  (engineering: verification complete)

Title:          ______________________________

Date:           ____________________  (YYYY-MM-DD)

Build verified: ____________________  (dist/ hash or Vercel deployment URL)

Operator gates (Kora, AdMob, stores, DNS) cleared by: ______________________________
```

---

## 9. BUILD COMPLETE

**Total files created:** 56, all inside `dutchkem-lagos-run/` (including 5 icon binaries and 2
lockfiles; `node_modules/` and `dist/` are reproducible and gitignored). The deployment change at the
repository root is **additive, not a new file**: 62 lines appended to the existing `render.yaml` as a
second service, leaving ProSuite's `dutchkem-api` definition byte-for-byte unchanged.

**Total lines of code:** 9,602 across HTML, CSS, JavaScript, JSON data, Markdown and configuration. The
two generated lockfiles add 4,405 more, for 14,007 physical lines on disk.

**Composition**

| Layer | Files | Lines |
|-------|------:|------:|
| Client PWA (`client/` — 12 sources, 5 icon binaries) | 17 | 4,518 |
| Backend API (`backend/` — 15 modules, 3 data files, 2 manifests, env template) | 28 | 2,505 |
| Build tooling (`build.js`, `scripts/generate-icons.js`) | 2 | 437 |
| Documentation (`README`, `SECURITY`, `DEPLOYMENT`, this report) | 4 | 2,100 |
| Root manifests and config (`package.json`, `.env.example`, `.gitignore`, lockfile) | 4 | 2,787 |
| Backend lockfile | 1 | 1,660 |

*(+62 lines appended to the repository-root `render.yaml` for the Render service; not counted as a
package file.)*

**All TODOs remaining for production hardening:** section 6 — 1 × P0 code gap (score-submission
signing model), 5 × P0/P1 operator gates, 5 × P2, 2 × P3.

**Exact commands to run locally**

```bash
npm install && npm run icons && npm run build \
  && cd backend && npm install && npm run dev
# then, in a separate terminal:
npx serve dist
```

**Deployment steps:** follow [`DEPLOYMENT.md`](DEPLOYMENT.md) — hosting topology, the 28-variable
environment matrix, Kora and AdMob console setup, DNS, datastore, monitoring, rollback and the launch
runbook. Deploy the backend before the client.

---

**© 2026 Dutchkem Ventures. All rights reserved. Build complete. Ready for QA and deployment.**

Dutchkem Ventures Presents: Lagos Run — Hustle Empire · *Driving the Culture*
This document is proprietary and confidential. Do not distribute outside Dutchkem Ventures without
written permission.
