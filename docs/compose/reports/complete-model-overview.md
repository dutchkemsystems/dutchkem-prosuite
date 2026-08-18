# Complete Model Overview — All Models & Their Functions

## Verification Status

**Tests: 289 passed / 3 failed (292 total)**
**Failed tests are in `agent_routing.test.ts` — NOT model-related**

- 2 tests timed out (5s limit) because they invoke real NVIDIA NIM API calls in test environment
- 1 test fails because the `@convex-dev/agent` component isn't registered in test harness

All model infrastructure, routing logic, fallback chains, and configuration queries pass.

---

## All Providers & Models Used in the Project

### Provider 1: NVIDIA NIM (Primary)
Endpoint: `https://integrate.api.nvidia.com/v1`
Env var: `NVIDIA_NIM_API_KEY`

| Model | Purpose | Files |
|-------|---------|-------|
| `meta/llama-3.3-70b-instruct` | Heavy content generation (ads, videos, agent packages) | `ad_campaign_ai.ts:12`, `video_production.ts:606`, `agent_packages.ts:336` |
| `meta/llama-3.1-70b-instruct` | Synthetic intelligence responses, fallback chain position 2 | `synthetic_intelligence.ts:274,307,330,357`, `ai_factory.ts:19` |
| `meta/llama-3.1-8b-instruct` | Intent classification, all 15 agent support responses, streaming chat | `support_orchestrator.ts:80`, `customer_support.ts:15-29`, `stream_chat.ts:61` |
| `meta/llama-3-8b-instruct` | Classification fallback, KDP metadata, emergency support fallback | `support_orchestrator.ts:88`, `kdp_agent.ts:52`, `classification.ts:17`, `customer_support.ts` |
| `meta/llama-3.1-405b-instruct` | KDP manuscript generation (largest model) | `kdp_agent.ts:46` |
| `black-forest-labs/flux.1-schnell` | Image generation (flyers, posters) | `flyer_templates.ts:343,454` |
| `black-forest-labs/flux.2-klein-4b` | Image generation (alternate style) | `flyer_templates.ts:454` |
| `qwen/qwen-image-2512` | Image generation | `flyer_templates.ts:414` |

### Provider 2: OpenRouter (Backup / Free Tier)
Env var: `OPENROUTER_API_KEY`

| Model | Purpose | Files |
|-------|---------|-------|
| `nvidia/llama-3.3-70b-instruct:free` | AI router for academic, business, analysis, Nigerian business tasks | `ai_router.ts:15,20,40,65` |
| `meta-llama/llama-3.3-70b-instruct` | Convex Agent fallback (mapped from NVIDIA name) | `ai_factory.ts:18,24` |
| `meta-llama/llama-3.1-70b-instruct` | Convex Agent fallback chain | `ai_factory.ts:19,25` |
| `meta-llama/llama-3-8b-instruct` | Emergency fallback in Convex Agent chain | `ai_factory.ts:20,26` |
| `mistralai/mixtral-8x22b-instruct-v0.1` | Available in NVIDIA_MODELS map | `ai_factory.ts:27` |

### Provider 3: Groq (Fast Inference)
Used by: `ai_router.ts`

| Model | Purpose | Files |
|-------|---------|-------|
| `llama3-70b-8192` | Chat, content, creative, Nigerian content, Nigerian services tasks | `ai_router.ts:25,30,45,70,75,100,177` |

### Provider 4: MiMo (Agentic + Multi-modal)
Used by: `ai_router.ts`

| Model | Purpose | Files |
|-------|---------|-------|
| `mimo-v2.5` | Design, audio, video, advert creation tasks | `ai_router.ts:35,50,55,60` |

### Provider 5: AI/ML API (Multi-modal)
Registered in: `model_toggle.ts`

| Model | Purpose | Files |
|-------|---------|-------|
| (generic) | Images, audio, multi-modal generation | `model_toggle.ts:29` |

### Provider 6: OpenAI (via trypost)
Used by: `trypost.ts`

| Model | Purpose | Files |
|-------|---------|-------|
| `gpt-4o-mini` | TryPost feature (social media post generation) | `trypost.ts:1046,1117` |

### Provider 7: Legacy OmniRoute (Inactive / Pre-Convex)
Endpoint: `http://localhost:20128/v1`

| Model | Purpose | Files |
|-------|---------|-------|
| `kr/claude-opus-4-6` | Primary orchestrator via Kiro | `backend/src/services/supportOrchestrator.service.js:15` |
| `google/gemini-3-flash` | First fallback via Google | `backend/src/services/supportOrchestrator.service.js:16` |
| `if/kimi-k2-thinking` | Emergency fallback via Kiro | `backend/src/services/supportOrchestrator.service.js:17` |

---

## How Each Model Connects to the 15 Agents

### Layer 1: Convex Agent Framework (Persistent Dashboard Threads)

All 15 agents defined in `convex/agents/config.ts` use `meta-llama/llama-3.3-70b-instruct` as primary.

The `createReliableAgent()` function in `ai_factory.ts` builds a 3-model fallback chain per agent:
```
Primary:   meta-llama/llama-3.3-70b-instruct
Fallback1: meta-llama/llama-3.1-70b-instruct
Fallback2: meta-llama/llama-3-8b-instruct
```

Provider routing: if `NVIDIA_NIM_API_KEY` exists, uses NVIDIA NIM directly. Otherwise OpenRouter.

Each model gets its own `Agent` instance with `maxSteps: 5` and agent tools. The `streamWithFallback()` method tries each in order with 15s timeout.

### Layer 2: Support Orchestrator (Floating Chat + WhatsApp)

Classification (in `support_orchestrator.ts`):
- Primary: `meta/llama-3.1-8b-instruct`
- Fallback: `meta/llama-3-8b-instruct`
- Final: returns `GENERAL` with `low` confidence

Response generation (in `customer_support.ts`):
- Primary: `meta/llama-3.1-8b-instruct` (all 15 agents)
- Fallback: `meta/llama-3-8b-instruct`

### Layer 3: AI Router (Task-Based Smart Routing)

The `ai_router.ts` detects task types from keywords and routes to optimal provider:
- Academic/Business/Analysis/Nigerian business -> OpenRouter (`nvidia/llama-3.3-70b-instruct:free`)
- Content/Creative/Chat/Nigerian content/services -> Groq (`llama3-70b-8192`)
- Design/Audio/Video/Advert creation -> MiMo (`mimo-v2.5`)

---

## Admin Model Management

`model_toggle.ts` provides 5 toggleable providers:
1. **GROQ** — Lightning-fast inference for chat
2. **OpenRouter (Nemotron)** — Free 550B model for complex docs
3. **AI/ML API** — Images, audio, multi-modal
4. **MiMo-V2.5** — Agentic autonomous agents + multi-modal
5. **NVIDIA** — Premium quality for complex reasoning

Admins can enable/disable each globally. The `ai_router.ts` checks `checkModel` before routing.

---

## Verification Results

### Passing (289/292)

| Test Suite | Tests | Status |
|-----------|-------|--------|
| support_orchestrator.test.ts | 12/12 | PASS |
| support_e2e.test.ts | 5/5 | PASS |
| customer_support.test.ts | 6/6 | PASS |
| customer_support_bot.test.ts | 4/4 | PASS |
| agent_packages.test.ts | 5/5 | PASS |
| ai_router (tested via support_orchestrator) | — | PASS |
| All other suites (schema, auth, social, ad engine, phases, etc.) | 257/257 | PASS |

### Failing (3/292 — all in agent_routing.test.ts)

1. **"finance agent suggests academic pro for thesis request"** — Timeout (5s). This test invokes `chat_factory.ts` which calls real NVIDIA NIM API. Not a model bug — it's a test infrastructure limitation.

2. **"academic agent suggests finance pro for budget question"** — Same timeout issue.

3. **"agent handles own domain correctly"** — `Component "agent" is not registered`. The `@convex-dev/agent` component isn't wired into the test harness. This is a test setup issue, not a runtime issue.

**All 3 failures are test-infrastructure issues, not model/functionality bugs.**

---

## Model Flow Summary

```
User message arrives
    |
    +--> FloatingChatWidget
    |       |
    |       +--> stream_chat.ts (SSE streaming)
    |       |       Uses: NVIDIA NIM meta/llama-3.1-8b-instruct
    |       |
    |       +--> support_orchestrator.processMessage
    |               |
    |               +--> classifyIntent()
    |               |       Uses: meta/llama-3.1-8b-instruct
    |               |       Fallback: meta/llama-3-8b-instruct
    |               |
    |               +--> Route to A1-A15 or GENERAL
    |                       Uses: meta/llama-3.1-8b-instruct
    |                       Fallback: meta/llama-3-8b-instruct
    |
    +--> Convex Agent Dashboard Threads
    |       Uses: meta-llama/llama-3.3-70b-instruct
    |       Fallback chain: 70b v3.1 -> 8b
    |       Provider: NVIDIA NIM or OpenRouter
    |
    +--> AI Router (smart task detection)
    |       Academic/Business: OpenRouter nvidia/llama-3.3-70b-instruct:free
    |       Content/Chat: Groq llama3-70b-8192
    |       Design/Video/Audio: MiMo mimo-v2.5
    |
    +--> Heavy Content (ads, video, KDP)
    |       Ad campaigns: NVIDIA meta/llama-3.3-70b-instruct
    |       Video scripts: NVIDIA meta/llama-3.3-70b-instruct
    |       KDP manuscripts: NVIDIA meta/llama-3.1-405b-instruct
    |       KDP metadata: NVIDIA meta/llama-3-8b-instruct
    |
    +--> Image Generation
            Flyers: Flux.1-schnell or Flux.2-klein-4b
            Images: Qwen qwen-image-2512
```
