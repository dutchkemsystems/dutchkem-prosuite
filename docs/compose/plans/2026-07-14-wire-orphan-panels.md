# Wire 9 Orphan Panels into Admin Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 9 existing but unwired admin panels to the admin dashboard sidebar and content area.

**Architecture:** Single-file change to `src/routes/admin/dashboard.tsx` — add lazy imports, sidebar tabs, and content renders for each panel.

**Tech Stack:** React 19, TanStack Router, Convex, Tailwind CSS 4

## Global Constraints

1. **Convex is the ONLY backend.** All data lives in `convex/schema.ts`.
2. **All features are ADDITIVE** — must NOT break existing 55+ tabs.
3. **Test properly, push to GitHub BEFORE deploying.**

---

## Panel Inventory

| # | Component | File | Props | Icon |
|---|-----------|------|-------|------|
| 1 | PredictiveAnalyticsPanel | `src/components/admin/PredictiveAnalyticsPanel.tsx` | none | 🔮 |
| 2 | MarketingFunnelPanel | `src/components/admin/MarketingFunnelPanel.tsx` | none | 📧 |
| 3 | VoiceVideoPanel | `src/components/admin/VoiceVideoPanel.tsx` | none | 🎬 |
| 4 | WhiteLabelPanel | `src/components/admin/WhiteLabelPanel.tsx` | adminToken | 🏷️ |
| 5 | SalesAgentPanel | `src/components/admin/SalesAgentPanel.tsx` | adminToken | 💰 |
| 6 | OpenDesignPanel | `src/components/admin/OpenDesignPanel.tsx` | adminToken | 🎨 |
| 7 | DynamicPricingPanel | `src/components/admin/DynamicPricingPanel.tsx` | none | 💲 |
| 8 | UltimatePlatformPanel | `src/components/admin/UltimatePlatformPanel.tsx` | none | 🚀 |
| 9 | BlockchainPanel | `src/components/admin/BlockchainPanel.tsx` | none | ⛓️ |

---

### Task 1: Wire all 9 panels into admin dashboard

**Files:**
- Modify: `src/routes/admin/dashboard.tsx`

**Steps:**

- [ ] **Step 1: Add 9 lazy imports** after line 72 (after the last existing import)

```tsx
// Orphan panels (previously built but unwired)
const PredictiveAnalyticsPanel = lazy(() => import("~/components/admin/PredictiveAnalyticsPanel").then(m => ({ default: m.PredictiveAnalyticsPanel })));
const MarketingFunnelPanel = lazy(() => import("~/components/admin/MarketingFunnelPanel").then(m => ({ default: m.MarketingFunnelPanel })));
const VoiceVideoPanel = lazy(() => import("~/components/admin/VoiceVideoPanel").then(m => ({ default: m.VoiceVideoPanel })));
const WhiteLabelPanel = lazy(() => import("~/components/admin/WhiteLabelPanel").then(m => ({ default: m.WhiteLabelPanel })));
const SalesAgentPanel = lazy(() => import("~/components/admin/SalesAgentPanel").then(m => ({ default: m.SalesAgentPanel })));
const OpenDesignPanel = lazy(() => import("~/components/admin/OpenDesignPanel").then(m => ({ default: m.OpenDesignPanel })));
const DynamicPricingPanel = lazy(() => import("~/components/admin/DynamicPricingPanel").then(m => ({ default: m.DynamicPricingPanel })));
const UltimatePlatformPanel = lazy(() => import("~/components/admin/UltimatePlatformPanel").then(m => ({ default: m.UltimatePlatformPanel })));
const BlockchainPanel = lazy(() => import("~/components/admin/BlockchainPanel").then(m => ({ default: m.BlockchainPanel })));
```

- [ ] **Step 2: Add 9 sidebar tabs** after the "Support Orchestrator" tab (line 198)

```tsx
<AdminTab active={activeTab === "predictive"} onClick={() => setActiveTab("predictive")} icon="🔮" label="Predictive Analytics" onClose={() => setSidebarOpen(false)} />
<AdminTab active={activeTab === "marketing-funnel"} onClick={() => setActiveTab("marketing-funnel")} icon="📧" label="Marketing Funnel" onClose={() => setSidebarOpen(false)} />
<AdminTab active={activeTab === "voice-video"} onClick={() => setActiveTab("voice-video")} icon="🎬" label="Voice & Video" onClose={() => setSidebarOpen(false)} />
<AdminTab active={activeTab === "white-label"} onClick={() => setActiveTab("white-label")} icon="🏷️" label="White-Label AI" onClose={() => setSidebarOpen(false)} />
<AdminTab active={activeTab === "sales-agent"} onClick={() => setActiveTab("sales-agent")} icon="💰" label="AI Sales Agent" onClose={() => setSidebarOpen(false)} />
<AdminTab active={activeTab === "open-design"} onClick={() => setActiveTab("open-design")} icon="🎨" label="Open Design" onClose={() => setSidebarOpen(false)} />
<AdminTab active={activeTab === "dynamic-pricing"} onClick={() => setActiveTab("dynamic-pricing")} icon="💲" label="Dynamic Pricing" onClose={() => setSidebarOpen(false)} />
<AdminTab active={activeTab === "ultimate"} onClick={() => setActiveTab("ultimate")} icon="🚀" label="Ultimate Platform" onClose={() => setSidebarOpen(false)} />
<AdminTab active={activeTab === "blockchain"} onClick={() => setActiveTab("blockchain")} icon="⛓️" label="Blockchain" onClose={() => setSidebarOpen(false)} />
```

- [ ] **Step 3: Add 9 content renders** after the "support-orch" render (line 262)

```tsx
{activeTab === "predictive" && <PredictiveAnalyticsPanel />}
{activeTab === "marketing-funnel" && <MarketingFunnelPanel />}
{activeTab === "voice-video" && <VoiceVideoPanel />}
{activeTab === "white-label" && <WhiteLabelPanel adminToken={adminToken} />}
{activeTab === "sales-agent" && <SalesAgentPanel adminToken={adminToken} />}
{activeTab === "open-design" && <OpenDesignPanel adminToken={adminToken} />}
{activeTab === "dynamic-pricing" && <DynamicPricingPanel />}
{activeTab === "ultimate" && <UltimatePlatformPanel />}
{activeTab === "blockchain" && <BlockchainPanel />}
```

- [ ] **Step 4: Verify build**

Run: `npx vite build`
Expected: Build succeeds with no errors

- [ ] **Step 5: Commit**

```bash
git add src/routes/admin/dashboard.tsx
git commit -m "feat: wire 9 orphan panels into admin dashboard — predictive analytics, marketing funnel, voice/video, white-label, sales agent, open design, dynamic pricing, ultimate platform, blockchain"
```
