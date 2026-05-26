# Deployment Guide

## Project Overview
- **Framework**: TanStack Start (Vite + SSR)
- **Backend**: Convex (serverless)
- **Hosting**: Vercel (recommended)
- **Output Directories**: `dist/client` (static), `dist/server` (SSR)

---

## Recommended Platform: Vercel

Vercel is the easiest for Vite/TanStack Start projects due to:
- Native SSR support
- Automatic SPA routing rewrites
- Convex integration ready

### Quick Deploy

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy (from project root)
vercel

# 4. For production
vercel --prod
```

---

## Alternative Platforms

### Netlify

Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist/client"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Deploy:
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

### Cloudflare Pages

```bash
# Install Wrangler
npm i -g wrangler

# Deploy
wrangler pages deploy dist/client
```

### GitHub Pages

Note: Requires adapter for SSR. For pure static export, modify vite.config.ts:

```typescript
// vite.config.ts - add static adapter for GitHub Pages
import { staticAdapter } from '@tanstack/react-start/static'

export default defineConfig({
  plugins: [
    tailwindcss(),
    staticAdapter(),
    viteReact(),
  ],
})
```

Then:
```bash
# Build
npm run build

# Push dist/client to gh-pages branch
```

---

## Environment Variable Setup

### Local Development
```bash
cp .env.example .env
# Edit .env with your values
```

### Vercel Dashboard
1. Go to Project Settings → Environment Variables
2. Add each variable from `.env.example`
3. For production, mark as "Production" only or "Production / Preview / Development"

**Required Variables:**
```
VITE_CONVEX_URL=https://your-project.convex.cloud
CONVEX_SITE_URL=https://your-project.convex.site
JWT_SECRET_CLIENT=your-32-char-min-secret
JWT_SECRET_ADMIN=your-32-char-min-secret
NVIDIA_NIM_API_KEY=your-nvidia-key
OPENROUTER_API_KEY=your-openrouter-key
# Add others as needed
```

### Netlify Dashboard
1. Site Settings → Environment Variables
2. Add same variables

---

## Build Commands

### Standard Build
```bash
npm run build
# Output: dist/client and dist/server
```

### Clean Build
```bash
npm run clean && npm install && npm run build
```

### Type Check
```bash
npm run typecheck
```

### Lint & Fix
```bash
npm run lint:fix
```

---

## SPA Routing (Important!)

TanStack Start uses client-side routing. All routes must redirect to `index.html`.

### Vercel (vercel.json - already configured)
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Netlify (netlify.toml - add this)
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Cloudflare Pages
Configure in dashboard → Build config → Redirect all to index.html

---

## Convex Deployment

Convex deploys separately:

```bash
# Install Convex CLI
npm i -g convex

# Login
convex login

# Deploy backend
convex deploy

# Note the deployment URL and update VITE_CONVEX_URL
```

---

## Git Setup

### Initialize Git (if not already)
```bash
git init
git add .
git commit -m "Initial commit"
```

### Create Repository on GitHub
1. Go to github.com → New repository
2. Name it (e.g., `dutchkem-prosuite`)
3. Don't initialize with README (we have content)

### Push to GitHub
```bash
# Add remote (use your actual repo URL)
git remote add origin https://github.com/YOUR_USERNAME/dutchkem-prosuite.git

# Push
git branch -M main
git push -u origin main
```

### GitHub Token Setup (for CI/CD)
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (Classic) with `repo` scope
3. Use as password when pushing, or for Vercel/GitHub integration

---

## Post-Deployment Checklist

- [ ] Verify Convex backend is running
- [ ] Set all environment variables in hosting dashboard
- [ ] Test authentication flow
- [ ] Test SPA navigation (refresh on sub-pages)
- [ ] Check browser console for errors
- [ ] Verify API endpoints work

---

## Troubleshooting

### Build Fails
```bash
# Clear cache and reinstall
npm run clean
rm -rf node_modules
npm install
npm run build
```

### TypeScript Errors
```bash
npm run typecheck
# Fix errors shown, or add // @ts-nocheck for rapid iteration
```

### Runtime Errors
1. Check browser console
2. Verify environment variables are set
3. Verify Convex URL is correct and backend is running

### Routing Issues
Ensure rewrites/redirects are configured for SPA routing on your platform.

---

## Useful Commands Reference

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run preview     # Preview production build locally
npm run typecheck    # TypeScript check
npm run lint         # Lint check
npm run lint:fix     # Auto-fix lint issues
npm run clean        # Clean build artifacts
```