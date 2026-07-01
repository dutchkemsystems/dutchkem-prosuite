# Developer Guide — Dutchkem Ventures ProSuite NG+

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git
- Convex CLI (`npm install -g convex`)

### Setup

```bash
# Clone repository
git clone https://github.com/dutchkemsystems/dutchkem-prosuite
cd dutchkem-prosuite

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your credentials
# See Environment Variables section below

# Start development server
npm run dev
```

### Environment Variables

Required variables in `.env.local`:

```bash
# Convex
VITE_CONVEX_URL=https://your-project.convex.cloud
CONVEX_SITE_URL=https://your-project.convex.site
CONVEX_DEPLOYMENT=your-deployment-name

# AI Providers
OPENROUTER_API_KEY=your-key
NVIDIA_NIM_API_KEY=your-key

# Payments
KORA_PUBLIC_KEY=your-key
KORA_SECRET_KEY=your-key
KORA_ENCRYPTION_KEY=your-key

# Email
RESEND_API_KEY=your-key

# AWS (for OTP)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-key
AWS_REGION=us-east-1
```

## Project Structure

```
dutchkem-prosuite/
├── src/                    # Frontend
│   ├── components/         # React components
│   ├── routes/             # TanStack Router routes
│   ├── theme/              # Theme system
│   └── lib/                # Utilities
├── convex/                 # Backend
│   ├── schema/             # Database schema (modularized)
│   ├── agents/             # AI agent configs
│   ├── http.ts             # HTTP endpoints
│   └── crons.ts            # Scheduled tasks
├── docs/                   # Documentation
└── scripts/                # Utility scripts
```

## Development Workflow

### 1. Creating a New Feature

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
# ...

# Run linting
npm run lint

# Run type checking
npm run typecheck

# Run tests
npm test

# Commit changes
git add .
git commit -m "feat: add my feature"

# Push to remote
git push origin feature/my-feature
```

### 2. Working with Convex

#### Adding a New Table

1. Add table definition to appropriate module in `convex/schema/`:
   ```typescript
   // convex/schema/core.ts
   export const coreTables = {
     // ... existing tables
     myNewTable: defineTable({
       field1: v.string(),
       field2: v.number(),
     }).index("by_field1", ["field1"]),
   };
   ```

2. Create query/mutation functions:
   ```typescript
   // convex/myFeature.ts
   import { query, mutation } from "./_generated/server";
   import { v } from "convex/values";
   
   export const get = query({
     args: {},
     handler: async (ctx) => {
       return await ctx.db.query("myNewTable").collect();
     },
   });
   ```

#### Adding a New Agent

1. Add agent config to `convex/agents/config.ts`:
   ```typescript
   export const agentConfigs = {
     myAgent: {
       name: "My Agent",
       description: "Does something useful",
       systemPrompt: "You are a helpful assistant...",
       model: "meta-llama/llama-3.3-70b-instruct",
     },
   };
   ```

2. Create agent chat module:
   ```typescript
   // convex/my_agent_chat.ts
   import { v } from "convex/values";
   import { chatFactory } from "./agents/chat_factory";
   
   export const sendMessage = chatFactory("myAgent");
   ```

3. Add route in `src/routes/`:
   ```tsx
   // src/routes/my-agent.tsx
   import { createFileRoute } from "@tanstack/react-router";
   
   export const Route = createFileRoute("/my-agent")({
     component: MyAgent,
   });
   
   function MyAgent() {
     // Agent UI component
   }
   ```

### 3. Testing

#### Unit Tests

```bash
# Run all tests
npm test

# Run specific test file
npx vitest run path/to/test.ts

# Run tests in watch mode
npx vitest
```

#### Convex Tests

```bash
# Run Convex functions locally
npx convex dev

# Test specific function in dashboard
# Navigate to Functions tab and run
```

### 4. Deployment

#### Pre-deployment Checklist

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Environment variables set in Vercel

#### Deploy Commands

```bash
# 1. Build frontend
npx vite build

# 2. Deploy Convex backend
npx convex deploy --typecheck=disable

# 3. Deploy frontend to Vercel
vercel deploy --prod --yes --force

# 4. Verify deployment
Invoke-RestMethod -Uri "https://warmhearted-aardvark-280.convex.site/api/health"
```

## Code Standards

### TypeScript

- Use strict TypeScript
- Avoid `any` type
- Use interfaces for object shapes
- Export types that are used externally

### React

- Use functional components with hooks
- Keep components small and focused
- Use TanStack Router for navigation
- Use Convex queries for data fetching

### Convex

- Use `.withIndex()` for queries (never `.filter()`)
- Use `.take()` for bounded queries
- Always include `returns` validator
- Never pass `undefined` as a value (use `null`)

### Styling

- Use Tailwind CSS classes
- Follow existing theme system
- Use `tailwind-merge` for conditional classes
- Keep styles consistent with design system

## Common Patterns

### Fetching Data

```tsx
// Using Convex queries
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function MyComponent() {
  const data = useQuery(api.myModule.getData);
  
  if (data === undefined) return <Loading />;
  
  return <div>{data.map(item => <Item key={item._id} {...item} />)}</div>;
}
```

### Mutations

```tsx
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function MyComponent() {
  const mutate = useMutation(api.myModule.updateData);
  
  const handleClick = async () => {
    await mutate({ id: "xxx", value: "new value" });
  };
  
  return <button onClick={handleClick}>Update</button>;
}
```

### Actions

```tsx
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";

function MyComponent() {
  const action = useAction(api.myModule.doSomething);
  
  const handleClick = async () => {
    const result = await action({ input: "value" });
    console.log(result);
  };
  
  return <button onClick={handleClick}>Do Something</button>;
}
```

## Troubleshooting

### Common Issues

#### Build Fails

```bash
# Clear cache
rm -rf node_modules/.cache
npm run build
```

#### Convex Deployment Fails

```bash
# Check Convex status
npx convex dev

# Deploy with typecheck disabled
npx convex deploy --typecheck=disable
```

#### TypeScript Errors

```bash
# Run type checking
npm run typecheck

# Fix common issues
npm run lint:fix
```

## Resources

- [Convex Documentation](https://docs.convex.dev)
- [TanStack Router](https://tanstack.com/router)
- [Tailwind CSS](https://tailwindcss.com)
- [React 19](https://react.dev)
