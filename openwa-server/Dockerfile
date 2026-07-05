FROM node:20-slim

WORKDIR /app

# Install dependencies for Baileys (native modules)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy application code
COPY . .

# Create auth directories (will be mounted as volumes on Fly.io)
RUN mkdir -p /app/auth_admin /app/auth_enterprise

ENV NODE_ENV=production
ENV CONVEX_URL=https://warmhearted-aardvark-280.convex.cloud
ENV SESSION_TYPE=admin
ENV POLL_INTERVAL_MS=3000

EXPOSE 2785

CMD ["node", "server.js"]
