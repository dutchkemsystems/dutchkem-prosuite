# Dutchkem Ventures Presents: Lagos Run — Hustle Empire

**Publisher / developer / IP owner:** Dutchkem Ventures · **Tagline:** Driving the Culture
**© 2026 Dutchkem Ventures. All rights reserved.**

A production-ready, monetized, browser-based endless runner. You drive a yellow danfo through Lagos
traffic, board passengers in yellow pickup zones, deliver them safely to drop-off zones, and collect
fares based on distance, passenger count and driving smoothness.

- Canvas 2D, no external game engine
- Mobile-first, 60fps target on mid-range Android
- Chrome, Safari, Firefox, Edge, Samsung Internet, Opera
- Installable PWA with offline shell

> **Status:** Phases 0–13 are implemented and the build is complete — project setup, the client shell,
> legal pages and static assets, service worker and client config, the full Canvas 2D game engine,
> danfo physics and traffic, the passenger economy, HUD/radio/weather, Endless Run scoring, Hustle
> Mode and fleet building, Crew Race ghosts, the Express backend (auth, signed config, scores,
> purchases, rewards, analytics, user data), Kora Pay + AdMob monetisation, release hardening, and the
> Phase 12–14 audit trail (`INTEGRATION_REPORT.md`, `SECURITY.md`, `DEPLOYMENT.md`). See the
> "Remaining TODOs" section of `INTEGRATION_REPORT.md` for the production-hardening backlog.

---

## Table of contents — the 14 build phases

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | [Project setup, brand rules, folder structure](#phase-0--project-setup) | ✅ Done |
| 1 | [Client shell — HTML + CSS](#phase-1--client-shell) | ✅ Done |
| 2 | [Legal pages and static assets](#phase-2--legal-pages-and-static-assets) | ✅ Done |
| 3 | [Service worker and client config](#phase-3--service-worker-and-client-config) | ✅ Done |
| 4 | Game engine core: loop, canvas, rendering | ✅ Done |
| 5 | Danfo physics, traffic, collisions | ✅ Done |
| 6 | Passenger pickup/drop-off economy and fares | ✅ Done |
| 7 | HUD, radio stations, weather and time-of-day | ✅ Done |
| 8 | Endless Run mode, scoring and leaderboards | ✅ Done |
| 9 | Hustle Mode campaign, daily expenses, fleet building | ✅ Done |
| 10 | Crew Race async ghost multiplayer | ✅ Done |
| 11 | Backend API: auth, scores, rewards, user, ads | ✅ Done |
| 12 | Monetization: Kora Pay, AdMob, Season Pass, Chairman's Club | ✅ Done |
| 13 | Release hardening: PWA, SEO, security, analytics, deploy | ✅ Done |

---

## Quick start

```bash
# from this directory
npm install          # sharp, terser, javascript-obfuscator, dotenv, serve
npm run icons        # render client/icons/*.png from the danfo mark
npm run dev-client   # static preview at http://localhost:5173
npm run build        # production bundle into dist/ (config injection + SW versioning)
```

Optional backend (added in Phase 11):

```bash
cp .env.example .env
npm run dev-backend
```

### Build output

`npm run build` writes `dist/` with:

- `config.js` regenerated from `.env` public variables (`API_BASE_URL`, `ADMOB_*`, `SENTRY_DSN`, …)
- `sw.js` with `CACHE_VERSION` rewritten to a unique build version, which invalidates stale caches
- `game.js` minified with terser (set `OBFUSCATE=1` to also obfuscate)

The build refuses to run if `client/` is missing or the service worker's `CACHE_VERSION` line cannot
be found, so a broken deploy fails loudly instead of silently shipping.

---

## Folder structure

```
dutchkem-lagos-run/
├── client/              # static PWA (index.html, styles.css, game.js, sw.js, legal pages, icons)
├── backend/             # Express API (health, config, version, auth, scores, purchases, rewards, user, ads)
├── scripts/             # generate-icons.js
├── build.js             # production build
├── package.json
├── .env.example         # public client variables only
├── SECURITY.md
├── DEPLOYMENT.md
└── INTEGRATION_REPORT.md
```

---

## Phase 0 — Project setup

Brand rules, folder skeleton, gitignore, root package manifest, public env template and this README.
Every source file carries the Dutchkem Ventures proprietary header.

## Phase 1 — Client shell

`client/index.html` and `client/styles.css`: splash, consent gate, main menu, gameplay HUD, pause,
game-over, settings, toast and update/offline banners, hidden crawlable SEO block, safe-area handling,
44px touch targets, colourblind palette and reduced-motion support.

## Phase 2 — Legal pages and static assets

NDPR/GDPR privacy policy, terms of service, standalone consent page, `robots.txt`, `sitemap.xml` and
the full PWA `manifest.json`.

## Phase 3 — Service worker and client config

`client/sw.js` pre-caches the shell and applies cache-first, network-first (5s API timeout) and
stale-while-revalidate strategies. `client/config.js` is a development placeholder that `build.js`
overwrites for production.

---

## Legal

- Privacy: [client/privacy.html](client/privacy.html)
- Terms: [client/terms.html](client/terms.html)
- Consent: [client/consent.html](client/consent.html)

Contact: privacy@dutchkem.com · legal@dutchkem.com · support@dutchkem.com
