# ARCHITECTURE.md — Dutchkem Ventures ProSuite NG+

> Complete system architecture documentation.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DUTCHKEM PROSUITE NG+                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ FRONTEND (React 19 + TanStack Router + Vite 8)                       │  │
│  │ • Client Dashboard    • Admin Dashboard    • Enterprise Hub           │  │
│  │ • Agent Interfaces    • Public Pages       • Theme System (8 themes)  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ CONVEX (Serverless Backend)                                           │  │
│  │ • 282 files  • ~324 tables  • 15 AI agents  • HTTP endpoints         │  │
│  │ • Queries, Mutations, Actions, Schedulers, Cron jobs                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│              ┌─────────────────────┼─────────────────────┐                  │
│              ▼                     ▼                     ▼                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ AI PROVIDERS     │  │ PAYMENTS         │  │ SOCIAL/COMMS     │          │
│  │ • OpenRouter     │  │ • Kora Pay       │  │ • Composio       │          │
│  │ • NVIDIA NIM     │  │ • Stripe (partial)│  │ • OpenWA (WhatsApp)│         │
│  │ • HuggingFace    │  │                  │  │ • Resend (email) │          │
│  │ • Replicate      │  │                  │  │ • AWS SES (OTP)  │          │
│  │ • Vercel AI SDK  │  │                  │  │ • Termii (SMS)   │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ SUPPLEMENTARY (Express on Render.com)                                 │  │
│  │ • Webhooks  • OTP  • Socket.io  • OpenWA server  • Legacy endpoints  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
Client Request → TanStack Router → React Component
    → useSuspenseQuery(convexQuery(api.xxx, args))
    → Convex Cloud (query/mutation/action)
    → Database (Convex internal)
    → Response to Component
```

```
Agent Chat Request → Chat Component
    → useAction(api.agents.chat_factory.sendMessage)
    → Convex Action (fetch() to OpenRouter)
    → Llama 3.3 70B Instruct
    → Response streamed back to Component
```

```
Payment Flow → Kora Checkout Component
    → useAction(api.kora_checkout.initiatePayment)
    → Convex Action (fetch() to Kora API)
    → Redirect to Kora Pay page
    → Webhook → Convex HTTP endpoint
    → Update subscription in DB
```

## Agent Architecture

### Agent Lifecycle

```
1. Client sends message → Chat UI component
2. useAction(api.agents.{agent}_chat.sendMessage, { threadId, message })
3. Convex Action receives request
4. @convex-dev/agent creates/continues thread
5. OpenRouter API call (Llama 3.3 70B)
6. Agent tools invoked (generatePDF, webSearch, etc.)
7. Response stored in agent_messages table
8. Response returned to Chat UI
```

### Agent File Pattern

Each agent follows this pattern:
```
convex/agents/
├── config.ts              # All 15 agent configs (prompts, models, tools)
├── registry.ts            # Agent registry builder
├── chat_factory.ts        # Factory function for chat modules
├── {agent}_agent.ts       # Agent definition (uses @convex-dev/agent)
├── {agent}_chat.ts        # Chat module (CRUD for threads/messages)
```

### 15 Agents

| ID | Key | Name | Model | Composio Key |
|----|-----|------|-------|--------------|
| A1 | academic | Academic Writer | Llama 3.3 70B | academic_chat |
| A2 | business | Business Consultant | Llama 3.3 70B | business_chat |
| A3 | content | Content Strategist | Llama 3.3 70B | content_chat |
| A4 | career | Career Coach | Llama 3.3 70B | career_chat |
| A5 | shopping | Personal Shopper | Llama 3.3 70B | shopping_chat |
| A6 | exam_career | Success Specialist | Llama 3.3 70B | exam_career_chat |
| A7 | finance | Finance Advisor | Llama 3.3 70B | finance_chat |
| A8 | video | MediaStudio Pro | Llama 3.3 70B | video_chat |
| A9 | wellness | Wellness Coach | Llama 3.3 70B | wellness_chat |
| A10 | home | Home Management Expert | Llama 3.3 70B | home_chat |
| A11 | language | Language Coach | Llama 3.3 70B | language_chat |
| A12 | travel | Travel Planner | Llama 3.3 70B | travel_chat |
| A13 | certification | Exam Prep Specialist | Llama 3.3 70B | certification_chat |
| A14 | translation | Translation Hub | Llama 3.3 70B | translation_chat |
| A15 | event | Event Maestro | Llama 3.3 70B | event_chat |

## Database Schema

- **File:** `convex/schema.ts` (5,121 lines)
- **Tables:** ~324 defineTable calls
- **Key domains:** Users, Agents, Payments, Enterprise, Ads, Social, KDP, WhatsApp, E-commerce

### Schema Domains

| Domain | Tables | Key Tables |
|--------|--------|------------|
| Core/Auth | ~20 | users, subscriptions, api_keys, audit_logs |
| Agents | ~15 | ai_agents, agent_conversations, agent_messages |
| Payments | ~25 | payment_methods, payouts, kora_webhook_events |
| Enterprise | ~40 | enterprise_organizations, enterprise_members |
| Ad Engine | ~25 | ad_campaigns, ad_ads, ad_flyers |
| Social | ~8 | social_posts, social_platforms, content_calendar |
| E-commerce | ~15 | products, orders, marketplace_listings |
| WhatsApp | ~12 | whatsapp_system_status, whatsapp_subscriptions |
| KDP | ~6 | kdp_projects, kdp_royalties, book_projects |

## Security Architecture

### Authentication Layers

1. **Client Auth:** @convex-dev/auth (email-only, OTP via AWS SES)
2. **Admin Auth:** Custom session-based (localStorage `admin_session_token`)
3. **Enterprise Auth:** Custom org-level auth (org_id + user_id)
4. **2FA:** Google Authenticator (admin required)

### Admin Auth Flow

```
Admin Login → POST /api/admin/login
    → Validate credentials against DB
    → Generate sessionId
    → Store in localStorage as admin_session_token
    → All admin requests include adminToken in args
    → tryGetAdminSession(ctx, adminToken) validates session
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ PRODUCTION                                                       │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Vercel (Frontend)                                        │    │
│  │ • SPA (dist/client)                                      │    │
│  │ • Global CDN                                             │    │
│  │ • Security headers (X-Frame, CSP, etc.)                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                        │
│                          ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Convex (Backend)                                         │    │
│  │ • Serverless DB + Functions                              │    │
│  │ • Auto-scaling                                           │    │
│  │ • HTTP endpoints                                         │    │
│  │ • Cron jobs                                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                        │
│                          ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Render.com (Supplementary)                               │    │
│  │ • Express API server                                     │    │
│  │ • OpenWA WhatsApp gateway                                │    │
│  │ • Socket.io real-time                                    │    │
│  │ • Webhook receivers                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Deploy Commands

```bash
# Frontend (Vercel)
npx vite build
vercel deploy --prod --yes --force

# Backend (Convex)
npx convex deploy --typecheck=disable

# Supplementary (Render.com)
git push origin main  # Auto-deploys via Render blueprint
```

## Performance Considerations

### Convex
- Use `.withIndex()` for all queries (never `.filter()`)
- Use `.take()` for bounded queries (not `.collect()`)
- Use `useConvex().query()` for one-shot fetches (not `useQuery`)
- Per-query try-catch in dashboard (individual failures don't crash)

### Frontend
- Code-split with `React.lazy()` for large components
- Use `useMemo`/`useCallback` for expensive computations
- TanStack Router for automatic code splitting
- Tailwind CSS purging for minimal CSS bundle

### Caching
- TanStack React Query for client-side caching
- Convex handles server-side caching automatically
- Redis cache for supplementary server (if needed)

---

**Last Updated:** 2026-06-27
