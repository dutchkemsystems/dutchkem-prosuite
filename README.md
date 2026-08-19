# Dutchkem Ventures ProSuite NG+

**AI-Powered Business Platform with 15 Specialized Agents**

[![CI Status](https://github.com/dutchkemsystems/dutchkem-prosuite/actions/workflows/ci.yml/badge.svg)](https://github.com/dutchkemsystems/dutchkem-prosuite/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-480%2B-brightgreen)](https://github.com/dutchkemsystems/dutchkem-prosuite)
[![Security](https://img.shields.io/badge/security-gitleaks%20scanned-blue)](https://github.com/dutchkemsystems/dutchkem-prosuite/actions/workflows/ci.yml)
[![Stack](https://img.shields.io/badge/stack-React%2019%20%2B%20Convex-8B5CF6)](https://github.com/dutchkemsystems/dutchkem-prosuite)
[![License](https://img.shields.io/badge/license-CC%20BY--NC--ND%204.0-lightgrey)](https://github.com/dutchkemsystems/dutchkem-prosuite)

## Overview

Dutchkem Ventures ProSuite NG+ is an enterprise-grade AI platform built for the Nigerian market. It features 15 specialized AI agents across academic, business, content, career, finance, health, and more domains.

- **Production:** https://dutchkem-prosuite-app.vercel.app
- **Backend:** Convex (serverless DB + functions)
- **GitHub:** https://github.com/dutchkemsystems/dutchkem-prosuite

## Key Features

### 15 AI Agents

| Agent | Name | Best For |
|-------|------|----------|
| A1 | Academic Writer | Thesis & Research |
| A2 | Business Consultant | Business Planning |
| A3 | Content Strategist | Content Creation |
| A4 | Career Coach | CV & Interview |
| A5 | Personal Shopper | Shopping & Deals |
| A6 | Success Specialist | Exam & Career Prep |
| A7 | Finance Advisor | Budget & Investing |
| A8 | MediaStudio Pro | Video & Animation |
| A9 | Wellness Coach | Wellness & Fitness |
| A10 | Home Management | Home Services |
| A11 | Language Coach | Translation & Learning |
| A12 | Travel Planner | Travel & Itineraries |
| A13 | Exam Prep Specialist | Test Preparation |
| A14 | Translation Hub | Transcription |
| A15 | Event Maestro | Events & Parties |

### Integrations

- **AI Models:** OpenRouter (Llama 3.3 70B), NVIDIA NIM
- **Payments:** Kora Pay (Nigerian gateway)
- **Social:** Composio (X, LinkedIn, Facebook, Instagram, TikTok, YouTube, Pinterest, Reddit, Threads, Discord, Bluesky)
- **WhatsApp:** OpenWA self-hosted gateway
- **Email:** AWS SES + Resend (failover)
- **SMS:** Termii (legacy)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TanStack Router + Vite 8 |
| Styling | Tailwind CSS 4 |
| Backend | Convex (serverless) |
| Auth | @convex-dev/auth |
| Payments | Kora Pay |
| Deploy | Vercel + Convex |

## Quick Start

### One-Command Startup (Docker)

```bash
docker-compose up --build
```

That's it — the app will be available at http://localhost:3000.

```bash
# Run the test suite inside the container
docker-compose run test

# Stop everything
docker-compose down
```

### Local Development

```bash
# Clone
git clone https://github.com/dutchkemsystems/dutchkem-prosuite
cd dutchkem-prosuite

# Install
npm install

# Environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Dev server
npm run dev

# Build
npx vite build

# Deploy
npx convex deploy --typecheck=disable
vercel deploy --prod --yes --force
```

## Testing

The repository ships a comprehensive Vitest suite (460+ Convex function tests + React component tests) split across two projects (`convex` edge-runtime and `frontend` jsdom).

```bash
# Run the full suite
npm test

# Frontend only (with coverage thresholds)
npm run test:coverage

# CI mode (same as GitHub Actions)
npm run test:ci
```

Live-integration tests (real LLM providers, Pollinations.ai image generation, deployed-backend E2E) are opt-in via env flags so the default suite is deterministic:

```bash
RUN_LLM_TESTS=true npm test    # live model API tests
RUN_IMAGE_TESTS=true npm test  # Pollinations.ai image generation
RUN_E2E=true npm test          # live Convex deployment E2E
```

## Operational Context

Dutchkem ProSuite NG+ is a production system currently serving:

- **1,500,000+ active clients** across Nigeria
- **₦23.6B monthly transaction volume** (operational context)
- **99.5% uptime** over the last 12 months
- **15 specialized AI agents** handling academic, business, content, career, finance, and wellness workloads
- **10,000+ concurrent users** sustained during peak hours

### Deployment Architecture

| Layer | Service |
|-------|---------|
| Frontend | Vercel (React 19 + Vite 8) |
| Backend + DB | Convex (serverless functions + ~324 tables) |
| AI Models | OpenRouter + NVIDIA NIM (multi-model failover chain) |
| Payments | Kora Pay (Nigerian gateway) |
| Social | Composio (11 platforms) + OpenWA WhatsApp gateway |
| Email | AWS SES + Resend failover |
| Monitoring | Sentry + structured logging |

## Project Structure

```
dutchkem-prosuite/
├── src/                    # Frontend (React + TanStack Router)
│   ├── components/         # 100+ React components
│   ├── routes/             # File-based routing
│   ├── theme/              # Theme system (8 themes)
│   └── lib/                # Utility modules
├── convex/                 # Backend (282 files, ~324 tables)
│   ├── agents/             # 15 agent configs + chat factories
│   ├── enterprise/         # Enterprise module
│   ├── schema.ts           # Database schema (5121 lines)
│   ├── http.ts             # HTTP endpoints
│   └── crons.ts            # Scheduled tasks
├── server/                 # Express API (supplementary)
├── scripts/                # Utility scripts (54 files)
└── docs/                   # Documentation
```

## Documentation

| File | Purpose |
|------|---------|
| AGENTS.md | Primary instruction file for AI agents |
| CLAUDE.md | Claude Code + Convex guidelines |
| MEMORY.md | Persistent project memory |
| ARCHITECTURE.md | System architecture |
| CODING_STANDARDS.md | Development standards |
| DEPLOYMENT.md | Deployment guide |
| OPERATIONS.md | Production context, scale, and runbook |
| CHANGELOG.md | Versioned release history |
| CONTRIBUTING.md | Contribution guidelines |

## License

Private — Dutchkem Ventures

---

Built with by Dutchkem Ventures
