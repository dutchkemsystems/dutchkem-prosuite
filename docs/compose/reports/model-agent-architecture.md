# Dutchkem ProSuite — Full Model & Agent Architecture

## All LLM Providers & Models

### Provider: NVIDIA NIM (Primary)
Endpoint: `https://integrate.api.nvidia.com/v1`
Env var: `NVIDIA_NIM_API_KEY`

| Model | Role | Where Used |
|-------|------|------------|
| `meta/llama-3.3-70b-instruct` | Heavyworkhorse | Ad campaigns, video production, agent packages, synthetic intelligence |
| `meta/llama-3.1-70b-instruct` | Secondary fallback | AI factory fallback chain position 2 |
| `meta/llama-3.1-8b-instruct` | Fast classifier + support responder | Intent classification, all 15 agent support responses, streaming chat |
| `meta/llama-3-8b-instruct` | Emergency fallback | Final classification fallback, KDP metadata, emergency support fallback |
| `meta/llama-3.1-405b-instruct` | Largest model | KDP manuscript generation only |
| `mistralai/mixtral-8x22b-instruct-v0.1` | Available alternative | Listed in NVIDIA_MODELS map |
| `black-forest-labs/flux.1-schnell` | Image generation | Flyer templates |
| `black-forest-labs/flux.2-klein-4b` | Image generation | Flyer templates |
| `qwen/qwen-image-2512` | Image generation | Flyer templates |

### Provider: OpenRouter (Backup)
Env var: `OPENROUTER_API_KEY`

Used when NVIDIA NIM key is unavailable. The AI factory maps NVIDIA model IDs to OpenRouter equivalents via the `NVIDIA_MODELS` lookup table in `convex/ai_factory.ts`.

### Provider: Legacy OmniRoute (Pre-Convex, Inactive)
Endpoint: `http://localhost:20128/v1`

| Model | Role |
|-------|------|
| `kr/claude-opus-4-6` | Primary orchestrator (Kiro provider) |
| `google/gemini-3-flash` | First fallback (Google provider) |
| `if/kimi-k2-thinking` | Emergency fallback (Kiro provider) |

---

## How Models Connect to the 15 Agents

There are TWO separate model layers serving the same 15 agents:

### Layer 1: Convex Agent Framework (Persistent Chat Threads)
Defined in `convex/agents/config.ts`. Each agent gets the 70B model with a full fallback chain.

The `createReliableAgent()` function in `convex/ai_factory.ts` builds a per-agent fallback sequence:

```
Primary:   meta-llama/llama-3.3-70b-instruct  (NVIDIA NIM or OpenRouter)
Fallback1: meta-llama/llama-3.1-70b-instruct
Fallback2: meta-llama/llama-3-8b-instruct
```

Each model in the chain gets its own `Agent` instance with `maxSteps: 5` and the `agentTools` toolset. The `streamWithFallback()` method tries each model in order with a 15-second timeout per attempt. This layer powers persistent threaded conversations on the dashboard.

### Layer 2: Support Orchestrator (One-Shot Classification + Response)
Defined in `convex/support_orchestrator.ts` (classification) and `convex/customer_support.ts` (response generation).

Classification uses the smallest fast model:
- Primary: `meta/llama-3.1-8b-instruct`
- Fallback: `meta/llama-3-8b-instruct`
- Final: returns `"GENERAL"` with `"low"` confidence

Response generation for all 15 agents uses the same pair:
- Primary: `meta/llama-3.1-8b-instruct`
- Fallback: `meta/llama-3-8b-instruct`

This layer powers the floating chat widget and WhatsApp support channel. It's optimized for speed (8B models respond faster) rather than depth.

---

## Complete Workflow: User Message to Agent Response

```
User types message in FloatingChatWidget or CustomerSupportChat
    |
    v
[Entry Point Decision]
    |
    +---> Streaming path: POST /api/stream-chat (stream_chat.ts)
    |       Uses NVIDIA NIM streaming API with SSE
    |       Returns token-by-token to browser
    |
    +---> Orchestrator path: api.support_orchestrator.processMessage
            |
            v
        Step 1: classifyIntent()
            callNVIDIA("meta/llama-3.1-8b-instruct", classifier_prompt)
            If fails -> callNVIDIA("meta/llama-3-8b-instruct")
            If fails -> return { agentId: "GENERAL", confidence: "low" }
            |
            v
        Step 2: Route based on classified agentId
            |
            +---> GENERAL
            |       callNVIDIA with general support prompt
            |       -> logInteraction mutation
            |       -> checkAndEscalate mutation (3 rules)
            |
            +---> A1 through A15
                    ctx.runAction(customer_support.generateSupportResponse)
                        Builds agent-specific system prompt with:
                          - Agent specialty text
                          - Service catalog (AGENT_SERVICES map)
                          - Pricing bundles (AGENT_BUNDLES map)
                          - Subscription tiers (AGENT_SUBSCRIPTIONS map)
                          - Customer experience guidelines
                        callNVIDIA(primaryModel) with fallback chain
                    -> logInteraction mutation
                    -> checkAndEscalate mutation (3 rules)
                    -> checkRepetition mutation (Jaccard similarity >0.7)
                    -> Detect ---LOGIN_PROMPT--- marker
            |
            v
        Response returned with metadata:
          { response, agentId, agentName, routed, confidence, shouldPromptLogin }
```

---

## Quality Control Pipeline (Post-Response)

Three sequential checks run after every agent response:

**1. Auto-Escalation** (`convex/support_auto_escalation.ts`)
- Trigger A: Classification confidence was "low"
- Trigger B: Negative sentiment keywords detected in user message
- Trigger C: Three or more consecutive low-confidence classifications for same user
- Creates a pending record in `support_escalations` table

**2. Repetition Detection** (`convex/support_repetition_detector.ts`)
- Computes Jaccard word-overlap between new response and agent's last 10 responses
- If similarity exceeds 0.7 threshold, forces a retry with appended "Do not repeat yourself" instruction
- Maximum 2 retries before accepting the repetitive output

**3. Login Prompt Injection**
- If LLM response contains the `---LOGIN_PROMPT---` marker, the UI strips it and renders a "Login to Continue" CTA
- Redirects to `/auth?redirect=/dashboard?agent=X`
- Once logged in, `PackageSelection` component appears for purchasing agent bundles

---

## WhatsApp Integration Path

Inbound WhatsApp messages follow a parallel entry point:

```
WhatsApp message arrives at OpenWA server (Fly.io)
    -> convex/whatsapp_support_integration.ts
        -> Writes to support_interactions table (same table as web chat)
        -> Auto-escalates new conversations
        -> Appears in admin SupportDashboard alongside web chat
```

---

## Admin Configuration Layer

The `SupportDashboard` component (`src/components/admin/SupportDashboard.tsx`) provides six management tabs:

- **Overview**: Interaction volumes, agent distribution, confidence histogram, avg response time
- **Interactions**: Browsable list of all logged exchanges
- **Escalations**: Pending/in-progress/resolved escalations with assignment and resolution
- **Agents**: Per-agent enable/disable toggles stored in `system_config` table
- **Rules**: Auto-response keyword rules (pricing, features, hours, refunds, trials)
- **Settings**: Primary, fallback, and emergency LLM model name configuration

---

## Model Selection Strategy Summary

The platform uses a deliberate tiered approach:

- **Classification** gets the cheapest, fastest model (8B) because it only outputs a short agent ID
- **Support responses** also use 8B for speed — customers expect fast replies in chat
- **Convex Agent threads** use 70B for depth — these are persistent dashboard conversations where quality matters more than latency
- **Heavy content generation** (ads, videos, KDP manuscripts) uses 70B or 405B for maximum output quality
- **Image generation** uses dedicated NVIDIA NIM image models (Flux, Qwen)

Every tier has a fallback chain so a single provider outage doesn't break the system.
