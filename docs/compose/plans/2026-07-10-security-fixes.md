# Security Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical security vulnerabilities: unauthenticated endpoints, exposed secrets, XSS risks, and weak token generation.

**Architecture:** Add API key authentication to agent HTTP endpoints, add admin session validation to admin queries, sanitize HTML output, replace Math.random() with crypto-safe alternatives, and remove hardcoded secrets from deploy scripts.

**Tech Stack:** Convex (httpActions, queries, mutations), TypeScript, DOMPurify (for XSS sanitization)

## Global Constraints

- Convex is the ONLY backend. All data lives in `convex/schema.ts`.
- `fetch()` ONLY in `action` functions. Never in `query` or `mutation`.
- Custom admin auth — NOT Convex Auth for admin. SessionId in localStorage `admin_session_token`.
- Actions cannot use `ctx.db` directly — use `ctx.runQuery(internal.auth_helpers.validateAdminSession, { adminToken })`.
- Never use `.filter()` on Convex queries — define an index and use `.withIndex()`.
- Never pass `undefined` as a Convex value — use `null` instead.
- Always include `returns` validator on every Convex function.

---

### Task 1: Add API Key Authentication to Agent HTTP Endpoints

**Covers:** Unauthenticated `/api/agents/a{1-15}/generate` endpoints

**Files:**
- Modify: `convex/http.ts:171-192`
- Modify: `convex/schema/core.ts` (add `api_keys` table if not exists)
- Create: `convex/api_key_helpers.ts`

**Interfaces:**
- Consumes: Existing `agentHandler` function at `convex/http.ts:171`
- Produces: `verifyApiKey` internal query for auth checking

- [ ] **Step 1: Add `api_keys` table to schema**

Read `convex/schema/core.ts` to check if `api_keys` table exists. If not, add:

```typescript
api_keys: defineTable({
  key: v.string(),
  userId: v.id("users"),
  name: v.string(),
  active: v.boolean(),
  createdAt: v.number(),
  lastUsedAt: v.optional(v.number()),
}).index("by_key", ["key"])
  .index("by_user", ["userId"]),
```

- [ ] **Step 2: Create API key verification helper**

Create `convex/api_key_helpers.ts`:

```typescript
import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const verifyApiKey = internalQuery({
  args: { apiKey: v.string() },
  returns: v.object({ valid: v.boolean(), userId: v.optional(v.id("users")) }),
  handler: async (ctx, args) => {
    const keyRecord = await ctx.db
      .query("api_keys")
      .withIndex("by_key", (q) => q.eq("key", args.apiKey))
      .first();
    if (!keyRecord || !keyRecord.active) {
      return { valid: false };
    }
    await ctx.db.patch(keyRecord._id, { lastUsedAt: Date.now() });
    return { valid: true, userId: keyRecord.userId };
  },
});
```

- [ ] **Step 3: Update agentHandler to require API key**

In `convex/http.ts`, replace lines 171-176 with:

```typescript
import { internal as generatedInternal } from "./_generated/api";

const agentHandler = (actionFn: any) => httpAction(async (ctx, req) => {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing x-api-key header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const verification = await ctx.runQuery(generatedInternal.api_key_helpers.verifyApiKey, { apiKey });
  if (!verification.valid) {
    return new Response(JSON.stringify({ error: "Invalid or inactive API key" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { prompt } = await req.json();
  if (!prompt) return new Response("Missing prompt", { status: 400 });
  const result = await ctx.runAction(actionFn, { prompt });
  return new Response(JSON.stringify({ response: result }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
```

- [ ] **Step 4: Verify the build compiles**

Run: `npx vite build`
Expected: Build succeeds without errors.

- [ ] **Step 5: Commit**

```bash
git add convex/http.ts convex/api_key_helpers.ts convex/schema/core.ts
git commit -m "security: add API key authentication to agent HTTP endpoints"
```

---

### Task 2: Add Admin Session Validation to Unauthenticated Admin Queries

**Covers:** `getRecentTransactions`, `getAuditLogs`, `getAdminSessions`, `terminateAllSessions`

**Files:**
- Modify: `convex/admin.ts:401-423`
- Modify: `convex/admin_auth.ts:178-202`
- Modify: `convex/admin_helpers.ts:38-43`

**Interfaces:**
- Consumes: Existing `validateAdminToken` at `convex/admin_helpers.ts:38`
- Produces: Updated queries/mutations with auth checks

- [ ] **Step 1: Fix `validateAdminToken` to actually validate**

In `convex/admin_helpers.ts`, replace lines 38-43 with:

```typescript
export const validateAdminToken = internalQuery({
  args: { adminToken: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db.query("user_sessions")
      .filter(q => q.eq(q.field("sessionId"), args.adminToken))
      .first();
    if (!session) return false;
    if (session.isRevoked) return false;
    if (session.expiresAt && session.expiresAt < Date.now()) return false;
    return true;
  },
});
```

- [ ] **Step 2: Add auth to `getRecentTransactions`**

In `convex/admin.ts`, replace lines 401-410 with:

```typescript
export const getRecentTransactions = query({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const isValid = await ctx.runQuery(internal.admin_helpers.validateAdminToken, { adminToken: args.adminToken });
    if (!isValid) throw new Error("Unauthorized");
    return await ctx.db
      .query("payment_verifications")
      .order("desc")
      .take(20);
  }
});
```

- [ ] **Step 3: Add auth to `getAuditLogs`**

In `convex/admin.ts`, replace lines 415-423 with:

```typescript
export const getAuditLogs = query({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const isValid = await ctx.runQuery(internal.admin_helpers.validateAdminToken, { adminToken: args.adminToken });
    if (!isValid) throw new Error("Unauthorized");
    return await ctx.db
      .query("audit_logs")
      .order("desc")
      .take(50);
  }
});
```

- [ ] **Step 4: Add auth to `getAdminSessions`**

In `convex/admin_auth.ts`, replace lines 178-186 with:

```typescript
export const getAdminSessions = query({
  args: { adminToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const isValid = await ctx.runQuery(internal.admin_helpers.validateAdminToken, { adminToken: args.adminToken });
    if (!isValid) throw new Error("Unauthorized");
    return await ctx.db.query("user_sessions").collect();
  },
});
```

- [ ] **Step 5: Add auth to `terminateAllSessions`**

In `convex/admin_auth.ts`, replace lines 188-202 with:

```typescript
export const terminateAllSessions = mutation({
  args: { adminToken: v.string(), adminEmail: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const isValid = await ctx.runQuery(internal.admin_helpers.validateAdminToken, { adminToken: args.adminToken });
    if (!isValid) throw new Error("Unauthorized");
    const sessions = await ctx.db.query("user_sessions").collect();
    for (const s of sessions) await ctx.db.delete("user_sessions", s._id);
    
    await ctx.runMutation(internal.admin.logAdminAction, {
      adminEmail: args.adminEmail,
      action: "TERMINATE_ALL_SESSIONS",
      details: "Global session termination triggered",
      ip: "internal",
    });
  }
});
```

- [ ] **Step 6: Update frontend callers to pass adminToken**

Search for callers of `getRecentTransactions`, `getAuditLogs`, `getAdminSessions`, `terminateAllSessions` in `src/` and add `adminToken: localStorage.getItem("admin_session_token") || ""` to each call.

- [ ] **Step 7: Verify the build compiles**

Run: `npx vite build`
Expected: Build succeeds without errors.

- [ ] **Step 8: Commit**

```bash
git add convex/admin.ts convex/admin_auth.ts convex/admin_helpers.ts src/
git commit -m "security: add admin session validation to unprotected admin queries"
```

---

### Task 3: Replace Math.random() with Crypto-Safe Alternatives

**Covers:** `admin_helpers.ts` token generation, `crypto_pure.ts`

**Files:**
- Modify: `convex/admin_helpers.ts:5-35`
- Read: `convex/crypto_pure.ts` (check if already fixed)

**Interfaces:**
- Consumes: N/A
- Produces: Secure token generation functions

- [ ] **Step 1: Read `convex/crypto_pure.ts` to check current state**

Check if `crypto_pure.ts` already uses `crypto.getRandomValues()`. If it does, skip this step for that file.

- [ ] **Step 2: Replace Math.random() in `admin_helpers.ts`**

In `convex/admin_helpers.ts`, replace lines 5-35 with:

```typescript
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/** Generate a random ID using crypto-safe randomness */
export const genId = internalMutation({
  args: {},
  handler: async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const array = new Uint32Array(12);
    crypto.getRandomValues(array);
    let id = "";
    for (let i = 0; i < 12; i++) id += chars[array[i] % chars.length];
    return id;
  },
});

/** Generate a session token using crypto-safe randomness */
export const generateToken = internalMutation({
  args: {},
  handler: async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const array = new Uint32Array(32);
    crypto.getRandomValues(array);
    let token = "";
    for (let i = 0; i < 32; i++) token += chars[array[i] % chars.length];
    return token;
  },
});

/** Generate a temporary password using crypto-safe randomness */
export const generateTempPassword = internalMutation({
  args: {},
  handler: async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    const array = new Uint32Array(12);
    crypto.getRandomValues(array);
    let password = "";
    for (let i = 0; i < 12; i++) password += chars[array[i] % chars.length];
    return password;
  },
});

/** Validate admin token */
export const validateAdminToken = internalQuery({
  args: { adminToken: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db.query("user_sessions")
      .filter(q => q.eq(q.field("sessionId"), args.adminToken))
      .first();
    if (!session) return false;
    if (session.isRevoked) return false;
    if (session.expiresAt && session.expiresAt < Date.now()) return false;
    return true;
  },
});
```

- [ ] **Step 3: Verify the build compiles**

Run: `npx vite build`
Expected: Build succeeds without errors.

- [ ] **Step 4: Commit**

```bash
git add convex/admin_helpers.ts
git commit -m "security: replace Math.random() with crypto.getRandomValues() in token generation"
```

---

### Task 4: Sanitize dangerouslySetInnerHTML Usage (XSS Prevention)

**Covers:** XSS in `CustomerSupportChat.tsx` and `EnterpriseFeatures.tsx`

**Files:**
- Modify: `src/components/CustomerSupportChat.tsx:236`
- Modify: `src/components/enterprise/EnterpriseFeatures.tsx:265`

**Interfaces:**
- Consumes: N/A
- Produces: Sanitized HTML output

- [ ] **Step 1: Install DOMPurify**

Run: `npm install dompurify @types/dompurify`

- [ ] **Step 2: Sanitize in CustomerSupportChat.tsx**

At line 236, replace:

```tsx
<div dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }} />
```

with:

```tsx
import DOMPurify from "dompurify";
// ...
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatMarkdown(msg.content)) }} />
```

- [ ] **Step 3: Sanitize in EnterpriseFeatures.tsx**

At line 265, replace:

```tsx
<div dangerouslySetInnerHTML={{ __html: result.svg }} className="inline-block" />
```

with:

```tsx
import DOMPurify from "dompurify";
// ...
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.svg, { USE_PROFILES: { svg: true } }) }} className="inline-block" />
```

- [ ] **Step 4: Verify the build compiles**

Run: `npx vite build`
Expected: Build succeeds without errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/CustomerSupportChat.tsx src/components/enterprise/EnterpriseFeatures.tsx package.json package-lock.json
git commit -m "security: sanitize dangerouslySetInnerHTML to prevent XSS"
```

---

### Task 5: Remove Hardcoded Secrets from Deploy Script

**Covers:** Hardcoded AWS credentials in `scripts/auto-deploy.ps1`

**Files:**
- Modify: `scripts/auto-deploy.ps1:17-20`

**Interfaces:**
- Consumes: N/A
- Produces: Deploy script reads credentials from environment variables

- [ ] **Step 1: Replace hardcoded credentials with env vars**

In `scripts/auto-deploy.ps1`, replace lines 17-20:

```powershell
$AWS_ACCOUNT_ID = "959689755771"
$AWS_USERNAME = "prosuite-opencode"
$AWS_PASSWORD = "OctoPUS@#$19481981"
$AWS_REGION = "us-east-1"
```

with:

```powershell
$AWS_ACCOUNT_ID = $env:AWS_ACCOUNT_ID
$AWS_USERNAME = $env:AWS_USERNAME
$AWS_PASSWORD = $env:AWS_PASSWORD
$AWS_REGION = $env:AWS_REGION ?? "us-east-1"
```

- [ ] **Step 2: Add validation at script start**

Add after the configuration block:

```powershell
if (-not $AWS_ACCOUNT_ID -or -not $AWS_USERNAME -or -not $AWS_PASSWORD) {
    Write-Host "ERROR: AWS credentials not set. Export AWS_ACCOUNT_ID, AWS_USERNAME, AWS_PASSWORD as environment variables." -ForegroundColor Red
    exit 1
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/auto-deploy.ps1
git commit -m "security: remove hardcoded AWS credentials from deploy script"
```

---

### Task 6: Add .env.local and backend/.env to .gitignore and Git History Cleanup Note

**Covers:** Secrets exposed in git history

**Files:**
- Modify: `.gitignore`

**Interfaces:**
- Consumes: N/A
- Produces: Updated .gitignore preventing future commits

- [ ] **Step 1: Ensure .env.local and backend/.env are in .gitignore**

Read `.gitignore` and verify these entries exist. If not, add:

```
.env.local
.env.development.local
.env.production.local
backend/.env
server/.env
```

- [ ] **Step 2: Remove duplicate .env entries**

The analysis found `.env` listed 6 times in `.gitignore`. Consolidate to a single entry.

- [ ] **Step 3: Add security note to README or CLAUDE.md**

Add a note that `.env.local` and `backend/.env` were previously committed and all secrets should be rotated.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "security: consolidate .gitignore entries and ensure all env files excluded"
```

---

### Task 7: Verify All Fixes Compile and Deploy

**Covers:** All tasks above

**Files:** None (verification only)

- [ ] **Step 1: Full build check**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: No new type errors introduced.

- [ ] **Step 3: Deploy to Convex**

Run: `npx convex deploy --typecheck=disable`
Expected: Deploy succeeds.

- [ ] **Step 4: Commit final state**

```bash
git add -A
git commit -m "security: complete security hardening — auth, XSS, secrets, token generation"
```
