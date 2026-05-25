/**
 * ═══════════════════════════════════════════════════════════════════
 * ADAPTIVE RATE LIMITER
 * 
 * - Tracks per-IP request rates
 * - Measures queue wait times
 * - Auto-adjusts limits based on error rate
 * - Exposes metrics for scaling decisions
 * ═══════════════════════════════════════════════════════════════════
 */

class AdaptiveRateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000;       // 1 minute window
    this.baseLimit = options.maxRequests || 30;       // Starting limit
    this.currentLimit = this.baseLimit;
    this.requests = {};                               // IP → timestamps
    this.queue = [];                                  // Queue wait time tracking
    this.stats = {
      totalAllowed: 0,
      totalBlocked: 0,
      totalErrors: 0,
      queueTimes: [],                                // Last 500 queue wait times
      adjustmentHistory: [],
      hourlySnapshots: [],
    };
    this.errorWindow = [];                            // Recent error timestamps

    // Auto-tune every 5 minutes
    this.tuneInterval = setInterval(() => this.autoTune(), 5 * 60 * 1000);
    
    // Hourly snapshot
    this.snapshotInterval = setInterval(() => this.takeSnapshot(), 60 * 60 * 1000);
    
    // Cleanup old entries every 2 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 2 * 60 * 1000);
  }

  // Express middleware
  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
      const now = Date.now();
      const queueStart = now;

      // Initialize IP bucket
      if (!this.requests[ip]) this.requests[ip] = [];
      
      // Remove expired entries
      this.requests[ip] = this.requests[ip].filter(t => now - t < this.windowMs);

      // Check limit
      if (this.requests[ip].length >= this.currentLimit) {
        this.stats.totalBlocked++;
        const retryAfter = Math.ceil((this.requests[ip][0] + this.windowMs - now) / 1000);
        
        res.set('Retry-After', String(retryAfter));
        res.set('X-RateLimit-Limit', String(this.currentLimit));
        res.set('X-RateLimit-Remaining', '0');
        res.set('X-RateLimit-Reset', String(Math.ceil((this.requests[ip][0] + this.windowMs) / 1000)));
        
        return res.status(429).json({
          success: false,
          message: `Rate limited. Try again in ${retryAfter} seconds.`,
          retryAfter,
          limit: this.currentLimit,
        });
      }

      // Allow request
      this.requests[ip].push(now);
      this.stats.totalAllowed++;

      // Track queue time
      const queueTime = Date.now() - queueStart;
      this.stats.queueTimes.push(queueTime);
      if (this.stats.queueTimes.length > 500) {
        this.stats.queueTimes = this.stats.queueTimes.slice(-500);
      }

      // Set rate limit headers
      res.set('X-RateLimit-Limit', String(this.currentLimit));
      res.set('X-RateLimit-Remaining', String(this.currentLimit - this.requests[ip].length));
      res.set('X-RateLimit-Reset', String(Math.ceil((now + this.windowMs) / 1000)));

      // Track errors for auto-tuning
      const origJson = res.json.bind(res);
      res.json = (data) => {
        if (res.statusCode >= 500 || data?.success === false) {
          this.stats.totalErrors++;
          this.errorWindow.push(Date.now());
        }
        return origJson(data);
      };

      next();
    };
  }

  // Auto-tune rate limits based on error rate
  autoTune() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Clean error window
    this.errorWindow = this.errorWindow.filter(t => t > oneHourAgo);
    
    const recentTotal = this.stats.totalAllowed + this.stats.totalBlocked;
    if (recentTotal < 10) return; // Not enough data
    
    const errorRate = this.errorWindow.length / Math.max(1, this.stats.totalAllowed);
    const blockRate = this.stats.totalBlocked / Math.max(1, recentTotal);
    
    const oldLimit = this.currentLimit;
    
    if (errorRate < 0.001 && blockRate > 0.05) {
      // Very low errors but many blocked → increase limit
      this.currentLimit = Math.min(this.currentLimit + 10, 120);
    } else if (errorRate < 0.01 && blockRate > 0.1) {
      // Low errors, high block rate → increase moderately
      this.currentLimit = Math.min(this.currentLimit + 5, 100);
    } else if (errorRate > 0.05) {
      // High error rate → decrease limit to protect server
      this.currentLimit = Math.max(this.currentLimit - 10, 10);
    } else if (errorRate > 0.1) {
      // Very high error rate → aggressive decrease
      this.currentLimit = Math.max(this.currentLimit - 20, 5);
    }
    
    if (oldLimit !== this.currentLimit) {
      const adjustment = {
        timestamp: now,
        from: oldLimit,
        to: this.currentLimit,
        reason: errorRate > 0.05 ? 'high_error_rate' : 'low_error_high_block',
        errorRate: Math.round(errorRate * 10000) / 100,
        blockRate: Math.round(blockRate * 10000) / 100,
      };
      this.stats.adjustmentHistory.push(adjustment);
      console.log(`[RATE LIMIT] Auto-adjusted: ${oldLimit} → ${this.currentLimit} req/min (error=${adjustment.errorRate}%, blocked=${adjustment.blockRate}%)`);
    }
  }

  // Hourly snapshot for trend analysis
  takeSnapshot() {
    const snapshot = {
      timestamp: Date.now(),
      limit: this.currentLimit,
      allowed: this.stats.totalAllowed,
      blocked: this.stats.totalBlocked,
      errors: this.stats.totalErrors,
      p99QueueTime: this.getPercentile(99),
      activeIPs: Object.keys(this.requests).length,
    };
    this.stats.hourlySnapshots.push(snapshot);
    if (this.stats.hourlySnapshots.length > 168) { // Keep 1 week
      this.stats.hourlySnapshots = this.stats.hourlySnapshots.slice(-168);
    }
    
    // Reset counters for next hour
    this.stats.totalAllowed = 0;
    this.stats.totalBlocked = 0;
    this.stats.totalErrors = 0;
  }

  // Calculate percentile of queue times
  getPercentile(p) {
    const arr = this.stats.queueTimes;
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  // Get current queue depth (approximate)
  getQueueDepth() {
    const now = Date.now();
    let active = 0;
    for (const ip of Object.keys(this.requests)) {
      const recent = this.requests[ip].filter(t => now - t < 5000); // Last 5 seconds
      active += recent.length;
    }
    return active;
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    for (const ip of Object.keys(this.requests)) {
      this.requests[ip] = this.requests[ip].filter(t => now - t < this.windowMs);
      if (this.requests[ip].length === 0) delete this.requests[ip];
    }
  }

  // Get full metrics
  getMetrics() {
    const queueTimes = this.stats.queueTimes;
    return {
      currentLimit: this.currentLimit,
      baseLimit: this.baseLimit,
      activeIPs: Object.keys(this.requests).length,
      queueDepth: this.getQueueDepth(),
      stats: {
        allowed: this.stats.totalAllowed,
        blocked: this.stats.totalBlocked,
        errors: this.stats.totalErrors,
        errorRate: this.stats.totalAllowed > 0 
          ? Math.round((this.stats.totalErrors / this.stats.totalAllowed) * 10000) / 100 
          : 0,
        blockRate: (this.stats.totalAllowed + this.stats.totalBlocked) > 0
          ? Math.round((this.stats.totalBlocked / (this.stats.totalAllowed + this.stats.totalBlocked)) * 10000) / 100
          : 0,
      },
      queueTime: {
        p50: this.getPercentile(50),
        p75: this.getPercentile(75),
        p95: this.getPercentile(95),
        p99: this.getPercentile(99),
        avg: queueTimes.length > 0 
          ? Math.round(queueTimes.reduce((a, b) => a + b, 0) / queueTimes.length) 
          : 0,
      },
      adjustmentHistory: this.stats.adjustmentHistory.slice(-20),
      hourlySnapshots: this.stats.hourlySnapshots.slice(-24),
      scalingRecommendation: this.getScalingRecommendation(),
    };
  }

  // Auto-scaling recommendation
  getScalingRecommendation() {
    const queueDepth = this.getQueueDepth();
    const p99 = this.getPercentile(99);
    const errorRate = this.stats.totalAllowed > 0 
      ? this.stats.totalErrors / this.stats.totalAllowed 
      : 0;

    let action = 'none';
    let reason = 'System operating normally';
    let replicas = 1;

    if (queueDepth > 50 || p99 > 10000) {
      action = 'scale_up_urgent';
      reason = `Queue depth: ${queueDepth}, p99: ${p99}ms — add 2 replicas immediately`;
      replicas = 3;
    } else if (queueDepth > 25 || p99 > 5000) {
      action = 'scale_up';
      reason = `Queue depth: ${queueDepth}, p99: ${p99}ms — add 1 replica`;
      replicas = 2;
    } else if (queueDepth < 5 && p99 < 1000 && errorRate < 0.001) {
      action = 'scale_down_possible';
      reason = 'Low load, low latency — could reduce replicas';
      replicas = 1;
    }

    return {
      action,
      reason,
      recommendedReplicas: replicas,
      currentMetrics: {
        queueDepth,
        p99QueueTime: p99 + 'ms',
        errorRate: Math.round(errorRate * 10000) / 100 + '%',
      },
      thresholds: {
        scaleUpQueueDepth: 25,
        scaleUpP99: '5000ms',
        scaleUpUrgentQueueDepth: 50,
        scaleUpUrgentP99: '10000ms',
        scaleDownQueueDepth: 5,
        scaleDownP99: '1000ms',
      },
    };
  }

  // Destroy intervals on shutdown
  destroy() {
    clearInterval(this.tuneInterval);
    clearInterval(this.snapshotInterval);
    clearInterval(this.cleanupInterval);
  }
}

module.exports = AdaptiveRateLimiter;
