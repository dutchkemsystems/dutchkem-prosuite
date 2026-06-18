# Google OAuth Flow — Spinner Never Stops Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Identify and fix all remaining causes of the infinite spinner after Google OAuth sign-in.

**Architecture:** The dashboard uses a two-phase auth gate: `useConvexAuth()` controls the top-level spinner, then a one-shot `convexClient.query()` fetches data. The primary bug (WebSocket subscription race condition) was already fixed by switching from `useQuery` to `useConvex().query()`. This plan addresses the residual issues that can still cause the spinner to hang.

**Tech Stack:** React 19, Convex, TanStack Router, Tailwind CSS v4, `@convex-dev/auth`

---

## Analysis Summary

### Root Cause (Already Fixed)
- `useQuery(api.dashboard.getDashboardData)` created a WebSocket subscription that was sent BEFORE the "Authenticate" message after Google OAuth callback
- Fix: Replaced with `useConvex().query()` (one-shot fetch) in `src/routes/dashboard.tsx:107-118`

### Remaining Issues

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Dashboard data fetch has no timeout — if `convexClient.query()` hangs, spinner is infinite | `src/routes/dashboard.tsx:107-118` | HIGH |
| 2 | `authLoading` state can hang if WebSocket auth never resolves (no timeout on auth gate) | `src/routes/dashboard.tsx:41-47` | MEDIUM (has 8s timeout) |
| 3 | `fetchedRef.current` guard prevents retry in StrictMode but doesn't reset on auth change | `src/routes/dashboard.tsx:105,121` | LOW |
| 4 | `DashboardContent` renders even if `data.user._id` is empty string (not null/undefined) | `src/routes/dashboard.tsx:153` | MEDIUM |
| 5 | No loading timeout for dashboard data fetch itself | `src/routes/dashboard.tsx:130-131` | HIGH |

---

## Task 1: Add fetch timeout to DashboardContent

**Covers:** Issues #1, #5

**Files:**
- Modify: `src/routes/dashboard.tsx:107-131`

- [ ] **Step 1: Add a 15-second timeout to the dashboard data fetch**

In `src/routes/dashboard.tsx`, modify `DashboardContent` to add a fetch timeout:

```tsx
function DashboardContent() {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const convexClient = useConvex();
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [tfaMessage, setTfaMessage] = useState("");
  const [payoutMessage, setPayoutMessage] = useState("");
  const [data, setData] = useState<any>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoadError(null);
      setData(undefined);
      fetchedRef.current = false;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const result = await Promise.race([
        convexClient.query(api.dashboard.getDashboardData),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Dashboard request timed out. Please refresh.")), 15000)
        ),
      ]);
      clearTimeout(timeout);
      setData(result);
      fetchedRef.current = true;
    } catch (err: any) {
      console.error("[Dashboard] Fetch error:", err);
      setLoadError(err?.message || "Failed to load dashboard");
    }
  }, [convexClient]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchDashboard();
    }
  }, [fetchDashboard]);

  // ... rest unchanged
```

- [ ] **Step 2: Fix the empty user ID check**

Change line 153 from:
```tsx
if (!data.user._id) {
```
to:
```tsx
if (!data.user._id || data.user._id === "") {
```

This catches the `emptyReturn` case where `_id` is `""` (not falsy in the truthy check since `""` is falsy, but being explicit prevents future regressions if the default changes).

- [ ] **Step 3: Run typecheck**

```bash
cd C:\dutchkem-ventures-platform-overview; npm run typecheck
```

Expected: PASS with no errors.

- [ ] **Step 4: Run lint**

```bash
cd C:\dutchkem-ventures-platform-overview; npm run lint
```

Expected: PASS or only pre-existing warnings.

- [ ] **Step 5: Commit**

```bash
cd C:\dutchkem-ventures-platform-overview
git add src/routes/dashboard.tsx
git commit -m "fix: add 15s timeout to dashboard data fetch to prevent infinite spinner"
```

---

## Task 2: Add fetch retry button to timeout error state

**Covers:** Issue #1 UX improvement

**Files:**
- Modify: `src/routes/dashboard.tsx:130-151`

- [ ] **Step 1: Add a dedicated timeout error UI with auto-retry**

The current error state (lines 134-151) already shows "Retry" and "Sign In Again" buttons. Verify the timeout error message is clear by checking the error text. No code change needed — the existing error UI handles this case.

- [ ] **Step 2: Verify the timeout error shows the correct message**

After the Task 1 changes, a timeout will show: "Dashboard request timed out. Please refresh." in the error UI at line 139. This is sufficient.

- [ ] **Step 3: Commit (if any changes made)**

Only commit if you made additional changes beyond Task 1.

---

## Task 3: Verify Google OAuth callback flow end-to-end

**Covers:** Full flow verification

**Files:**
- Read-only: `convex/auth.ts`, `convex/http.ts`, `src/routes/auth.tsx`, `src/routes/dashboard.tsx`

- [ ] **Step 1: Verify Google OAuth provider configuration**

Read `convex/auth.ts` and confirm:
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set (line 9)
- Provider uses PKCE checks (line 18)
- Authorization URL is correct: `https://accounts.google.com/o/oauth2/v2/auth` (line 20)
- Token URL is correct: `https://oauth2.googleapis.com/token` (line 29)
- Userinfo URL is correct: `https://www.googleapis.com/oauth2/v3/userinfo` (line 32)
- Profile mapper extracts `sub`, `name`, `email`, `picture`, `email_verified` (lines 34-40)

- [ ] **Step 2: Verify HTTP routes are registered**

Read `convex/http.ts` and confirm `auth.addHttpRoutes(http)` is present (line 11).

- [ ] **Step 3: Verify auth page calls signIn correctly**

Read `src/routes/auth.tsx` line 165 and confirm:
```tsx
await signIn("google", { redirectTo: "/dashboard" })
```

- [ ] **Step 4: Verify dashboard auth gate logic**

Read `src/routes/dashboard.tsx` lines 35-87 and confirm the flow:
1. `useConvexAuth()` returns `{ isAuthenticated, isLoading }`
2. While `authLoading && !authTimeout` → shows `DashboardSpinner`
3. After 8s timeout → shows recovery UI with "Refresh Page" / "Back to Sign In"
4. When `!authLoading && !isAuthenticated` → navigates to `/auth`
5. When `isAuthenticated` → renders `DashboardContent`

- [ ] **Step 5: Verify dashboard data fetch pattern**

Read `src/routes/dashboard.tsx` lines 92-131 and confirm:
1. Uses `convexClient.query(api.dashboard.getDashboardData)` (one-shot, not subscription)
2. Has `fetchedRef` guard against StrictMode double-fetch
3. Sets `data` on success, `loadError` on failure
4. Shows `DashboardSpinner` while `data === undefined && !loadError`

- [ ] **Step 6: No commit needed (read-only verification)**

---

## Task 4: Test the fix locally

**Covers:** End-to-end verification

**Files:**
- None (runtime verification)

- [ ] **Step 1: Start the dev server**

```bash
cd C:\dutchkem-ventures-platform-overview; npm run dev
```

- [ ] **Step 2: Open browser and navigate to `/auth`**

Verify the auth page loads with email form and Google button.

- [ ] **Step 3: Click "SIGN IN WITH GOOGLE"**

Verify:
1. Button shows loading state
2. Browser redirects to Google OAuth consent screen
3. After granting access, browser redirects back to `/dashboard`
4. Spinner shows briefly, then dashboard loads
5. No infinite spinner

- [ ] **Step 4: If spinner persists beyond 15 seconds, check**

1. Open browser DevTools → Console for errors
2. Open Network tab to verify the `getDashboardData` request completes
3. Check if the WebSocket connection is established (Convex transport)

- [ ] **Step 5: No commit needed (manual verification)**

---

## Task 5: Update diagnostic report

**Covers:** Documentation

**Files:**
- Modify: `auto-heal-reports/diagnostic-report-YYYYMMDD-HHMMSS.md` (create new)

- [ ] **Step 1: Create updated diagnostic report**

After verifying the fix, create a new diagnostic report in `auto-heal-reports/` documenting:
- What was tested
- What passed/failed
- The timeout addition
- Any remaining issues

- [ ] **Step 2: Commit**

```bash
cd C:\dutchkem-ventures-platform-overview
git add auto-heal-reports/
git commit -m "docs: add diagnostic report for OAuth spinner fix verification"
```
