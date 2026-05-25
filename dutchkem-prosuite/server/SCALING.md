# 📈 Dutchkem Ventures — Scaling & Performance Guide

## Quick Commands

### Run Load Test
```bash
cd server

# Default: 10 requests/min for 5 minutes
node scripts/loadtest.js

# Higher load: 2 requests/second for 30 minutes
node scripts/loadtest.js --rps 2 --duration 30

# Burst test: 100 requests as fast as possible
node scripts/loadtest.js --burst
```

### Check Live Metrics
```
GET http://localhost:3001/api/metrics      # Per-agent latency, p50/p95/p99
GET http://localhost:3001/api/ratelimit    # Rate limit status, queue times
GET http://localhost:3001/api/optimize     # Auto-optimization recommendations
GET http://localhost:3001/api/health       # System health check
```

---

## Understanding the Metrics

### `/api/metrics` — What to Look For

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| **p95 latency** | < 3000ms | 3000-6000ms | > 6000ms |
| **p99 latency** | < 5000ms | 5000-10000ms | > 10000ms |
| **Error rate** | < 0.1% | 0.1-1% | > 1% |
| **Avg tokens** | < 1000 | 1000-1500 | > 1500 |

### `/api/ratelimit` — Rate Limit Tuning

The rate limiter **auto-adjusts** every 5 minutes:

| Condition | Action |
|-----------|--------|
| Error rate < 0.1% AND block rate > 5% | Increase limit by 10 (max 120) |
| Error rate < 1% AND block rate > 10% | Increase limit by 5 (max 100) |
| Error rate > 5% | Decrease limit by 10 (min 10) |
| Error rate > 10% | Decrease limit by 20 (min 5) |

### `/api/ratelimit` → scalingRecommendation

| Queue Depth | p99 Latency | Recommendation |
|-------------|-------------|----------------|
| < 5 | < 1000ms | Scale down possible (1 replica) |
| 5-25 | 1000-5000ms | Normal operation (1 replica) |
| 25-50 | 5000-10000ms | Scale up to 2 replicas |
| > 50 | > 10000ms | Scale up urgently to 3 replicas |

---

## Scaling Options

### Option 1: Vertical Scaling (Bigger Server)

Increase Node.js memory:
```bash
node --max-old-space-size=4096 index.js
```

### Option 2: PM2 Cluster Mode (Multiple Processes)

```bash
npm install -g pm2

# Start with cluster mode (uses all CPU cores)
pm2 start index.js -i max --name dutchkem-api

# Monitor
pm2 monit

# Check status
pm2 status
```

### Option 3: Docker + Docker Compose

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NVIDIA_NIM_API_KEY=${NVIDIA_NIM_API_KEY}
      - TERMII_API_KEY=${TERMII_API_KEY}
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api
```

### Option 4: Kubernetes HPA

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dutchkem-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dutchkem-api
  template:
    metadata:
      labels:
        app: dutchkem-api
    spec:
      containers:
      - name: api
        image: dutchkem/prosuite-api:latest
        ports:
        - containerPort: 3001
        env:
        - name: NVIDIA_NIM_API_KEY
          valueFrom:
            secretKeyRef:
              name: dutchkem-secrets
              key: nvidia-api-key
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 512Mi

---
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dutchkem-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dutchkem-api
  minReplicas: 1
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: http_request_queue_depth
      target:
        type: AverageValue
        averageValue: "25"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 120
```

```bash
# Apply
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/hpa.yaml

# Monitor
kubectl get hpa dutchkem-api-hpa --watch
```

---

## When to Scale: Decision Tree

```
Is p99 > 10 seconds?
├── YES → Add 2 replicas IMMEDIATELY
└── NO
    Is p95 > 5 seconds?
    ├── YES → Is error rate < 0.1%?
    │   ├── YES → Increase rate limit to 60/min
    │   └── NO  → Add 1 replica, keep rate limit at 30/min
    └── NO
        Is queue depth > 25?
        ├── YES → Add 1 replica
        └── NO  → System is healthy, no action needed
```

---

## Cost Optimization

| Strategy | Savings | Tradeoff |
|----------|---------|----------|
| Switch A6, A11 to `llama-3.1-8b-instruct` | ~60% fewer tokens | Slightly less creative output |
| Reduce `max_tokens` to 1024 for A2, A4 | ~50% faster | Shorter but still complete responses |
| Cache common greetings ("hi", "hello") | ~20% fewer API calls | None — same responses |
| Add `"Be concise"` to all system prompts | ~30% fewer tokens | Slightly shorter responses |

---

## Monitoring Dashboard

For production, consider adding:
- **Grafana** for visual dashboards
- **Prometheus** for time-series metrics
- **Uptime Kuma** for availability monitoring

The `/api/metrics` and `/api/ratelimit` endpoints are compatible with Prometheus scraping via a simple adapter.
