# Changelog

All notable changes to **Dutchkem Ventures ProSuite NG+** are documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- Removed all hardcoded admin credentials from `scripts/`. Test/automation scripts now require
  `ADMIN_TEST_EMAIL` / `ADMIN_TEST_PASSWORD` / `ENTERPRISE_TEST_PASSWORD` / `ADMIN_SESSION_TOKEN`
  environment variables and fail with exit code 1 if unset.
- `.env.example` expanded with all documented environment variables
  (`OPENAI_API_KEY`, `GROQ_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_KEY`, `SENTRY_DSN`, SMTP, Redis,
  storage, Vercel, and test-only credentials).
- CI pipeline now secrets-scans every push with Gitleaks and runs `npm audit` (security job).
- Added `.github/dependabot.yml` for weekly npm + GitHub Actions dependency updates.

> **Admin password rotation:** the production admin password is scheduled for rotation. See the
> pending credential-rotation item under [Maintenance](#maintenance) — it cannot be completed from
> an automated session and must be done by an operator.

### Added

- CI/CD hardening: new `.github/workflows/ci.yml` (security → lint → test → build → docker) and
  removed the mismatched Ruby/RSpec `prosuite-ci.yml`.
- Vitest suite (`vitest.config.ts` `projects` config + `src/test/setup.ts`) with 4 component test
  files (**13 passing tests**) and coverage thresholds.
- Root `Dockerfile`, `docker-compose.yml`, and `.dockerignore` (multi-stage Vite build served via
  `vite preview`; Convex backend is external — no local DB/Redis).
- Structured logger `convex/lib/logger.ts` (`createLogger`, `sanitize`, `withError`) for Convex
  functions.
- Splitted `convex/schema/misc.ts` (137 tables) into `convex/schema/misc/` domain modules
  (`wallets`, `support`, `workflows`, `referrals`, `crm`, `ai_memory`, `monetization`, `marketing`,
  `integrations`, `ops`, `index`) — no schema change, verified identical table set.
- Refactored `MimoControlPanel.tsx` monolith (~2,000 lines) into `src/components/admin/mimo/`
  shell + `useMimoData` hook + 17 per-tab components.
- Extracted dashboard business logic into `src/lib/hooks/useDashboardData.ts` (one-shot fetch with
  15s timeout) and `useDashboardActions.ts` (2FA, password, referral payout, referral code).
- Sentry error tracking: `@sentry/react` initialized in `src/main.tsx` from `VITE_SENTRY_DSN`
  (frontend-only; the Convex logger stays edge-runtime safe with no Node API imports).
- Component/hook tests added: `CompanyLogo.test.tsx`, `useDashboardData.test.tsx` (5 hook tests),
  plus existing `StatCard`/`BackToTop`/`HolidayBanner`/`TrustedLogos` — 21 frontend tests total.
- `docs/OPERATIONS.md`: production context (1.5M clients, ₦23.6B monthly volume, 99.5% uptime),
  deployment runbook, monitoring, and environment variable reference.
- `terraform/main.tf`: AWS ECS Fargate + ALB IaC for the frontend container.
- `k8s/deployment.yaml`: Deployment, Service, Ingress (cert-manager), and HPA manifests.
- README: CI/tests/security badges, one-command Docker quick start, testing section with live-test
  env flags, and operational context.

### Changed

- `convex/_generated/api.d.ts` updated to reference `schema/misc/index`.
- `scripts/test_deploy.cjs` now requires `ENTERPRISE_TEST_PASSWORD` and `ADMIN_SESSION_TOKEN`.

### Maintenance

- [ ] Rotate production admin password (manual, operator-required).
- [ ] Wire SMTP + Sentry DSN values into production environment.

## [2.5.0] - 2026-07-05

- 15 specialized AI agents across business domains.
- WhatsApp dual-channel system (OpenWA admin + enterprise sessions) with subscription billing and
  Meta API fallback.
- Kora Pay payment processing, wallet auto-sweep, renewals, CAC/tithe deduction schedule.
- Custom admin auth (SessionId in `localStorage.admin_session_token`).
- Resend email OTP auth, AWS SES OTP fallback, security IP blocking.

[Unreleased]: https://github.com/dutchkemsystems/dutchkem-prosuite
[2.5.0]: https://github.com/dutchkemsystems/dutchkem-prosuite/releases/tag/v2.5.0