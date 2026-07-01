# Schema Modularization Design Spec

## [S1] Problem

The current `convex/schema.ts` file is 5,204 lines with 330 tables defined in a single file. This makes:
- Navigation difficult
- Code reviews time-consuming
- Merge conflicts frequent
- Understanding domain boundaries hard

## [S2] Solution Overview

Split the monolithic schema into domain-specific modules that are imported and merged into the main schema file. Each module exports a partial schema object containing related tables.

## [S3] Proposed Module Structure

```
convex/
├── schema.ts                    # Main file - imports and merges all modules
├── schema/
│   ├── index.ts                 # Re-exports all modules
│   ├── core.ts                  # users, jobs, subscriptions, refunds, payouts, auth tables
│   ├── finance.ts               # tax_wallet, tax_transactions, interest_earnings, annual_tax_filing
│   ├── agents.ts                # ai_agents, agent_conversations, agent_messages, agent_services
│   ├── payments.ts              # payment_methods, checkout_sessions, kora_webhook_events
│   ├── ad_engine.ts             # ad_campaigns, ad_ads, ad_flyers, ad_analytics
│   ├── social.ts                # social_posts, social_platforms, content_calendar
│   ├── enterprise.ts            # enterprise_organizations, enterprise_members, enterprise_clients
│   ├── whatsapp.ts              # whatsapp_system_status, whatsapp_subscriptions
│   ├── marketplace.ts           # marketplace_listings, marketplace_purchases
│   ├── kdp.ts                   # kdp_projects, kdp_royalties, book_projects
│   ├── composio.ts              # composio_auth_configs, composio_settings
│   ├── trypost.ts               # trypost_brand_profile, trypost_scheduled_posts
│   ├── notifications.ts         # push_subscriptions, push_queue, email_notifications
│   ├── security.ts              # security_logs, blocked_ips, fraud_monitoring
│   ├── gamification.ts          # gamification_profiles, badges, user_badges
│   ├── video.ts                 # video_productions, video_scenes
│   ├── auto_heal.ts             # auto_heal_runs, auto_heal_alerts
│   └── misc.ts                  # Remaining tables (lead_scores, workflows, etc.)
```

## [S4] Implementation Pattern

Each module follows this pattern:

```typescript
// convex/schema/core.ts
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const coreTables = {
  users: defineTable({
    // ... fields
  }).index("email", ["email"]),
  
  jobs: defineTable({
    // ... fields
  }).index("by_freelancer", ["freelancerId"]),
  
  // ... more core tables
};
```

Main schema file:

```typescript
// convex/schema.ts
import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { coreTables } from "./schema/core";
import { financeTables } from "./schema/finance";
import { agentTables } from "./schema/agents";
// ... other imports

export default defineSchema({
  ...authTables,
  ...coreTables,
  ...financeTables,
  ...agentTables,
  // ... other modules
});
```

## [S5] Migration Strategy

1. Create the `convex/schema/` directory
2. Extract tables into domain modules (one at a time)
3. Update main `schema.ts` to import from modules
4. Run `npx convex dev` to verify schema compiles
5. Run tests to ensure no regressions

## [S6] Success Criteria

- All 330 tables are preserved with exact same definitions
- Schema compiles without errors
- All existing queries/mutations continue to work
- Main schema.ts reduces to ~50 lines (imports only)
- Each module file is under 300 lines

## [S7] Risk Mitigation

- **Table ordering:** Convex may care about table definition order. Test thoroughly.
- **Cross-module references:** Tables referencing other tables (e.g., `v.id("users")`) work across modules since they're merged at runtime.
- **Index definitions:** Keep indexes with their tables for cohesion.

## [S8] Out of Scope

- Renaming tables
- Changing table structures
- Adding new tables
- Modifying indexes
