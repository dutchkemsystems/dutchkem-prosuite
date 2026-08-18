# Enterprise Real-Time Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time in-app notifications to the enterprise dashboard with a bell icon, unread badge, and dropdown.

**Architecture:** Reuse existing `notifications` table. Add enterprise-scoped Convex query. Create `EnterpriseNotificationBell` component. Wire to enterprise dashboard header.

**Tech Stack:** Convex (backend), React 19 (frontend), TanStack Router, Tailwind CSS 4

## Global Constraints

1. **Convex is the ONLY backend.** All data lives in `convex/schema.ts`.
2. **`fetch()` ONLY in `action` functions.** Never in `query` or `mutation`.
3. **Never use `.filter()`** on Convex queries — define an index and use `.withIndex()`.
4. **Never pass `undefined`** as a Convex value — use `null` instead.
5. **Always include `returns` validator** on every Convex function.
6. **All features are ADDITIVE** — must NOT break existing functionality.

---

## File Structure

| File | Purpose |
|------|---------|
| `convex/enterprise_notifications.ts` | **CREATE** — queries and mutations for enterprise notifications |
| `src/components/enterprise/EnterpriseNotificationBell.tsx` | **CREATE** — bell icon + unread badge + dropdown |
| `src/routes/enterprise/dashboard.tsx` | **MODIFY** — add notification bell to header |

---

### Task 1: Create enterprise notification backend

**Covers:** Enterprise-scoped notification queries and mutations

**Files:**
- Create: `convex/enterprise_notifications.ts`

**Interfaces:**
- Consumes: `notifications` table (existing schema)
- Produces: `getEnterpriseNotifications` query, `markEnterpriseNotificationRead` mutation, `markAllEnterpriseRead` mutation

- [ ] **Step 1: Create the enterprise notifications module**

Create `convex/enterprise_notifications.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// ENTERPRISE NOTIFICATIONS - Real-time in-app notifications
// ═══════════════════════════════════════════════════════════════════

// QUERY: Get notifications for enterprise org (real-time via useQuery)
export const getEnterpriseNotifications = query({
  args: {
    token: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Validate enterprise session
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    
    if (!session || !session.isCurrent) return [];

    // Get org from session
    const org = await ctx.db.get(session.orgId);
    if (!org) return [];

    // Get notifications for this org's users
    const orgUsers = await ctx.db.query("enterprise_org_users")
      .withIndex("by_org", (q: any) => q.eq("orgId", session.orgId))
      .collect();

    const userIds = orgUsers.map((u: any) => u._id);

    // Fetch notifications for all org users, ordered by most recent
    const notifications = [];
    for (const userId of userIds.slice(0, 5)) {
      const userNotifs = await ctx.db.query("notifications")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .order("desc")
        .take(args.limit || 20);
      notifications.push(...userNotifs);
    }

    // Sort by createdAt desc and deduplicate
    const seen = new Set();
    const unique = notifications
      .sort((a: any, b: any) => b.createdAt - a.createdAt)
      .filter((n: any) => {
        if (seen.has(n._id)) return false;
        seen.add(n._id);
        return true;
      })
      .slice(0, args.limit || 20);

    // Count unread
    const unreadCount = unique.filter((n: any) => !n.read).length;

    return { notifications: unique, unreadCount };
  },
});

// MUTATION: Mark single notification as read
export const markEnterpriseNotificationRead = mutation({
  args: {
    notificationId: v.id("notifications"),
    token: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Validate enterprise session
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    
    if (!session || !session.isCurrent) return false;

    // Mark as read
    await ctx.db.patch(args.notificationId, { read: true });
    return true;
  },
});

// MUTATION: Mark all notifications as read for org
export const markAllEnterpriseRead = mutation({
  args: {
    token: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    // Validate enterprise session
    const session = await ctx.db.query("enterprise_sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    
    if (!session || !session.isCurrent) return 0;

    // Get org users
    const orgUsers = await ctx.db.query("enterprise_org_users")
      .withIndex("by_org", (q: any) => q.eq("orgId", session.orgId))
      .collect();

    let count = 0;
    for (const user of orgUsers) {
      const unread = await ctx.db.query("notifications")
        .withIndex("by_user", (q: any) => q.eq("userId", user._id))
        .filter((q: any) => q.eq(q.field("read"), false))
        .collect();
      
      for (const n of unread) {
        await ctx.db.patch(n._id, { read: true });
        count++;
      }
    }
    return count;
  },
});

// MUTATION: Create enterprise notification
export const createEnterpriseNotification = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.string(),
  },
  returns: v.id("notifications"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      title: args.title,
      message: args.message,
      type: args.type,
      read: false,
      createdAt: Date.now(),
    });
  },
});
```

- [ ] **Step 2: Verify build**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add convex/enterprise_notifications.ts
git commit -m "feat: add enterprise notification backend — getEnterpriseNotifications, markRead, markAllRead, createNotification"
```

---

### Task 2: Create EnterpriseNotificationBell component

**Covers:** Bell icon, unread badge, dropdown

**Files:**
- Create: `src/components/enterprise/EnterpriseNotificationBell.tsx`

**Interfaces:**
- Consumes: `api.enterprise_notifications.getEnterpriseNotifications` query, `api.enterprise_notifications.markEnterpriseNotificationRead` mutation, `api.enterprise_notifications.markAllEnterpriseRead` mutation
- Produces: `EnterpriseNotificationBell` React component

- [ ] **Step 1: Create the notification bell component**

Create `src/components/enterprise/EnterpriseNotificationBell.tsx`:

```tsx
import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface EnterpriseNotificationBellProps {
  token: string
}

export function EnterpriseNotificationBell({ token }: EnterpriseNotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const data = useQuery(
    api.enterprise_notifications.getEnterpriseNotifications,
    token ? { token, limit: 20 } : 'skip'
  )
  const markRead = useMutation(api.enterprise_notifications.markEnterpriseNotificationRead)
  const markAllRead = useMutation(api.enterprise_notifications.markAllEnterpriseRead)

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount || 0

  const handleMarkRead = async (id: string) => {
    await markRead({ notificationId: id as any, token })
  }

  const handleMarkAllRead = async () => {
    await markAllRead({ token })
  }

  const typeIcons: Record<string, string> = {
    payment: '💳',
    subscription: '📋',
    agent: '🤖',
    workflow: '🔄',
    security: '🔐',
    system: '📢',
    default: '🔔',
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border relative ${
          isOpen
            ? 'bg-orange-500 border-orange-400 text-white shadow-lg'
            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
        }`}
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-[10px] text-white flex items-center justify-center rounded-full border-2 border-slate-950 font-black shadow-lg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-4 w-96 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <h3 className="font-black text-xs uppercase tracking-widest">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-black text-orange-400 uppercase hover:text-orange-300"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs italic">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n: any) => (
                  <div
                    key={n._id}
                    onClick={() => !n.read && handleMarkRead(n._id)}
                    className={`p-4 border-b border-slate-800 hover:bg-slate-800/30 transition-colors cursor-pointer ${
                      !n.read ? 'bg-orange-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">
                        {typeIcons[n.type] || typeIcons.default}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black truncate">{n.title}</p>
                          {!n.read && (
                            <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                          {n.message}
                        </p>
                        <p className="text-[9px] text-slate-600 mt-1 font-bold uppercase">
                          {new Date(n.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <button className="w-full py-3 bg-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">
              View All Notifications
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/enterprise/EnterpriseNotificationBell.tsx
git commit -m "feat: add EnterpriseNotificationBell component — bell icon, unread badge, dropdown with mark-as-read"
```

---

### Task 3: Wire notification bell to enterprise dashboard header

**Covers:** Enterprise dashboard header integration

**Files:**
- Modify: `src/routes/enterprise/dashboard.tsx`

**Interfaces:**
- Consumes: `EnterpriseNotificationBell` component
- Produces: Updated enterprise dashboard with notification bell in header

- [ ] **Step 1: Add import and wire to header**

In `src/routes/enterprise/dashboard.tsx`, add import after existing imports:

```tsx
import { EnterpriseNotificationBell } from '~/components/enterprise/EnterpriseNotificationBell'
```

In the header section (around line 194), add the notification bell before the status badge:

```tsx
<div className="flex items-center gap-4">
  <EnterpriseNotificationBell token={token} />
  <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
    org.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
    org.status === 'trial' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
    'bg-red-500/10 text-red-400 border border-red-500/20'
  }`}>
    {org.status}
  </div>
</div>
```

- [ ] **Step 2: Verify build**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/routes/enterprise/dashboard.tsx
git commit -m "feat: wire EnterpriseNotificationBell to enterprise dashboard header"
```

---

### Task 4: Run tests and push

**Covers:** Verification and deployment

- [ ] **Step 1: Run tests**

Run: `npx vitest run`
Expected: 291+ tests pass (same as before)

- [ ] **Step 2: Push to GitHub**

Run: `git push origin main`
Expected: Push succeeds

- [ ] **Step 3: Deploy to production**

Run:
```bash
npx convex deploy --typecheck=disable
vercel deploy --prod --yes --force
```

Expected: Deploy succeeds
