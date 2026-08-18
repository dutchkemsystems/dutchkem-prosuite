# Re-Authorization Guide — All Platforms

## Current Composio Status (Live API Check)

### ACTIVE (Working Now)
| Platform | Connection ID | Status | Last Updated |
|----------|--------------|--------|-------------|
| YouTube | ca_6uVunLvy4vnk | ACTIVE | 2026-07-13 12:17 |
| YouTube | ca_kUr-l9D_wZJr | ACTIVE | 2026-07-13 12:17 |
| Discord | ca_o--N_3RljiOJ | ACTIVE | 2026-07-13 12:16 |

### EXPIRED (Needs Re-Authorization)
| Platform | Issue | Fix |
|----------|-------|-----|
| LinkedIn | All connections EXPIRED | Click Connect in admin dashboard |
| Facebook | Token stale in Convex | Re-authorize via Composio |
| Instagram | Token stale in Convex | Re-authorize via Composio |
| Reddit | Token stale in Convex | Re-authorize via Composio |
| X (Twitter) | Never connected | Click Connect in admin dashboard |
| TikTok | Never connected | Click Connect in admin dashboard |
| Pinterest | Never connected | Click Connect in admin dashboard |
| Threads | Never connected | Click Connect in admin dashboard |

### Direct Connection (No Composio)
| Platform | Status | Fix |
|----------|--------|-----|
| Telegram | Bot connected, needs chat ID | Send message to @DutchkemProsuite_bot |
| Bluesky | Never connected | Need handle + app password |

---

## Step-by-Step Re-Authorization

### Step 1: Open Admin Dashboard
Go to: https://dutchkem-prosuite-app.vercel.app/admin

### Step 2: Re-Authorize Each Platform
For each platform, click the platform card → "Connect" or "Re-authorize"

**Priority Order:**
1. **YouTube** — Already ACTIVE in Composio, just needs Convex sync
2. **Discord** — Already ACTIVE in Composio, just needs Convex sync
3. **X (Twitter)** — Most important for reach
4. **LinkedIn** — Professional audience
5. **Facebook** — Large Nigerian audience
6. **Instagram** — Visual content (requires images)
7. **TikTok** — Young audience
8. **Reddit** — Tech/business communities
9. **Pinterest** — Visual discovery
10. **Threads** — Text-based engagement

### Step 3: Set TELEGRAM_CHAT_ID
1. Open Telegram → Search `@DutchkemProsuite_bot`
2. Send any message
3. Go to Convex dashboard → Environment Variables
4. Add: `TELEGRAM_CHAT_ID` = (the chat ID from the bot)

### Step 4: Set RAPIDAPI_KEY (Optional)
If you have a RapidAPI subscription:
1. Go to Convex dashboard → Environment Variables
2. Add: `RAPIDAPI_KEY` = your key

---

## Content Ready to Post

All promotional content is in this directory:
- `flyer-01-ai-agents.html` — Open in browser, screenshot as 1080x1080
- `flyer-02-business.html` — Open in browser, screenshot as 1080x1080
- `flyer-03-startup.html` — Open in browser, screenshot as 1080x1080
- `social-media-posts.md` — All text content for each platform

### How to Create 4K Images
1. Open the HTML file in Chrome
2. Press F12 → Toggle device toolbar → Set to 1080x1080
3. Screenshot the poster
4. For 4K: Use a screenshot tool that supports 4x resolution

### Posting Schedule (WAT)
- **8:00 AM** — Flyer 01 + Post 1 (Morning motivation)
- **12:00 PM** — Flyer 02 + Post 2 (Midday engagement)
- **6:00 PM** — Flyer 03 + Post 3 (Evening CTA)
