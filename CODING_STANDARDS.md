# CODING_STANDARDS.md — Dutchkem Ventures ProSuite NG+

> Development standards and best practices for all contributors.

## Tech Stack Standards

| Layer | Standard |
|-------|----------|
| Language | TypeScript (strict mode) |
| Frontend | React 19 + TanStack Router |
| Styling | Tailwind CSS 4 (utility-first) |
| Backend | Convex (serverless functions) |
| Build | Vite 8 |
| Testing | Vitest |
| Linting | ESLint 9 |

## Naming Conventions

```typescript
// Variables: camelCase
const userName = "John";

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;

// Functions: verbNoun
function getUserById(id: string) { }

// Classes: PascalCase
class UserService { }

// React Components: PascalCase
function UserProfile({ }: { userId: string }) { }

// Convex functions: camelCase
export const getDashboardData = query({ });

// Files: kebab-case
// user-profile.tsx, user-service.ts
```

## File Organization

```
src/
├── components/           # React components (PascalCase)
│   ├── dashboard/        # Dashboard-specific components
│   ├── admin/            # Admin-specific components
│   └── enterprise/       # Enterprise-specific components
├── routes/               # TanStack Router file-based routes
├── theme/                # Theme system
├── lib/                  # Utility modules
└── styles/               # Global CSS

convex/
├── agents/               # Agent configs and chat factories
├── enterprise/           # Enterprise module
├── _generated/           # Auto-generated (DO NOT EDIT)
├── schema.ts             # Database schema
├── http.ts               # HTTP endpoints
└── crons.ts              # Scheduled tasks
```

## Convex Standards

### Function Syntax
```typescript
import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";

// Always include returns validator
export const getSomething = query({
  args: { userId: v.string() },
  returns: v.object({ name: v.string() }),
  handler: async (ctx, args) => {
    // Use .withIndex() not .filter()
    const user = await ctx.db
      .query("users")
      .withIndex("by_id", (q) => q.eq("_id", args.userId))
      .first();
    return { name: user?.name ?? "" };
  },
});
```

### Critical Rules
1. **`fetch()` ONLY in `action` functions** — never in query/mutation
2. **Always include `returns` validator** — use `v.null()` for void
3. **Never pass `undefined`** — use `null` instead
4. **Never use `.filter()`** — define index and use `.withIndex()`
5. **Actions cannot use `ctx.db`** — use `ctx.runQuery`/`ctx.runMutation`
6. **Never pass functions to `ctx.runQuery`** — use `api.x.y` references

## React Standards

### Component Pattern
```typescript
import { useState, useEffect } from "react";
import { useQuery } from "@convex-dev/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";

function MyComponent({ userId }: { userId: string }) {
  // Use useSuspenseQuery + convexQuery (NOT useQuery from convex/react)
  const { data: user } = useSuspenseQuery(
    convexQuery(api.users.get, { userId })
  );

  const [loading, setLoading] = useState(false);

  return (
    <div className="p-4 bg-slate-900 rounded-2xl">
      <h2 className="text-lg font-bold">{user.name}</h2>
    </div>
  );
}

export default MyComponent;
```

### Styling
- Use Tailwind CSS utility classes
- Dark theme: `bg-slate-900`, `border-slate-800`, `text-white`
- Cards: `rounded-2xl p-8 border border-slate-800`
- Buttons: `px-6 py-3 rounded-xl font-bold transition-all`
- Animations: Framer Motion for complex, CSS for simple

## Git Workflow

### Commit Messages
```
feat: Add WhatsApp integration
fix: Resolve authentication bug
docs: Update API documentation
style: Format code
refactor: Simplify agent router
test: Add unit tests
chore: Update dependencies
```

### Branch Strategy
```
main           ← Production-ready code
├── develop    ← Integration branch
│   ├── feature/*  ← New features
│   └── fix/*      ← Bug fixes
└── release/*   ← Release preparation
```

### Deploy Process
```bash
# 1. Build check
npx vite build

# 2. Deploy Convex
npx convex deploy --typecheck=disable

# 3. Deploy Vercel
vercel deploy --prod --yes --force

# 4. Verify
Invoke-RestMethod -Uri "https://warmhearted-aardvark-280.convex.site/api/health"
```

## Testing

```bash
# Run tests
npx vitest

# Type check
npx tsc --noEmit --skipLibCheck

# Lint
npm run lint
```

## Security

### Never
- Hardcode secrets in code
- Log sensitive data
- Use weak passwords
- Trust user input without validation
- Commit `.env` or `.env.local`

### Always
- Use environment variables
- Validate all user input with Zod
- Encrypt sensitive data (AES-256)
- Use HTTPS in production
- Implement rate limiting
- Follow OWASP guidelines

---

**Last Updated:** 2026-06-27
