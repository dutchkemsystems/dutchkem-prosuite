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
- Added husky + lint-staged pre-commit hooks for secret scanning and linting.
- Removed hardcoded test password from `guardian_watch.ts` (now uses env var + random fallback).
- Added input validation helpers (`convex/lib/validation.ts`) for API boundary checks.

> **Admin password rotation:** the production admin password is scheduled for rotation. See the
> pending credential-rotation item under [Maintenance](#maintenance) — it cannot be completed from
> an automated session and must be done by an operator.

### Added

- CI/CD hardening: new `.github/workflows/ci.yml` (security → lint → test → build → docker) and
  removed the mismatched Ruby/RSpec `prosuite-ci.yml`.
- Vitest suite (`vitest.config.ts` `projects` config + `src/test/setup.ts`) with coverage thresholds
  at 80% lines/functions/statements, 70% branches.
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
- `terraform/variables.tf` and `terraform/outputs.tf`: complete variable definitions and outputs.
- `.github/workflows/terraform.yml`: Terraform CI with fmt, validate, plan, tfsec, checkov scans.
- `k8s/deployment.yaml`: Deployment, Service, Ingress (cert-manager), and HPA manifests.
- README: CI/tests/security badges, one-command Docker quick start, testing section with live-test
  env flags, and operational context.
- `.devcontainer/devcontainer.json`: VS Code dev container with Node 20 and extensions.
- `scripts/check-env-vars.js`: CI script that verifies all `process.env.*` references are
  documented in `.env.example`.
- `convex/lib/errors.ts`: `AppError` class with standardized error codes and HTTP status mapping.
- `convex/lib/validation.ts`: Input validation helpers (`assertNonEmpty`, `assertPositive`,
  `assertValidEmail`, `assertValidUrl`, `assertEnum`, `assertArrayMinLength`).
- `renovate.json`: Automated dependency update configuration.
- `v3.0.0` tag for the modular architecture overhaul.

### Changed (v3.0.0 — Modular Architecture Overhaul)

- **Split `convex/trypost.ts`** (1,523 LOC) into 14 modular files under `convex/trypost/`
  (brand_profile, scheduled_posts, workflows, carousels, analytics, captions, media, templates,
  comments, more, internal, constants, platforms, index).
- **Split `RevenueHub.tsx`** (1,477 LOC) into 17 tab components under `src/components/admin/revenue/`
  (OverviewTab, CreditsTab, SocialTab, MarketplaceTab, OutcomesTab, WhiteLabelTab, AnalyticsTab,
  CommerceTab, ConsultingTab, ApiAccessTab, AutoEngageTab, SubscriptionsTab, AgentPricingTab,
  EnterpriseAddonsTab, RevenueHub, shared, index).
- **Split `dashboard.tsx`** (1,331 LOC) into 9 modular files under `src/routes/dashboard/`
  (overview, security, projects, referrals, settings, activity, buy-credits-modal, shared, index).
- **Split `ai-panels.tsx`** (1,218 LOC) into 7 panel files under `src/components/admin/panels/ai/`
  (PlatformAnalyticsPanel, UserManagementPanel, UnifiedAnalyticsPanel, SyntheticIntelPanel,
  AdEnginePanel, shared, index).
- **Split `fileGenerator.ts`** (1,202 LOC) into 13 generator files under `src/lib/fileGenerator/`
  (pdf, docx, xlsx, pptx, csv, txt, json, mp3, mp4, download, parser, types, index).
- **Split `support_orchestrator.ts`** (1,164 LOC) into 10 modules under `convex/support/`
  (agents, business_hours, queue, load_balancing, auto_responses, intent, process_message,
  interactions, escalations, index).
- **Split `http.ts`** (1,029 LOC) into 10 route modules under `convex/http/`
  (otp, agents, webhooks, social, telegram, admin, auto-heal, proxy, orchestrator, misc).
- **Split `general-panels.tsx`** (1,023 LOC) into 11 panel files under
  `src/components/admin/panels/general/`.
- **Split `TryPostScheduler.tsx`** (1,004 LOC) into 15 component files under
  `src/components/trypost/`.
- **Split `ComposioObservability.tsx`** (885 LOC) into 8 component files under
  `src/components/composio/`.
- **Split `platform_actions.ts`** (1,061 LOC) into 10 modules under
  `convex/social/platform_actions/`.
- ESLint now covers both `src/` and `convex/` directories.
- Coverage thresholds raised from 50% to 80% (lines/functions/statements).
- `orchestrator.verify.test.ts` made conditional on `RUN_E2E` env var.

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