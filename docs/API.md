# API Documentation — Dutchkem Ventures ProSuite NG+

## Overview

This document describes the Convex backend API for the ProSuite platform.

## Authentication

### Client Authentication

- **Method:** Email OTP via AWS SES
- **Provider:** @convex-dev/auth
- **Flow:**
  1. User enters email
  2. OTP sent via AWS SES
  3. User verifies OTP
  4. Session created in Convex

### Admin Authentication

- **Method:** Custom session-based
- **Storage:** localStorage (`admin_session_token`)
- **Flow:**
  1. Admin logs in via POST /api/admin/login
  2. Credentials validated against DB
  3. SessionId generated and stored
  4. All admin requests include `adminToken` in args

## Core API Functions

### Users

```typescript
// Get current user
api.users.getCurrentUser

// Update user profile
api.users.updateProfile

// Get user by ID (admin)
api.users.getUserById
```

### Subscriptions

```typescript
// Get user subscription
api.subscriptions.getUserSubscription

// Create subscription
api.subscriptions.createSubscription

// Cancel subscription
api.subscriptions.cancelSubscription

// Renew subscription
api.subscriptions.renewSubscription
```

### Payments

```typescript
// Initiate Kora Pay checkout
api.kora_checkout.initiatePayment

// Verify payment
api.kora_checkout.verifyPayment

// Get payment history
api.payments.getPaymentHistory
```

## Agent API

### Chat Interface

```typescript
// Send message to agent
api.agents.{agent}_chat.sendMessage

// Get conversation history
api.agents.{agent}_chat.getConversation

// List user conversations
api.agents.{agent}_chat.listConversations
```

### Agent Types

| Agent | Key | Chat Module |
|-------|-----|-------------|
| Academic Writer | academic | academic_chat |
| Business Consultant | business | business_chat |
| Content Strategist | content | content_chat |
| Career Coach | career | career_chat |
| Personal Shopper | shopping | shopping_chat |
| Success Specialist | exam_career | exam_career_chat |
| Finance Advisor | finance | finance_chat |
| MediaStudio Pro | video | video_chat |
| Wellness Coach | wellness | wellness_chat |
| Home Management | home | home_chat |
| Language Coach | language | language_chat |
| Travel Planner | travel | travel_chat |
| Exam Prep Specialist | certification | certification_chat |
| Translation Hub | translation | translation_chat |
| Event Maestro | event | event_chat |

## Enterprise API

```typescript
// Get organization details
api.enterprise.getOrganization

// List organization members
api.enterprise.listMembers

// Add member to organization
api.enterprise.addMember

// Get organization usage
api.enterprise.getUsage
```

## Social Media API

```typescript
// Create social post
api.social.createPost

// Schedule post
api.social.schedulePost

// Get post analytics
api.social.getPostAnalytics

// List connected platforms
api.social.listPlatforms
```

## WhatsApp API

```typescript
// Send WhatsApp message
api.whatsapp.sendMessage

// Get conversation history
api.whatsapp.getConversation

// List active sessions
api.whatsapp.listSessions
```

## Error Handling

All API functions return errors in the following format:

```typescript
{
  error: string;
  code?: string;
  details?: any;
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| UNAUTHORIZED | User not authenticated |
| FORBIDDEN | Insufficient permissions |
| NOT_FOUND | Resource not found |
| VALIDATION_ERROR | Invalid input data |
| RATE_LIMITED | Too many requests |
| PAYMENT_FAILED | Payment processing error |

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 attempts | 15 minutes |
| Admin Login | 3 attempts | 15 minutes |
| API Calls | 1000 requests | 1 minute |
| Agent Chat | 50 messages | 1 hour |

## Webhooks

### Kora Pay Webhook

```
POST /api/webhooks/kora
```

Payload:
```json
{
  "event": "payment.success",
  "data": {
    "reference": "xxx",
    "amount": 5000,
    "status": true
  }
}
```

### Composio Webhook

```
POST /api/webhooks/composio
```

## Development

### Local Development

```bash
# Start Convex dev server
npx convex dev

# Run tests
npx vitest
```

### Testing API Functions

```typescript
// In Convex dashboard
await ctx.runQuery(api.users.getCurrentUser);
await ctx.runMutation(api.subscriptions.createSubscription, {
  plan: "monthly"
});
```
