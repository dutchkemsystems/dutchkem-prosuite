# OPERATIONS.md — Dutchkem Ventures ProSuite NG+

> Production operations, scale context, and runbook for the live platform.

## Production Context

Dutchkem ProSuite NG+ is a live multi-agent AI platform serving the Nigerian market.

| Metric | Value |
|--------|-------|
| Active clients | 1,500,000+ |
| Monthly transaction volume | ₦23.6B (operational context) |
| Uptime (12 months) | 99.5% |
| Concurrent users (peak) | 10,000+ |
| Specialized AI agents | 15 |
| Database tables | ~324 |

## Deployment Architecture

| Layer | Service |
|-------|---------|
| Frontend | Vercel — https://dutchkem-prosuite-app.vercel.app |
| Backend + DB | Convex — https://warmhearted-aardvark-280.convex.cloud |
| AI Models | OpenRouter (Llama 3.3 70B), NVIDIA NIM (failover chain) |
| Payments | Kora Pay (Nigerian gateway) |
| Social | Composio (11 platforms), OpenWA WhatsApp gateway (+234-911-339-3525) |
| Email | AWS SES + Resend (failover) |
| SMS | Termii (legacy OTP) |
| Monitoring | Sentry + structured logging (`convex/lib/logger.ts`) |

## Deploy Process

```bash
# 1. Build check
npx vite build

# 2. Run tests (must be green)
npm test

# 3. Deploy Convex
npx convex deploy --typecheck=disable

# 4. Deploy Vercel
vercel deploy --prod --yes --force

# 5. Verify health
Invoke-RestMethod -Uri "https://warmhearted-aardvark-280.convex.site/api/health"

# 6. Deploy OpenWA server (if changed)
cd openwa-server && ./deploy-fly.sh both
```

## Deploy Process (Docker)

```bash
# Build the image
docker build -t dutchkem-prosuite .

# Run it (serves the built frontend on :4173)
docker run -d -p 4173:4173 dutchkem-prosuite

# Or via compose
docker-compose up --build
```

## Environment Variables

See `.env.example` for the full list (169 documented variables). Critical groups:

- **Convex:** `CONVEX_URL`, `VITE_CONVEX_URL`, `CONVEX_SITE_URL`, `CONVEX_DEPLOYMENT`
- **Auth:** `ADMIN_TEST_PASSWORD`, `ADMIN_SESSION_TOKEN`, `RESEND_API_KEY`
- **AI:** `OPENROUTER_API_KEY`, `NVIDIA_NIM_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`
- **Payments:** `KORA_PUBLIC_KEY`, `KORA_SECRET_KEY`, `KORA_ENCRYPTION_KEY`, `KORA_PAY_WEBHOOK_SECRET`
- **Social:** `COMPOSIO_API_KEY`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`
- **Observability:** `SENTRY_DSN`, `VITE_SENTRY_DSN`

## Monitoring & Alerting

- **Sentry:** initialized in `src/main.tsx` from `VITE_SENTRY_DSN` (frontend).
- **Structured logging:** `createLogger("module")` in `convex/lib/logger.ts` — levels `debug|info|warn|error`, key-value metadata, `sanitize()` redacts secrets, `withError()` normalizes errors.
- **Health endpoint:** `GET /api/health` on the Convex site returns `{ status, timestamp, version }`.
- **CI:** GitHub Actions runs Gitleaks secret scan + `npm audit` on every push.

## Runbook

### Frontend down (Vercel)
1. `vercel login`
2. `vercel deploy --prod --yes --force`
3. Verify `https://dutchkem-prosuite-app.vercel.app` returns 200.

### Backend down (Convex)
1. `npx convex deploy --typecheck=disable`
2. Check `https://warmhearted-aardvark-280.convex.site/api/health`.
3. If the project is above free-plan limits, upgrade at the Convex dashboard.

### WhatsApp gateway down (OpenWA)
1. `cd openwa-server`
2. `fly deploy --config fly.toml --app dutchkem-openwa-admin`
3. `fly logs --app dutchkem-openwa-admin` to view QR / session status.
4. Kill switch: set `WHATSAPP_ENABLED=false` to disable all WhatsApp.

### Secret rotation
- If a credential is exposed in source control, rotate it immediately, update `.env`, and record the rotation in `CHANGELOG.md`.
- CI secret scanning (Gitleaks) runs automatically on push.