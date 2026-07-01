# WhatsApp Sessions, Globalads & AI Analytics Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task.

**Goal:** Fix WhatsApp session toggles, activate Globalads with compliance checks, and make AI Analytics auto-detect models.

**Architecture:** Modify existing components to use toggle buttons, add orchestrator controls to Globalads, and make model analytics dynamic.

**Tech Stack:** React 19, Convex, Tailwind CSS 4

---

## Task 1: Fix WhatsApp Sessions Toggle

**Files:**
- Modify: `src/components/admin/WhatsAppDualPanel.tsx:220-301`
- Modify: `convex/whatsapp_openwa.ts:43-87`

**Changes:**
1. Replace Start/Stop buttons with single toggle switch
2. Show real-time status (connected/disconnected/starting)
3. Auto-refresh status via Convex query

```tsx
// In WhatsAppDualPanel.tsx - Sessions tab
// Replace lines 252-267 with toggle button
<label className="relative inline-flex items-center cursor-pointer">
  <input type="checkbox" checked={connected}
    onChange={async () => {
      if (connected) {
        await handleStopSession(sys)
      } else {
        await handleStartSession(sys)
      }
    }}
    className="sr-only peer" />
  <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
</label>
<span className={`ml-3 text-xs font-bold ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
  {connected ? 'Connected' : 'Disconnected'}
</span>
```

---

## Task 2: Activate Globalads with Toggle Controls

**Files:**
- Modify: `src/components/admin/WhatsAppDualPanel.tsx:422-457`
- Modify: `convex/adOrchestrator.ts:233-316`

**Changes:**
1. Add master toggle for ad orchestrator
2. Add per-platform toggles
3. Add WhatsApp compliance info

```tsx
// In WhatsAppDualPanel.tsx - Global Ads tab
// Add before campaigns grid
const adStatus: any = useQuery(api.adOrchestrator.getOrchestratorStatus)
const toggleAdOrchestrator = useMutation(api.adOrchestrator.toggleOrchestrator)
const toggleAdPlatform = useMutation(api.adOrchestrator.togglePlatform)

// Master toggle card
<div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
  <div className="flex items-center justify-between mb-4">
    <div>
      <p className="font-black">🌍 Global Ad Automation</p>
      <p className="text-xs text-slate-400">Auto-post adverts across all platforms</p>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={adStatus?.enabled ?? false}
        onChange={async () => {
          await toggleAdOrchestrator({
            enabled: !(adStatus?.enabled ?? false),
            adminToken
          })
        }}
        className="sr-only peer" />
      <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
    </label>
  </div>
  
  {/* WhatsApp Compliance Notice */}
  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
    <p className="text-xs text-amber-400 font-bold">⚠️ WhatsApp Compliance</p>
    <p className="text-[10px] text-slate-400 mt-1">
      • Only NEW contacts receive adverts • Rate limit: 1,000/day • 1% complaint threshold
    </p>
  </div>
  
  {/* Platform toggles */}
  <div className="grid grid-cols-3 gap-2">
    {adStatus?.platforms?.map((p: any) => (
      <div key={p.id} className="flex items-center gap-2 bg-slate-800 rounded-lg p-2">
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={p.enabled}
            onChange={async () => {
              await toggleAdPlatform({
                platformId: p.id,
                enabled: !p.enabled,
                adminToken
              })
            }}
            className="sr-only peer" />
          <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
        </label>
        <span className="text-[10px] text-slate-400">{p.id}</span>
      </div>
    ))}
  </div>
</div>
```

---

## Task 3: Make AI Analytics Auto-Detect Models

**Files:**
- Modify: `convex/model_analytics.ts:156-206`
- Modify: `convex/model_analytics.ts:250-337`

**Changes:**
1. Replace hardcoded model list with dynamic detection from usage data
2. Add new models to color/icon maps automatically

```typescript
// In model_analytics.ts - getModelPerformance
// Replace line 164: const models = ["groq", "openrouter", "aiml", "mimo", "nvidia"];
// With:
const allModels = [...new Set(all.map(u => u.modelName))];
const models = allModels.length > 0 ? allModels : ["groq", "openrouter", "aiml", "mimo", "nvidia"];

// In model_analytics.ts - getModelRevenue
// Replace line 284: const models = ["groq", "openrouter", "aiml", "mimo", "nvidia"];
// With:
const allModels = [...new Set(periodUsage.map(u => u.modelName))];
const models = allModels.length > 0 ? allModels : ["groq", "openrouter", "aiml", "mimo", "nvidia"];
```

```tsx
// In ModelAnalyticsPanel.tsx - Update color/icon maps
const MODEL_COLORS: Record<string, string> = {
  groq: '#FBBF24', openrouter: '#60A5FA', aiml: '#A78BFA', mimo: '#34D399', nvidia: '#4ADE80',
}
const MODEL_ICONS: Record<string, string> = {
  groq: '⚡', openrouter: '🧠', aiml: '🎨', mimo: '🚀', nvidia: '🟢',
}

// Add fallback for unknown models
// Line 76: {MODEL_ICONS[model] || '🤖'}
// Line 121: {MODEL_ICONS[model.model] || '🤖'}
// These already have fallbacks - no change needed
```

---

## Task 4: Add Social Connection Status Check

**Files:**
- Modify: `src/components/admin/HermesDashboard.tsx:131-177`

**Changes:**
1. Show connection status for each platform
2. Add "Connect" button for disconnected platforms

```tsx
// In HermesDashboard.tsx - Platform Gateway section
// Modify lines 167-175 to show connection status
<div className="grid grid-cols-3 md:grid-cols-6 gap-2">
  {platforms?.slice(0, 12).map((p: any) => (
    <div key={p.id} className={`p-2 rounded-xl text-center text-xs ${
      p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 
      p.connected ? 'bg-blue-500/10 text-blue-400' :
      'bg-slate-800 text-slate-500'
    }`}>
      <span className="text-lg">{p.icon}</span>
      <p className="mt-1 truncate">{p.name}</p>
      <p className="text-[8px] mt-0.5">
        {p.connected ? '🟢 Connected' : p.status === 'active' ? '🟡 Available' : '⚪ Inactive'}
      </p>
    </div>
  ))}
</div>
```

---

## Task 5: Verify Build & Deploy

**Steps:**
1. Run `npx vite build` to verify no errors
2. Run `npx convex deploy --typecheck=disable` if schema changes
3. Run `vercel deploy --prod --yes --force`

---

## Summary of Changes

| Component | Issue | Fix |
|-----------|-------|-----|
| WhatsApp Sessions | Button not reflecting status | Toggle switch with real-time status |
| Globalads | No controls to enable/disable | Master toggle + per-platform toggles |
| AI Analytics | Hardcoded model list | Dynamic detection from usage data |
| Social Handles | No connection visibility | Status indicators in Hermes dashboard |
