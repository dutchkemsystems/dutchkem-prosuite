# Contributing to Dutchkem Ventures ProSuite NG+

Thanks for contributing! Read the full technical rules in [`AGENTS.md`](./AGENTS.md) first — it is
the single source of truth for AI agents and humans working on this repo.

## Getting started

```bash
npm install          # install dependencies (uses legacy-peer-deps behavior on some platforms)
npm run dev          # start Vite dev server
npx convex dev       # run Convex locally (optional; needs a CONVEX_URL project)
```

## Project layout

- `convex/` — single backend: schema (`convex/schema.ts` + `convex/schema/` domain modules),
  queries/mutations/actions, crons.
- `src/` — React 19 + TanStack Router frontend.
- `openwa-server/` — Baileys-based WhatsApp connection server (Fly.io).
- `.github/workflows/ci.yml` — security, lint, test, build, docker gates.

## Before you commit

Always run, in order:

```bash
npm run lint         # eslint src (repo baseline is not fully clean yet; don't add new rule classes)
npm run typecheck    # tsc --noEmit --skipLibCheck
npm run test:ci      # vitest with coverage thresholds
npx vite build       # production build must succeed
```

Frontend Vitest runs must use `--pool=threads` on dev machines where the `forks` pool hangs.

## Repository rules (abridged)

1. **Convex is the only backend** — all data lives in `convex/schema.ts` (~324 tables).
2. `fetch()` **only** in `action` functions; never in queries/mutations.
3. No `btoa()`, `crypto.subtle`, or `crypto.randomUUID` in Convex actions (HTTP actions are OK).
4. Custom admin auth — not Convex Auth for admins (`localStorage.admin_session_token`).
5. Never use `.filter()` on Convex queries — define indexes and use `.withIndex()`.
6. Never pass `undefined` as a Convex value — use `null`.
7. Always include a `returns` validator on every Convex function.
8. **All features are additive** — never break the existing 15 agents, voice, payments, wallet,
   auto-sweep, or Resend auth.
9. No public enterprise registration — only admins create organizations/users.
10. Never commit secrets. Scripts requiring credentials must read from env vars.

## Testing

- Component tests live next to components as `*.test.tsx` (see `src/test/setup.ts`).
- Convex tests run under the `convex` Vitest project; several are network/API dependent and may
  fail without live keys — `convex/ad_automation.test.ts` is a reliable schema sanity check.

## Deploying (maintainers only)

```bash
npx vite build
npx convex deploy --typecheck=disable
vercel deploy --prod --yes --force
Invoke-RestMethod -Uri "https://warmhearted-aardvark-280.convex.site/api/health"
```

Push to GitHub **before** deploying — Vercel does not auto-deploy on git push.