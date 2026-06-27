# AGENTS.md — Dutchkem Ventures ProSuite NG+

> **Single source of truth for ALL AI agents working on this project.**
> Read this file first in every session. Do NOT rely on training data for this project.

## Project Overview

Dutchkem Ventures ProSuite NG+ is a comprehensive AI-powered business platform for the Nigerian market featuring 15 specialized AI agents, multi-model AI orchestration, WhatsApp integration via OpenWA, Kora Pay payment processing, and enterprise-grade security.

- **Production URL:** https://dutchkem-prosuite-app.vercel.app
- **Convex Backend:** https://warmhearted-aardvark-280.convex.cloud
- **Convex Site:** https://warmhearted-aardvark-280.convex.site
- **GitHub:** https://github.com/dutchkemsystems/dutchkem-prosuite

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React 19 + TanStack Router | ^19.2.6 |
| Build | Vite 8 | ^8.0.14 |
| Styling | Tailwind CSS 4 | ^4.3.0 |
| Backend | Convex (serverless DB + functions) | ^1.40.0 |
| Auth | @convex-dev/auth | ^0.0.94 |
| Agent Framework | @convex-dev/agent | ^0.6.1 |
| Payments | Kora Pay (Nigerian gateway) | — |
| Social | Composio (11 platforms) | ^0.11.0 |
| AI Models | OpenRouter (Llama 3.3 70B), NVIDIA NIM | — |
| Email OTP | AWS SES | — |
| Deploy | Vercel (frontend) + Convex (backend) | — |

## Critical Rules

1. **Convex is the ONLY backend.** All data lives in `convex/schema.ts` (~324 tables, 5121 lines).
2. **`fetch()` ONLY in `action` functions.** Never in `query` or `mutation`.
3. **NO `btoa()`, `crypto.subtle`, `crypto.randomUUID`** in Convex actions. Allowed in HTTP actions.
4. **Custom admin auth** — NOT Convex Auth for admin. SessionId in localStorage `admin_session_token`.
5. **Actions cannot use `ctx.db` directly** — use `ctx.runQuery(internal.auth_helpers.validateAdminSession, { adminToken })`.
6. **Never use `.filter()`** on Convex queries — define an index and use `.withIndex()`.
7. **Never pass `undefined`** as a Convex value — use `null` instead.
8. **Always include `returns` validator** on every Convex function.
9. **Test properly, push to GitHub BEFORE deploying.** Vercel does NOT auto-deploy on git push.
10. **Deploy manually:** `npx convex deploy --typecheck=disable` then `vercel deploy --prod --yes --force`.
11. **All features are ADDITIVE** — must NOT break existing 15 agents, voice, payments, wallet, auto-sweep, Resend auth.
12. **NO public enterprise registration** — only admin creates organizations and users.
13. **Client auth is email-only** — phone/SMS removed.
14. **`convex-helpers` pinned to exact `0.1.103`** — V0.1.119 has broken exports.
15. **NO `@esbuild/win32-x64`** in package.json — breaks Vercel Linux builds.
16. **Google Sign-In uses flat provider object** — NOT `Google()` helper.
17. **`ConvexAuthProvider` from `@convex-dev/auth/react`** is the ONLY correct provider.
18. **Dashboard uses `useConvex().query()`** (one-shot fetch) — NOT `useQuery` from `convex/react`.
19. **Kora API response field is `status` (boolean)** — NEVER `success`.
20. **Social Engine OAuth redirect URIs must point to Convex site.**

## Deploy Process

```bash
# 1. Build check
npx vite build

# 2. Deploy Convex
npx convex deploy --typecheck=disable

# 3. Deploy Vercel
vercel deploy --prod --yes --force

# 4. Verify health
Invoke-RestMethod -Uri "https://warmhearted-aardvark-280.convex.site/api/health"
```

## Revert

```bash
git checkout backup-pre-theme-system  # or appropriate tag
```
