# Dependency Updates — Dutchkem Ventures ProSuite NG+

## Summary

This document lists all dependencies that need updating as of June 30, 2026.

## Critical Updates (Breaking Changes)

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| `ai` | 6.0.207 | 7.0.8 | Major version bump - review API changes |
| `@ai-sdk/openai` | 3.0.72 | 4.0.4 | Major version bump - review API changes |
| `@auth/core` | 0.37.4 | 0.34.3 | Downgrade - verify compatibility |
| `dotenv` | 16.6.1 | 17.4.2 | Major version bump |
| `typescript` | 6.0.3 | 6.0.3 | Already at latest |

## Recommended Updates

| Package | Current | Wanted | Latest | Priority |
|---------|---------|--------|--------|----------|
| `convex` | 1.40.0 | 1.42.1 | 1.42.1 | High |
| `@convex-dev/agent` | 0.6.3 | 0.6.4 | 0.6.4 | High |
| `vite` | 8.0.16 | 8.1.0 | 8.1.0 | Medium |
| `@tailwindcss/vite` | 4.3.1 | 4.3.2 | 4.3.2 | Medium |
| `tailwindcss` | 4.3.1 | 4.3.2 | 4.3.2 | Medium |
| `framer-motion` | 12.40.0 | 12.42.0 | 12.42.0 | Medium |
| `lucide-react` | 1.20.0 | 1.22.0 | 1.22.0 | Medium |
| `resend` | 6.13.0 | 6.16.0 | 6.16.0 | Medium |
| `recharts` | 3.8.1 | 3.9.0 | 3.9.0 | Low |
| `prettier` | 3.8.4 | 3.9.4 | 3.9.4 | Low |

## Safe Updates (Patch/Minor)

| Package | Current | Wanted | Latest |
|---------|---------|--------|--------|
| `@huggingface/inference` | 4.13.19 | 4.13.21 | 4.13.21 |
| `@openrouter/ai-sdk-provider` | 2.9.1 | 2.10.0 | 2.10.0 |
| `@tanstack/react-query` | 5.101.0 | 5.101.2 | 5.101.2 |
| `@vitejs/plugin-react` | 6.0.2 | 6.0.3 | 6.0.3 |
| `convex-test` | 0.0.53 | 0.0.53 | 0.0.54 |

## Packages to Review

| Package | Current | Latest | Concern |
|---------|---------|--------|---------|
| `canvas` | 3.2.3 | - | Check if still needed |
| `lamejs` | 1.2.1 | - | Check if still needed |
| `opencode-ai` | 1.17.7 | 1.17.11 | Check usage |

## Update Commands

### Safe Updates (no breaking changes)
```bash
npm update @huggingface/inference @openrouter/ai-sdk-provider @tanstack/react-query @vitejs/plugin-react convex-test
```

### Medium Priority Updates
```bash
npm install convex@latest @convex-dev/agent@latest vite@latest @tailwindcss/vite@latest tailwindcss@latest framer-motion@latest lucide-react@latest resend@latest recharts@latest prettier@latest
```

### High Priority Updates (review first)
```bash
# Review ai SDK v7 changes before updating
npm install ai@latest @ai-sdk/openai@latest

# Review dotenv v17 changes
npm install dotenv@latest
```

## Post-Update Checklist

- [ ] Run `npm run typecheck` to verify TypeScript compatibility
- [ ] Run `npm run lint` to check for linting issues
- [ ] Run `npm run build` to verify build succeeds
- [ ] Run `npm test` to verify tests pass
- [ ] Test core functionality manually
- [ ] Update AGENTS.md if any critical dependencies changed
