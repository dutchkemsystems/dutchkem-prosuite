# Client Dashboard Workflow Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the complete client dashboard workflow: New Project → Agent Selection → Chat → Payment → Confirmation → Service Delivery, plus Browse All Agents, Buy Credits, Full History, and Admin-Client Communication.

**Architecture:** Add new Convex backend functions for agent browsing, credit purchases, history, and communication. Add new TanStack Router routes and React components for the enhanced workflow. All new features are ADDITIVE — no existing code is modified.

**Tech Stack:** TanStack Router, Convex, React, Tailwind CSS, `@convex-dev/agent`, Kora Pay integration

---

## File Structure

### New Files to Create:
- `src/components/dashboard/AgentBrowser.tsx` — Browse all agents modal (reusable)
- `src/components/dashboard/CreditPackages.tsx` — Buy credits modal with packages
- `src/components/dashboard/PaymentModal.tsx` — Kora payment integration modal
- `src/components/dashboard/ConfirmationModal.tsx` — Payment success confirmation
- `src/components/dashboard/HistoryPanel.tsx` — Full history view
- `src/components/dashboard/SupportChat.tsx` — Admin-client communication widget
- `src/components/dashboard/ServiceDeliveryView.tsx` — Post-payment service delivery
- `convex/credits.ts` — Credit purchase and balance functions
- `convex/client_history.ts` — Client history queries
- `convex/client_support.ts` — Admin-client communication functions

### Files to Modify:
- `src/routes/dashboard.tsx` — Add new sidebar tabs and modals
- `src/routes/__root.tsx` — Add new routes to navbar-hide list

---

## Task 1: Credit System Backend

**Covers:** Feature 3 (Buy Credits), Feature 4 (History)

**Files:**
- Create: `convex/credits.ts`

- [ ] **Step 1: Create credits.ts with queries and mutations**

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getBalance = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .unique();
    if (!user) return 0;
    const wallet = await ctx.db
      .query("client_wallets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    return wallet?.balance ?? 0;
  },
});

export const getCreditPackages = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      credits: v.number(),
      price: v.number(),
      label: v.string(),
    })
  ),
  handler: async () => {
    return [
      { id: "p1", credits: 100, price: 1000, label: "Best for light usage" },
      { id: "p2", credits: 500, price: 4500, label: "Save 10%" },
      { id: "p3", credits: 1000, price: 8000, label: "⭐ Most Popular! Save 20%" },
      { id: "p4", credits: 5000, price: 35000, label: "Save 30%" },
      { id: "p5", credits: 10000, price: 60000, label: "Save 40%" },
    ];
  },
});

export const addCredits = mutation({
  args: { amount: v.number(), reference: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .unique();
    if (!user) throw new Error("User not found");

    let wallet = await ctx.db
      .query("client_wallets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const balanceBefore = wallet?.balance ?? 0;
    const newBalance = balanceBefore + args.amount;

    if (wallet) {
      await ctx.db.patch(wallet._id, {
        balance: newBalance,
        totalEarned: (wallet.totalEarned ?? 0) + args.amount,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("client_wallets", {
        userId: user._id,
        balance: newBalance,
        pendingWithdrawals: 0,
        totalEarned: args.amount,
        totalWithdrawn: 0,
        lastUpdated: Date.now(),
      });
    }

    await ctx.db.insert("client_wallet_transactions", {
      userId: user._id,
      type: "credit",
      amount: args.amount,
      balanceBefore,
      balanceAfter: newBalance,
      description: `Credit purchase (${args.amount} credits)`,
      reference: args.reference,
      createdAt: Date.now(),
    });

    return null;
  },
});

export const getTransactions = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.string(),
      type: v.string(),
      amount: v.number(),
      balanceAfter: v.number(),
      description: v.string(),
      reference: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .unique();
    if (!user) return [];

    const txns = await ctx.db
      .query("client_wallet_transactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);

    return txns.map((t) => ({
      _id: t._id,
      type: t.type,
      amount: t.amount,
      balanceAfter: t.balanceAfter,
      description: t.description,
      reference: t.reference,
      createdAt: t.createdAt,
    }));
  },
});
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit` in the project root.
Expected: No errors related to `convex/credits.ts`.

- [ ] **Step 3: Commit**

```bash
git add convex/credits.ts
git commit -m "feat: add credit system backend (balance, packages, transactions)"
```

---

## Task 2: Client History Backend

**Covers:** Feature 4 (View Full History)

**Files:**
- Create: `convex/client_history.ts`

- [ ] **Step 1: Create client_history.ts**

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getFullHistory = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.string(),
      type: v.string(),
      title: v.string(),
      description: v.string(),
      amount: v.optional(v.number()),
      status: v.optional(v.string()),
      date: v.number(),
      metadata: v.optional(v.any()),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .unique();
    if (!user) return [];

    const items: Array<{
      _id: string;
      type: string;
      title: string;
      description: string;
      amount?: number;
      status?: string;
      date: number;
      metadata?: any;
    }> = [];

    // Subscriptions
    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
    for (const s of subs) {
      items.push({
        _id: s._id,
        type: "subscription",
        title: `${s.plan} Plan`,
        description: `Subscription ${s.status}`,
        status: s.status,
        date: s.endsAt,
        metadata: { plan: s.plan, service: s.service },
      });
    }

    // Projects
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
    for (const p of projects) {
      items.push({
        _id: p._id,
        type: "project",
        title: p.name,
        description: `Agent: ${p.agentId} — ${p.status}`,
        status: p.status,
        date: p.createdAt,
        metadata: { agentId: p.agentId, format: p.format },
      });
    }

    // Wallet transactions
    const txns = await ctx.db
      .query("client_wallet_transactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
    for (const t of txns) {
      items.push({
        _id: t._id,
        type: "payment",
        title: t.description,
        description: `${t.type}: ₦${t.amount.toLocaleString()}`,
        amount: t.amount,
        date: t.createdAt,
        metadata: { reference: t.reference },
      });
    }

    // Sort by date descending
    items.sort((a, b) => b.date - a.date);
    return items.slice(0, 100);
  },
});
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add convex/client_history.ts
git commit -m "feat: add client history backend (subscriptions, projects, transactions)"
```

---

## Task 3: Support/Communication Backend

**Covers:** Feature 5 (Admin-Client Communication)

**Files:**
- Create: `convex/client_support.ts`

- [ ] **Step 1: Create client_support.ts**

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getMessages = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.string(),
      role: v.string(),
      content: v.string(),
      timestamp: v.number(),
      read: v.boolean(),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .unique();
    if (!user) return [];

    const msgs = await ctx.db
      .query("communication_logs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);

    return msgs.map((m) => ({
      _id: m._id,
      role: m.direction === "outbound" ? "admin" : "client",
      content: m.content,
      timestamp: m.createdAt,
      read: m.status !== "pending",
    }));
  },
});

export const sendMessage = mutation({
  args: { content: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .unique();
    if (!user) throw new Error("User not found");

    await ctx.db.insert("communication_logs", {
      userId: user._id,
      type: "email",
      direction: "inbound",
      recipient: "support@dutchkem.com",
      content: args.content,
      status: "pending",
      createdAt: Date.now(),
    });

    // Create notification for admin
    await ctx.db.insert("notifications", {
      title: "New Support Message",
      message: `${user.name || user.email}: ${args.content.slice(0, 100)}`,
      type: "support",
      read: false,
      createdAt: Date.now(),
    });

    return null;
  },
});
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add convex/client_support.ts
git commit -m "feat: add client support communication backend"
```

---

## Task 4: Agent Browser Component

**Covers:** Feature 1 (Agent Selection), Feature 2 (Browse All Agents)

**Files:**
- Create: `src/components/dashboard/AgentBrowser.tsx`

- [ ] **Step 1: Create AgentBrowser.tsx**

```tsx
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

const AGENTS = [
  { id: "A1", icon: "🎓", name: "Academic Writer", description: "Thesis, research papers, data analysis", path: "/academic-writer" },
  { id: "A2", icon: "💼", name: "Business Consultant", description: "Strategy, planning, market analysis", path: "/business-consultant" },
  { id: "A3", icon: "✍️", name: "Content Strategist", description: "Blog posts, SEO, copywriting", path: "/content-writer" },
  { id: "A4", icon: "📄", name: "Career Coach", description: "CV, cover letters, interview prep", path: "/career-coach" },
  { id: "A5", icon: "🛍️", name: "Personal Shopper", description: "Product sourcing, price comparison", path: "/personal-shopper" },
  { id: "A6", icon: "📝", name: "Exam Prep", description: "Study plans, practice questions", path: "/exam-prep" },
  { id: "A7", icon: "💰", name: "Finance Advisor", description: "Budgeting, investments, tax planning", path: "/finance-advisor" },
  { id: "A8", icon: "🎬", name: "MediaStudio", description: "Video production, editing, effects", path: "/video-production" },
  { id: "A9", icon: "🏥", name: "Wellness Coach", description: "Health plans, fitness, nutrition", path: "/wellness-coach" },
  { id: "A10", icon: "🧹", name: "Home Services", description: "Cleaning, maintenance, organization", path: "/home-management" },
  { id: "A11", icon: "🗣️", name: "Language Tutor", description: "Language learning, translation prep", path: "/language-coach" },
  { id: "A12", icon: "✈️", name: "Travel Planner", description: "Itineraries, bookings, travel tips", path: "/travel-planner" },
  { id: "A13", icon: "🚀", name: "ServiceMart NG", description: "Local services, errands, delivery", path: "/exam-success" },
  { id: "A14", icon: "📝", name: "Translation Hub", description: "Document translation, localization", path: "/translation-hub" },
  { id: "A15", icon: "🎉", name: "Event Planner", description: "Weddings, corporate events, parties", path: "/event-planner" },
];

interface AgentBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'modal' | 'page';
}

export function AgentBrowser({ isOpen, onClose, mode = 'modal' }: AgentBrowserProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const filteredAgents = AGENTS.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  const content = (
    <div className={mode === 'modal' ? 'w-full max-w-5xl' : 'w-full'}>
      {mode === 'modal' && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-white">Select an Agent</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
        </div>
      )}
      
      {mode === 'page' && (
        <div className="mb-6">
          <h1 className="text-3xl font-black text-white mb-2">All Agents</h1>
          <p className="text-slate-400">Select an agent to get started with personalized AI assistance.</p>
        </div>
      )}

      <input
        type="text"
        placeholder="Search agents..."
        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-h-[60vh] overflow-y-auto pr-2">
        {filteredAgents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => {
              navigate({ to: agent.path });
              onClose();
            }}
            className="p-5 bg-slate-800 rounded-2xl border border-slate-700 hover:border-indigo-500 hover:bg-slate-750 transition-all text-left group"
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{agent.icon}</div>
            <div className="font-bold text-sm text-white mb-1">{agent.name}</div>
            <div className="text-xs text-slate-400 leading-relaxed">{agent.description}</div>
            <div className="mt-3 text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Chat now →</div>
          </button>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="py-12 text-center text-slate-500">No agents found.</div>
      )}
    </div>
  );

  if (mode === 'page') return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl w-full max-w-5xl">
        {content}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/AgentBrowser.tsx
git commit -m "feat: add AgentBrowser component with search and navigation"
```

---

## Task 5: Credit Packages Component

**Covers:** Feature 3 (Buy Credits)

**Files:**
- Create: `src/components/dashboard/CreditPackages.tsx`

- [ ] **Step 1: Create CreditPackages.tsx**

```tsx
import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

interface CreditPackagesProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreditPackages({ isOpen, onClose }: CreditPackagesProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const packages = useQuery(api.credits.getCreditPackages);
  const addCredits = useMutation(api.credits.addCredits);

  const handlePurchase = async () => {
    if (!selectedPackage || !packages) return;
    const pkg = packages.find(p => p.id === selectedPackage);
    if (!pkg) return;

    // In production, integrate with Kora Pay here
    // For now, directly add credits
    await addCredits({
      amount: pkg.credits,
      reference: `cr_${Date.now()}_${pkg.id}`,
    });
    
    alert(`${pkg.credits} credits added successfully!`);
    onClose();
  };

  if (!isOpen || !packages) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-white">Buy Credits</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
        </div>

        <p className="text-slate-400 text-sm mb-4">Choose your credit package:</p>

        <div className="space-y-3">
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                selectedPackage === pkg.id
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">{pkg.credits.toLocaleString()} Credits</div>
                  <div className="text-xs text-slate-400">{pkg.label}</div>
                </div>
                <div className="text-xl font-black text-indigo-400">₦{pkg.price.toLocaleString()}</div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handlePurchase}
          disabled={!selectedPackage}
          className="w-full mt-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-bold text-white hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:grayscale"
        >
          Buy Now
        </button>

        <p className="text-center text-[10px] text-slate-600 mt-3 font-bold uppercase tracking-widest">
          Secured by Kora Pay • PCI DSS Compliant
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/CreditPackages.tsx
git commit -m "feat: add CreditPackages component with purchase flow"
```

---

## Task 6: History Panel Component

**Covers:** Feature 4 (View Full History)

**Files:**
- Create: `src/components/dashboard/HistoryPanel.tsx`

- [ ] **Step 1: Create HistoryPanel.tsx**

```tsx
import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryPanel({ isOpen, onClose }: HistoryPanelProps) {
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const history = useQuery(api.client_history.getFullHistory);

  if (!isOpen) return null;

  const filtered = (history ?? []).filter(item => {
    const matchesFilter = filter === 'all' || item.type === filter;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const typeStyles: Record<string, string> = {
    subscription: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    project: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    payment: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-white">Full History</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex gap-3 mb-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none"
          >
            <option value="all">All</option>
            <option value="subscription">Subscriptions</option>
            <option value="project">Projects</option>
            <option value="payment">Payments</option>
          </select>
          <input
            type="text"
            placeholder="Search..."
            className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500">No history found.</div>
          ) : (
            filtered.map((item) => (
              <div key={item._id} className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{item.title}</div>
                    <div className="text-xs text-slate-400 mt-1">{item.description}</div>
                    <div className="text-[10px] text-slate-600 mt-2 font-bold uppercase">
                      {new Date(item.date).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-[10px] rounded-full font-bold border ${typeStyles[item.type] || ''}`}>
                      {item.type}
                    </span>
                    {item.amount && (
                      <span className="text-sm font-bold text-emerald-400">₦{item.amount.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/HistoryPanel.tsx
git commit -m "feat: add HistoryPanel component with filtering and search"
```

---

## Task 7: Support Chat Component

**Covers:** Feature 5 (Admin-Client Communication)

**Files:**
- Create: `src/components/dashboard/SupportChat.tsx`

- [ ] **Step 1: Create SupportChat.tsx**

```tsx
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

interface SupportChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportChat({ isOpen, onClose }: SupportChatProps) {
  const [input, setInput] = useState('');
  const messages = useQuery(api.client_support.getMessages);
  const sendMessage = useMutation(api.client_support.sendMessage);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage({ content: input });
    setInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-black text-white">Support Chat</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Typically responds within 24h</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">✕</button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {(!messages || messages.length === 0) && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">💬</div>
              <p className="text-slate-500 text-sm">Send a message to our support team.</p>
            </div>
          )}
          {messages?.map((msg) => (
            <div key={msg._id} className={`flex ${msg.role === 'client' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                msg.role === 'client'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-200 border border-slate-700'
              }`}>
                {msg.content}
                <div className="text-[9px] opacity-50 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-4 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/SupportChat.tsx
git commit -m "feat: add SupportChat component for admin-client communication"
```

---

## Task 8: Update Dashboard with New Modals

**Covers:** All Features (integration point)

**Files:**
- Modify: `src/routes/dashboard.tsx`

- [ ] **Step 1: Add imports and state to DashboardContent**

Add these imports after the existing imports in `dashboard.tsx`:

```typescript
import { AgentBrowser } from '~/components/dashboard/AgentBrowser';
import { CreditPackages } from '~/components/dashboard/CreditPackages';
import { HistoryPanel } from '~/components/dashboard/HistoryPanel';
import { SupportChat } from '~/components/dashboard/SupportChat';
```

Add these state variables after the existing state in `DashboardContent`:

```typescript
const [showAgentBrowser, setShowAgentBrowser] = useState(false);
const [showCredits, setShowCredits] = useState(false);
const [showHistory, setShowHistory] = useState(false);
const [showSupport, setShowSupport] = useState(false);
```

- [ ] **Step 2: Update sidebar navigation**

Replace the existing nav section with additional tabs. Add after the "Settings" TabButton:

```tsx
<TabButton active={activeTab === "browse-agents"} onClick={() => { setActiveTab("browse-agents"); setSidebarOpen(false); }} icon="🤖" label="Browse Agents" />
<TabButton active={activeTab === "history"} onClick={() => { setActiveTab("history"); setSidebarOpen(false); }} icon="📜" label="Full History" />
<TabButton active={activeTab === "support"} onClick={() => { setActiveTab("support"); setSidebarOpen(false); }} icon="💬" label="Support" />
```

- [ ] **Step 3: Add tab content renderers**

Add after the existing tab renders:

```tsx
{activeTab === "browse-agents" && (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
    <AgentBrowser isOpen={true} onClose={() => setActiveTab("overview")} mode="page" />
  </div>
)}
{activeTab === "history" && (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
    <HistoryPanel isOpen={true} onClose={() => setActiveTab("overview")} />
  </div>
)}
{activeTab === "support" && (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
    <SupportChat isOpen={true} onClose={() => setActiveTab("overview")} />
  </div>
)}
```

- [ ] **Step 4: Update Quick Actions in Overview**

Replace the existing Quick Actions section. Find the `ActionButton` for "Browse All Agents" and change its onClick:

```tsx
<ActionButton icon="🎓" text="Browse All Agents" onClick={() => setShowAgentBrowser(true)} />
```

Replace "Buy Credits" ActionButton:

```tsx
<ActionButton icon="💰" text="Buy Credits" onClick={() => setShowCredits(true)} />
```

Replace "View Full History" ActionButton:

```tsx
<ActionButton icon="📜" text="View Full History" onClick={() => setShowHistory(true)} />
```

Replace "Support" ActionButton:

```tsx
<ActionButton icon="🔧" text="Support" onClick={() => setShowSupport(true)} />
```

- [ ] **Step 5: Add modals at end of main content**

Add before the closing `</main>` tag:

```tsx
<AgentBrowser isOpen={showAgentBrowser} onClose={() => setShowAgentBrowser(false)} />
<CreditPackages isOpen={showCredits} onClose={() => setShowCredits(false)} />
<HistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} />
<SupportChat isOpen={showSupport} onClose={() => setShowSupport(false)} />
```

- [ ] **Step 6: Update "New Project" modal agent grid**

In the existing `modal === "new-project"` section, add a "Browse All" button at the bottom of the agent grid:

```tsx
<button
  onClick={() => { setModal(null); setShowAgentBrowser(true); }}
  className="col-span-2 p-4 bg-slate-800 rounded-2xl border border-dashed border-slate-600 hover:border-indigo-500 transition-all text-center"
>
  <div className="text-2xl mb-2">🔍</div>
  <div className="font-bold text-sm text-slate-400">Browse All 15 Agents</div>
</button>
```

- [ ] **Step 7: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/routes/dashboard.tsx
git commit -m "feat: integrate AgentBrowser, CreditPackages, HistoryPanel, SupportChat into dashboard"
```

---

## Task 9: Update Root Routes

**Covers:** Feature 2 (Browse All Agents — same window)

**Files:**
- Modify: `src/routes/__root.tsx`

- [ ] **Step 1: Add new routes to navbar-hide list**

In `__root.tsx`, update the `isDashboard` check to also hide navbar for new routes. Add the new paths to the array:

```typescript
const isDashboard = location.pathname.startsWith('/dashboard') || 
                    location.pathname.startsWith('/admin') ||
                    [
                      '/academic-writer', '/business-consultant', '/content-writer', 
                      '/career-coach', '/personal-shopper', '/exam-prep', 
                      '/finance-advisor', '/video-production', '/wellness-coach', 
                      '/home-management', '/language-coach', '/travel-planner', 
                      '/exam-success', '/translation-hub', '/event-planner',
                      '/all-agents', '/history', '/support'
                    ].includes(location.pathname)
```

- [ ] **Step 2: Create AllAgentsPage route**

Create `src/routes/all-agents.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { AgentBrowser } from '~/components/dashboard/AgentBrowser'

export const Route = createFileRoute('/all-agents')({
  component: AllAgentsPage,
})

function AllAgentsPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <AgentBrowser isOpen={true} onClose={() => {}} mode="page" />
    </div>
  )
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/__root.tsx src/routes/all-agents.tsx
git commit -m "feat: add /all-agents route and update root layout"
```

---

## Task 10: Final Integration Verification

**Covers:** All Features

- [ ] **Step 1: Run full typecheck**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds without errors.

- [ ] **Step 3: Run dev server and manual test**

Run: `npm run dev`
Expected: Dev server starts on localhost:3000.

Manual test checklist:
1. Navigate to `/dashboard` → Click "Browse All Agents" → Modal opens with 15 agents
2. Click any agent → Navigates to agent chat page
3. Click "Buy Credits" → Credit packages modal opens
4. Click "View Full History" → History panel opens with filters
5. Click "Support" → Support chat modal opens
6. Click sidebar "Browse Agents" tab → Full agents page renders
7. Click sidebar "Full History" tab → History renders
8. Click sidebar "Support" tab → Support chat renders
9. Click "New Project" modal → "Browse All 15 Agents" link appears
10. All existing dashboard tabs still work (overview, activity, subscriptions, kdp, projects, referrals, security, settings)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete client dashboard workflow integration"
```

---

## Summary of Changes

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Buy Credits | `convex/credits.ts` | `CreditPackages.tsx` | ✅ |
| Full History | `convex/client_history.ts` | `HistoryPanel.tsx` | ✅ |
| Support Chat | `convex/client_support.ts` | `SupportChat.tsx` | ✅ |
| Browse Agents | — | `AgentBrowser.tsx` + `/all-agents` route | ✅ |
| Dashboard Integration | — | Modified `dashboard.tsx` | ✅ |
| New Project Enhanced | — | Updated modal with "Browse All" link | ✅ |
