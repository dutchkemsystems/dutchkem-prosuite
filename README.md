# Dutchkem Ventures ProSuite NG+

**AI-Powered Business Platform with 15 Specialized Agents**

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

## License

Private — Dutchkem Ventures

---

Built with by Dutchkem Ventures
