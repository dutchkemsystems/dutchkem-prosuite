# Fix Failing Tests & Remove Hardcoded API Keys

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 failing tests in `agent_routing.test.ts` and remove all hardcoded API keys from committed source code.

**Architecture:** Tests fail due to (1) real LLM API calls timing out and (2) missing `@convex-dev/agent` component registration in test harness. One hardcoded OmniRoute API key exists in two files. All other keys already use `process.env.*` (Convex env vars) correctly.

**Tech Stack:** Vitest, convex-test, @convex-dev/agent

## Global Constraints

- Never hardcode API keys in source code
- All keys must come from `process.env.*` (Convex dashboard env vars)
- `.env.local` is gitignored — real keys live there locally, never committed
- Tests must pass without requiring real API keys

---

## Task 1: Fix agent_routing.test.ts — Timeout Issues

**Files:**
- Modify: `convex/agent_routing.test.ts`

**Problem:** Tests 1 & 2 call `finance_chat.generateSimpleResponse` and `academic_chat.generateSimpleResponse` which invoke real NVIDIA NIM API calls. The default 5s vitest timeout is too short for LLM API round-trips.

**Solution:** Increase test timeout to 30s for the two LLM-calling tests.

- [ ] **Step 1: Add timeout to the two LLM-calling tests**

In `convex/agent_routing.test.ts`, change the two test declarations to include a timeout:

```typescript
test("finance agent suggests academic pro for thesis request", async () => {
  // ... existing code ...
}, 30000);

test("academic agent suggests finance pro for budget question", async () => {
  // ... existing code ...
}, 30000);
```

- [ ] **Step 2: Run tests to verify timeout fix**

Run: `npx vitest run convex/agent_routing.test.ts --reporter=verbose`
Expected: Tests 1 & 2 should now pass (or timeout at 30s instead of 5s — both are acceptable since they depend on external API availability).

---

## Task 2: Fix agent_routing.test.ts — Missing Agent Component

**Files:**
- Modify: `convex/agent_routing.test.ts`

**Problem:** Test 3 ("agent handles own domain correctly") fails with `Component "agent" is not registered`. The `chat_factory.ts` uses `getAgent()` which accesses `components.agent`, but the test harness doesn't register this component.

**Solution:** Register the agent component in the test setup using `convexTest`'s component registration.

- [ ] **Step 1: Read how other tests register components**

Check `convex/agents.test.ts` for patterns on registering the agent component.

- [ ] **Step 2: Register the agent component in agent_routing.test.ts**

Add component registration before the test that needs it. The `convex-test` library supports `t.registerComponent` for this purpose.

- [ ] **Step 3: Run tests to verify component fix**

Run: `npx vitest run convex/agent_routing.test.ts --reporter=verbose`
Expected: Test 3 should no longer fail with "Component not registered".

---

## Task 3: Remove Hardcoded OmniRoute API Key

**Files:**
- Modify: `convex/ai_router.ts:288`
- Modify: `backend/src/services/supportOrchestrator.service.js:12`

**Problem:** Both files contain a hardcoded fallback API key: `sk-18db7f217782cdf6-bced63-ec54f7d1`. This key is visible in git history and should never be in source code.

**Solution:** Remove the hardcoded fallback. If the env var is missing, fail gracefully with an error message instead of silently using a leaked key.

- [ ] **Step 1: Fix convex/ai_router.ts**

Change line 288 from:
```typescript
const omnirouteKey = process.env.OMNIROUTE_API_KEY || 'sk-18db7f217782cdf6-bced63-ec54f7d1';
```
To:
```typescript
const omnirouteKey = process.env.OMNIROUTE_API_KEY;
if (!omnirouteKey) {
  return { success: false, error: "OMNIROUTE_API_KEY not configured" };
}
```

- [ ] **Step 2: Fix backend/src/services/supportOrchestrator.service.js**

Change line 12 from:
```javascript
this.omnirouteApiKey = 'sk-18db7f217782cdf6-bced63-ec54f7d1';
```
To:
```javascript
this.omnirouteApiKey = process.env.OMNIROUTE_API_KEY || '';
```

- [ ] **Step 3: Run full test suite to verify no regressions**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass (or same pass/fail count as before minus the 3 agent_routing failures).

---

## Task 4: Verify .env Files Are Gitignored

**Files:**
- Check: `.gitignore`

**Problem:** `.env.local` contains real API keys. Must ensure it stays gitignored.

- [ ] **Step 1: Verify .env.local is in .gitignore**

Run: `git check-ignore .env.local`
Expected: Returns `.env.local` (already confirmed working)

- [ ] **Step 2: Verify no env files are tracked**

Run: `git ls-files | grep -E '\.env'`
Expected: Only `.env.example` should appear (template file), not `.env`, `.env.local`, or `.env.development.local`

---

## Verification

After all tasks complete:

```bash
npx vitest run --reporter=verbose
```

Expected: 289+ tests pass. The 3 agent_routing failures should be resolved (or reduced to only timeout-dependent tests that need live API).
