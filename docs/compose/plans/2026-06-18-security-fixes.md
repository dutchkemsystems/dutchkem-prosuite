# Security Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix security vulnerabilities and code quality issues in the backend OTP server and HTTP endpoints.

**Architecture:** Minimal targeted fixes to existing files — no new features, no refactoring. Each task is self-contained and verifiable.

**Tech Stack:** Express.js (backend/server.js), Convex HTTP actions (convex/http.ts)

---

### Task 1: Fix weak JWT_SECRET fallback in backend/server.js

**Files:**
- Modify: `backend/server.js:91`

- [ ] **Step 1: Read the current file to confirm the issue**

```bash
grep -n "JWT_SECRET" backend/server.js
```

Expected: Line 91 shows `process.env.JWT_SECRET || 'dutchkem-secret'`

- [ ] **Step 2: Fix the weak fallback**

Replace the fallback with a startup check that fails if JWT_SECRET is not set:

```javascript
// backend/server.js line 89-93
// BEFORE:
const token = jwt.sign(
  { identifier, purpose },
  process.env.JWT_SECRET || 'dutchkem-secret',
  { expiresIn: '7d' }
);

// AFTER:
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}
const token = jwt.sign(
  { identifier, purpose },
  jwtSecret,
  { expiresIn: '7d' }
);
```

- [ ] **Step 3: Verify the fix**

```bash
grep -n "dutchkem-secret" backend/server.js
```

Expected: No matches (the weak fallback is removed)

- [ ] **Step 4: Commit**

```bash
git add backend/server.js
git commit -m "fix: remove weak JWT_SECRET fallback, require env var"
```

---

### Task 2: Remove OTP console logging in backend/server.js

**Files:**
- Modify: `backend/server.js:35`

- [ ] **Step 1: Confirm the issue**

```bash
grep -n "console.log.*OTP" backend/server.js
```

Expected: Line 35 shows OTP being logged to console

- [ ] **Step 2: Remove the console.log**

Delete or comment out line 35:

```javascript
// backend/server.js line 35
// BEFORE:
console.log(`\n🔐 OTP for ${identifier}: ${otp}`);

// AFTER: (remove the line entirely)
```

- [ ] **Step 3: Verify the fix**

```bash
grep -n "console.log.*OTP" backend/server.js
```

Expected: No matches

- [ ] **Step 4: Commit**

```bash
git add backend/server.js
git commit -m "fix: remove OTP console logging for security"
```

---

### Task 3: Remove debug_otp from response in backend/server.js

**Files:**
- Modify: `backend/server.js:56`

- [ ] **Step 1: Confirm the issue**

```bash
grep -n "debug_otp" backend/server.js
```

Expected: Line 56 shows `debug_otp: otp` in the response

- [ ] **Step 2: Remove debug_otp from response**

Delete the `debug_otp` line from the response object:

```javascript
// backend/server.js lines 51-57
// BEFORE:
res.json({
  success: true,
  message: `OTP sent via ${isEmail ? 'email' : 'SMS'}`,
  expiresIn: '10 minutes',
  mode: awsConfigured ? 'aws' : 'fallback',
  debug_otp: otp  // Always show for testing
});

// AFTER:
res.json({
  success: true,
  message: `OTP sent via ${isEmail ? 'email' : 'SMS'}`,
  expiresIn: '10 minutes',
  mode: awsConfigured ? 'aws' : 'fallback',
});
```

- [ ] **Step 3: Verify the fix**

```bash
grep -n "debug_otp" backend/server.js
```

Expected: No matches

- [ ] **Step 4: Commit**

```bash
git add backend/server.js
git commit -m "fix: remove debug_otp from OTP response"
```

---

### Task 4: Replace hardcoded dashboard URL in convex/http.ts

**Files:**
- Modify: `convex/http.ts:38`

- [ ] **Step 1: Confirm the issue**

```bash
grep -n "DASHBOARD_URL" convex/http.ts
```

Expected: Line 38 shows hardcoded Vercel URL

- [ ] **Step 2: Replace with environment variable**

```typescript
// convex/http.ts line 38
// BEFORE:
const DASHBOARD_URL = "https://dutchkem-prosuite-app.vercel.app/admin/dashboard";

// AFTER:
const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://dutchkem-prosuite-app.vercel.app/admin/dashboard";
```

- [ ] **Step 3: Verify the fix**

```bash
grep -n "DASHBOARD_URL" convex/http.ts
```

Expected: Shows the env var with fallback

- [ ] **Step 4: Commit**

```bash
git add convex/http.ts
git commit -m "fix: use env var for dashboard URL with fallback"
```

---

### Task 5: Add .env.example with required variables

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create .env.example**

```bash
# Required for backend server
JWT_SECRET=your-64-char-random-secret-here

# Optional: Dashboard URL (defaults to Vercel production)
# DASHBOARD_URL=https://your-domain.com/admin/dashboard

# AWS Configuration (for OTP SMS)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_SNS_FROM_EMAIL=your-email@example.com

# Convex
VITE_CONVEX_URL=https://your-project.convex.cloud

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

- [ ] **Step 2: Verify .env.example exists**

```bash
cat .env.example
```

Expected: Shows the template with all variables

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "docs: add .env.example with required environment variables"
```

---

### Task 6: Run typecheck and lint to verify no regressions

**Files:**
- None (verification only)

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No new errors

- [ ] **Step 3: Run tests if available**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address lint/typecheck issues"
```

---

## Summary

| Task | Issue | Severity | File |
|------|-------|----------|------|
| 1 | Weak JWT_SECRET fallback | Critical | backend/server.js:91 |
| 2 | OTP logged to console | Critical | backend/server.js:35 |
| 3 | OTP in response body | Critical | backend/server.js:56 |
| 4 | Hardcoded dashboard URL | Important | convex/http.ts:38 |
| 5 | Missing .env.example | Minor | .env.example |
| 6 | Verification | Process | N/A |

**Total changes:** 3 files modified, 1 file created
