/**
 * ═══════════════════════════════════════════════════════════════════
 * PERFORMANCE MONITORING MIDDLEWARE
 * 
 * Tracks latency for every API call, broken down by:
 * - Agent ID (A1-A13)
 * - Model used
 * - Network time vs inference time vs middleware time
 * 
 * Exposes /api/metrics for real-time dashboard
 * ═══════════════════════════════════════════════════════════════════
 */

// In-memory metrics store (replace with Redis in production)
const metrics = {
  requests: [],      // Last 1000 requests
  agentStats: {},    // Per-agent aggregated stats
  systemStats: {
    totalRequests: 0,
    totalErrors: 0,
    uptimeStart: Date.now(),
  },
};

const MAX_STORED_REQUESTS = 1000;

// Middleware: attach timing to every request
function timingMiddleware(req, res, next) {
  req._startTime = process.hrtime.bigint();
  req._timestamps = {
    received: Date.now(),
    middlewareStart: null,
    nimCallStart: null,
    nimCallEnd: null,
    responseSent: null,
  };

  // Override res.json to capture response timing
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    req._timestamps.responseSent = Date.now();
    
    // Calculate breakdown
    const totalMs = Number(process.hrtime.bigint() - req._startTime) / 1e6;
    const entry = {
      timestamp: req._timestamps.received,
      path: req.path,
      method: req.method,
      agentId: req.body?.agent_id || null,
      model: data?.model || null,
      statusCode: res.statusCode,
      totalMs: Math.round(totalMs * 100) / 100,
      middlewareMs: req._timestamps.nimCallStart 
        ? req._timestamps.nimCallStart - req._timestamps.received 
        : Math.round(totalMs),
      inferenceMs: (req._timestamps.nimCallStart && req._timestamps.nimCallEnd)
        ? req._timestamps.nimCallEnd - req._timestamps.nimCallStart
        : 0,
      responseMs: req._timestamps.responseSent 
        ? req._timestamps.responseSent - (req._timestamps.nimCallEnd || req._timestamps.received)
        : 0,
      tokens: data?.tokens || null,
      success: data?.success !== false,
      ip: req.ip || 'unknown',
    };

    // Store request
    metrics.requests.push(entry);
    if (metrics.requests.length > MAX_STORED_REQUESTS) {
      metrics.requests = metrics.requests.slice(-MAX_STORED_REQUESTS);
    }

    // Update agent stats
    if (entry.agentId) {
      if (!metrics.agentStats[entry.agentId]) {
        metrics.agentStats[entry.agentId] = {
          totalRequests: 0,
          totalErrors: 0,
          latencies: [],
          models: {},
          avgTokens: { prompt: 0, completion: 0 },
        };
      }
      const agentStat = metrics.agentStats[entry.agentId];
      agentStat.totalRequests++;
      if (!entry.success) agentStat.totalErrors++;
      agentStat.latencies.push(entry.totalMs);
      if (agentStat.latencies.length > 200) {
        agentStat.latencies = agentStat.latencies.slice(-200);
      }
      if (entry.model) {
        agentStat.models[entry.model] = (agentStat.models[entry.model] || 0) + 1;
      }
      if (entry.tokens) {
        agentStat.avgTokens.prompt = Math.round(
          (agentStat.avgTokens.prompt * (agentStat.totalRequests - 1) + (entry.tokens.prompt_tokens || 0)) / agentStat.totalRequests
        );
        agentStat.avgTokens.completion = Math.round(
          (agentStat.avgTokens.completion * (agentStat.totalRequests - 1) + (entry.tokens.completion_tokens || 0)) / agentStat.totalRequests
        );
      }
    }

    metrics.systemStats.totalRequests++;
    if (!entry.success) metrics.systemStats.totalErrors++;

    // Log for file-based monitoring
    if (entry.agentId) {
      const logLine = `[${new Date(entry.timestamp).toISOString()}] ${entry.agentId} | ${entry.model || 'N/A'} | total=${entry.totalMs}ms middleware=${entry.middlewareMs}ms inference=${entry.inferenceMs}ms | tokens=${JSON.stringify(entry.tokens)} | ${entry.success ? 'OK' : 'ERROR'}`;
      console.log(logLine);
    }

    return originalJson(data);
  };

  next();
}

// Calculate percentiles
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// Metrics endpoint
function metricsRoute(req, res) {
  const agentReport = {};
  
  for (const [agentId, stats] of Object.entries(metrics.agentStats)) {
    const latencies = stats.latencies;
    agentReport[agentId] = {
      totalRequests: stats.totalRequests,
      totalErrors: stats.totalErrors,
      errorRate: stats.totalRequests > 0 
        ? Math.round((stats.totalErrors / stats.totalRequests) * 100 * 10) / 10 
        : 0,
      latency: {
        p50: Math.round(percentile(latencies, 50)),
        p75: Math.round(percentile(latencies, 75)),
        p95: Math.round(percentile(latencies, 95)),
        p99: Math.round(percentile(latencies, 99)),
        avg: latencies.length > 0 
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) 
          : 0,
        min: latencies.length > 0 ? Math.round(Math.min(...latencies)) : 0,
        max: latencies.length > 0 ? Math.round(Math.max(...latencies)) : 0,
      },
      models: stats.models,
      avgTokens: stats.avgTokens,
    };
  }

  // Find slowest agent
  let slowestAgent = null;
  let highestP95 = 0;
  for (const [agentId, report] of Object.entries(agentReport)) {
    if (report.latency.p95 > highestP95) {
      highestP95 = report.latency.p95;
      slowestAgent = agentId;
    }
  }

  // Breakdown analysis
  const recentRequests = metrics.requests.slice(-100).filter(r => r.agentId);
  const avgBreakdown = {
    middleware: 0,
    inference: 0,
    response: 0,
  };
  if (recentRequests.length > 0) {
    avgBreakdown.middleware = Math.round(
      recentRequests.reduce((a, r) => a + r.middlewareMs, 0) / recentRequests.length
    );
    avgBreakdown.inference = Math.round(
      recentRequests.reduce((a, r) => a + r.inferenceMs, 0) / recentRequests.length
    );
    avgBreakdown.response = Math.round(
      recentRequests.reduce((a, r) => a + r.responseMs, 0) / recentRequests.length
    );
  }

  // Bottleneck detection
  let bottleneck = 'unknown';
  const total = avgBreakdown.middleware + avgBreakdown.inference + avgBreakdown.response;
  if (total > 0) {
    const infPct = (avgBreakdown.inference / total) * 100;
    const mwPct = (avgBreakdown.middleware / total) * 100;
    if (infPct > 70) bottleneck = 'nvidia_nim_inference';
    else if (mwPct > 40) bottleneck = 'node_middleware';
    else bottleneck = 'network_latency';
  }

  res.json({
    status: 'ok',
    uptime: Math.round((Date.now() - metrics.systemStats.uptimeStart) / 1000),
    totalRequests: metrics.systemStats.totalRequests,
    totalErrors: metrics.systemStats.totalErrors,
    agents: agentReport,
    slowestAgent: slowestAgent ? {
      agentId: slowestAgent,
      p95Latency: highestP95 + 'ms',
      recommendation: highestP95 > 5000 
        ? `Consider switching ${slowestAgent} to a faster model (meta/llama-3.1-8b-instruct) or reducing max_tokens`
        : highestP95 > 3000 
        ? `${slowestAgent} latency is moderate. Consider reducing temperature or max_tokens`
        : `${slowestAgent} latency is acceptable`,
    } : null,
    latencyBreakdown: {
      avg: avgBreakdown,
      bottleneck,
      recommendation: bottleneck === 'nvidia_nim_inference'
        ? 'Inference is the bottleneck. Reduce max_tokens, lower temperature, or switch slower agents to 8B model.'
        : bottleneck === 'node_middleware'
        ? 'Node.js middleware is slow. Check JSON parsing, reduce history size, add caching.'
        : 'Network latency to NVIDIA API. Consider using a closer region or adding response caching.',
    },
    recentRequests: metrics.requests.slice(-20).map(r => ({
      time: new Date(r.timestamp).toISOString(),
      agent: r.agentId,
      model: r.model,
      totalMs: r.totalMs,
      success: r.success,
    })),
  });
}

// Reset metrics
function resetMetrics(req, res) {
  metrics.requests = [];
  metrics.agentStats = {};
  metrics.systemStats.totalRequests = 0;
  metrics.systemStats.totalErrors = 0;
  res.json({ status: 'ok', message: 'Metrics reset' });
}

module.exports = { timingMiddleware, metricsRoute, resetMetrics, metrics };
