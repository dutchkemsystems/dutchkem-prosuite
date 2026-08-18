# Dutchkem Ventures ProSuite NG+ — Dockerfile
# Multi-stage build for the Vite frontend served by vite preview (Convex backend is external).

FROM node:20-alpine AS base
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx vite build

# Runtime (vite preview serves dist on PORT)
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=4173
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://localhost:4173/ >/dev/null 2>&1 || exit 1
CMD ["sh", "-c", "npx vite preview --host 0.0.0.0 --port $PORT"]