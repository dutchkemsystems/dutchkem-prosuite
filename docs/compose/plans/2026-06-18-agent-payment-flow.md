# Agent Payment & Delivery Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the agent selection modal to show all 15 agents with correct navigation, and add access granted confirmation after payment.

**Architecture:** Minimal changes to existing dashboard.tsx — update the agent list, fix navigation paths, add a confirmation modal after payment redirect. The agent chat UI already exists in each agent page.

**Tech Stack:** React, TanStack Router, Convex (existing backend)

---

### Task 1: Fix Agent Selection Modal — Show All 15 Agents with Correct Navigation

**Files:**
- Modify: `src/routes/dashboard.tsx:270-294`

- [ ] **Step 1: Read the current modal code**

The current modal (lines 270-294) shows only 8 agents and navigates to `/` (home page). We need to:
1. Add all 15 agents
2. Navigate to the correct agent page (e.g., `/academic-writer`)

- [ ] **Step 2: Update the agent list and navigation**

Replace lines 270-294 with:

```tsx
<div className="grid grid-cols-2 gap-3">
  {[
    { icon: "🎓", name: "Academic Writer", agentId: "A1", path: "/academic-writer" },
    { icon: "💼", name: "Business Consultant", agentId: "A2", path: "/business-consultant" },
    { icon: "✍️", name: "Content Strategist", agentId: "A3", path: "/content-writer" },
    { icon: "📄", name: "Career Coach", agentId: "A4", path: "/career-coach" },
    { icon: "🛍️", name: "Personal Shopper", agentId: "A5", path: "/personal-shopper" },
    { icon: "📝", name: "Exam Prep", agentId: "A6", path: "/exam-prep" },
    { icon: "💰", name: "Finance Advisor", agentId: "A7", path: "/finance-advisor" },
    { icon: "🎬", name: "MediaStudio", agentId: "A8", path: "/video-production" },
    { icon: "🏥", name: "Wellness Coach", agentId: "A9", path: "/wellness-coach" },
    { icon: "🧹", name: "Home Services", agentId: "A10", path: "/home-management" },
    { icon: "🗣️", name: "Language Tutor", agentId: "A11", path: "/language-coach" },
    { icon: "✈️", name: "Travel Planner", agentId: "A12", path: "/travel-planner" },
    { icon: "🚀", name: "ServiceMart NG", agentId: "A13", path: "/exam-success" },
    { icon: "📝", name: "Translation Hub", agentId: "A14", path: "/translation-hub" },
    { icon: "🎉", name: "Event Planner", agentId: "A15", path: "/event-planner" },
  ].map((agent) => {
    const enhancement = data.agentEnhancement?.find((e: any) => e.agentId === agent.agentId);
    return (
      <button key={agent.agentId} onClick={() => navigate({ to: agent.path })} className="p-4 bg-slate-800 rounded-2xl border border-slate-700 hover:border-indigo-500 transition-all text-left relative">
        {enhancement?.enhanced && (
          <span className="absolute top-2 right-2 text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">⚡ Enhanced</span>
        )}
        <div className="text-2xl mb-2">{agent.icon}</div>
        <div className="font-bold text-sm">{agent.name}</div>
        {enhancement?.enhanced && <div className="text-[10px] text-emerald-400 mt-1">{enhancement.toolCount} tools active</div>}
      </button>
    );
  })}
</div>
```

- [ ] **Step 3: Remove the "View All 15 Agents" button**

Since all 15 agents are now shown, remove line 294:
```tsx
// DELETE this line:
<button onClick={() => navigate({ to: "/" })} className="w-full py-4 bg-indigo-600 rounded-xl font-bold">View All 15 Agents</button>
```

- [ ] **Step 4: Verify the changes**

Run: `npm run typecheck`
Expected: No new errors

- [ ] **Step 5: Commit**

```bash
git add src/routes/dashboard.tsx
git commit -m "feat: show all 15 agents in selection modal with correct navigation"
```

---

### Task 2: Add Access Granted Confirmation After Payment

**Files:**
- Modify: `src/routes/dashboard.tsx`

- [ ] **Step 1: Check for URL parameter after payment redirect**

When Kora Pay redirects back, it may include a `?payment=success` parameter. We need to detect this and show a confirmation.

Add this at the top of the DashboardPage component (after the existing state declarations):

```tsx
const [showAccessGranted, setShowAccessGranted] = useState(false);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("payment") === "success") {
    setShowAccessGranted(true);
    // Clean up URL
    window.history.replaceState({}, "", window.location.pathname);
    // Auto-dismiss after 5 seconds
    setTimeout(() => setShowAccessGranted(false), 5000);
  }
}, []);
```

- [ ] **Step 2: Add the Access Granted modal**

Add this after the existing modals (before the closing `</div>` of the modal container):

```tsx
{showAccessGranted && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in-95 duration-300">
      <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 text-4xl mx-auto mb-6 border border-emerald-500/20">✓</div>
      <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Access Granted!</h2>
      <p className="text-slate-400 mb-6 font-medium">Your subscription is now active. You have full access to all 15 AI agents.</p>
      <div className="space-y-2 text-left text-sm text-slate-300 mb-6">
        <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> All 15 agents unlocked</div>
        <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Unlimited tasks</div>
        <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Priority response time</div>
        <div className="flex items-center gap-2"><span className="text-emerald-400">✓</span> File generation</div>
      </div>
      <button
        onClick={() => {
          setShowAccessGranted(false);
          setModal("new-project");
        }}
        className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-bold text-white hover:from-orange-600 hover:to-orange-700 transition-all"
      >
        Start Your First Project →
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 3: Verify the changes**

Run: `npm run typecheck`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add src/routes/dashboard.tsx
git commit -m "feat: add access granted confirmation after payment"
```

---

### Task 3: Verify End-to-End Flow

**Files:**
- None (verification only)

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: No new errors

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Deploy to Vercel**

```bash
vercel --prod --yes
```

Expected: Deployment succeeds

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address typecheck issues"
```

---

## Summary

| Task | Issue | Severity | File |
|------|-------|----------|------|
| 1 | Agent selection shows only 8 agents, wrong navigation | Important | src/routes/dashboard.tsx |
| 2 | No access granted confirmation after payment | Important | src/routes/dashboard.tsx |
| 3 | Verification | Process | N/A |

**Total changes:** 1 file modified (dashboard.tsx)
