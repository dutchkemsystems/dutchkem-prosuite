#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 * DUTCHKEM VENTURES — LOAD TEST SCRIPT
 * 
 * Simulates realistic traffic across all 13 agents for 1 hour.
 * Reports latency percentiles, error rates, and scaling recommendations.
 * 
 * Usage:
 *   node scripts/loadtest.js                    # Default: 10 req/min for 5 minutes
 *   node scripts/loadtest.js --rps 2 --duration 60  # 2 req/sec for 60 minutes
 *   node scripts/loadtest.js --burst             # Burst test: 100 requests in 10 seconds
 * ═══════════════════════════════════════════════════════════════════
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

// Parse args
const args = process.argv.slice(2);
const getArg = (name, defaultVal) => {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) return parseFloat(args[idx + 1]);
  return defaultVal;
};
const isBurst = args.includes('--burst');

const RPS = getArg('rps', 0.17);              // Requests per second (default: ~10/min)
const DURATION_MINUTES = getArg('duration', 5); // Minutes to run
const TOTAL_REQUESTS = isBurst ? 100 : Math.ceil(RPS * 60 * DURATION_MINUTES);

// Agent test messages (realistic user inputs)
const testMessages = [
  { agent: 'A1', message: 'I need help writing a 5-page essay on renewable energy in Nigeria for my 300-level course. APA format, due Friday.' },
  { agent: 'A2', message: 'Format this citation in APA 7th: Smith, J. (2023). Climate Change in West Africa. Lagos University Press.' },
  { agent: 'A3', message: 'Find 10 recent papers on artificial intelligence in Nigerian education. I need a literature review for my thesis.' },
  { agent: 'A4', message: 'Check this paragraph for plagiarism and suggest paraphrasing: The impact of technology on modern education cannot be overstated.' },
  { agent: 'A5', message: 'I have survey data from 200 respondents. I need to run ANOVA to compare 3 groups. What do you need from me?' },
  { agent: 'A6', message: 'Create a 15-slide presentation on my thesis topic: Impact of Mobile Banking on Financial Inclusion in Rural Nigeria.' },
  { agent: 'A7', message: 'My supervisor says my methodology chapter needs more justification. Here is her feedback: "Why did you choose qualitative over mixed methods?"' },
  { agent: 'A8', message: 'I have a 20-minute video in Yoruba that needs English subtitles. What will it cost and how long will it take?' },
  { agent: 'A9', message: 'I have a messy Excel file with 5000 rows of sales data. Many duplicates and missing values. Can you clean it and create a dashboard?' },
  { agent: 'A10', message: 'My Samsung Galaxy S23 was stolen at Ikeja bus stop yesterday evening around 7pm. I need help recovering it.' },
  { agent: 'A11', message: 'I want to grow my TikTok from 500 to 10K followers in 30 days. My niche is Nigerian comedy skits.' },
  { agent: 'A12', message: 'Write a business plan for a food delivery startup in Lagos targeting working professionals. I have ₦2M starting capital.' },
  { agent: 'A13', message: 'I\'m preparing for JAMB 2025. I need past questions for Use of English, Mathematics, Physics, and Chemistry.' },
];

// System prompts (shortened for load testing)
const systemPrompts = {
  A1: 'You are Academic Pro by Dutchkem Ventures. Help with academic writing.',
  A2: 'You are FormatPro. Help with citations and formatting.',
  A3: 'You are LitReview Pro. Help with literature reviews.',
  A4: 'You are Plagiarism Pro. Help with plagiarism checking.',
  A5: 'You are StatsPro. Help with statistical analysis.',
  A6: 'You are Presentation Pro. Help with presentations.',
  A7: 'You are Grant Pro. Help with academic career.',
  A8: 'You are MediaStudio Pro. Help with media production.',
  A9: 'You are DataPro. Help with data analysis.',
  A10: 'You are PhoneGuard Pro. Help with phone security and recovery.',
  A11: 'You are ContentPro. Help with social media content.',
  A12: 'You are BusinessPro. Help with business consulting.',
  A13: 'You are ServiceMart NG. Help with exam prep and career services.',
};

// Results storage
const results = [];

async function sendRequest(testMsg) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: testMsg.agent,
        message: testMsg.message,
        history: [],
        system_prompt: systemPrompts[testMsg.agent],
      }),
    });
    
    const elapsed = Date.now() - start;
    const data = await res.json();
    
    return {
      agent: testMsg.agent,
      success: res.ok && data.success !== false,
      latency: elapsed,
      statusCode: res.status,
      tokens: data.tokens || null,
      model: data.model || null,
      error: data.success === false ? data.message : null,
    };
  } catch (err) {
    return {
      agent: testMsg.agent,
      success: false,
      latency: Date.now() - start,
      statusCode: 0,
      error: err.message,
    };
  }
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.ceil((p / 100) * sorted.length) - 1] || 0;
}

async function runLoadTest() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   DUTCHKEM VENTURES — LOAD TEST                               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🎯 Target:    ${BASE_URL}`);
  console.log(`📊 Mode:      ${isBurst ? 'BURST (100 requests fast)' : `Sustained ${RPS} req/sec for ${DURATION_MINUTES} min`}`);
  console.log(`📨 Total:     ${TOTAL_REQUESTS} requests across 13 agents`);
  console.log('');

  // Health check first
  try {
    const health = await fetch(`${BASE_URL}/api/health`);
    const healthData = await health.json();
    console.log(`✅ Server is ${healthData.nvidia_nim === 'live' ? 'LIVE with NVIDIA NIM' : 'running (NIM: ' + healthData.nvidia_nim + ')'}`);
  } catch {
    console.log('❌ Server not reachable at ' + BASE_URL);
    console.log('   Start it with: cd server && node index.js');
    process.exit(1);
  }

  console.log('');
  console.log('🚀 Starting load test...');
  console.log('');

  const startTime = Date.now();
  const delayMs = isBurst ? 100 : (1000 / RPS);

  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    const testMsg = testMessages[i % testMessages.length];
    const result = await sendRequest(testMsg);
    results.push(result);

    const icon = result.success ? '✅' : '❌';
    process.stdout.write(`\r  ${icon} [${i + 1}/${TOTAL_REQUESTS}] ${result.agent} | ${result.latency}ms | ${result.model || 'N/A'}`);

    // Wait between requests (unless burst mode)
    if (i < TOTAL_REQUESTS - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  const totalTime = Date.now() - startTime;
  console.log('\n');

  // ═══ REPORT ═══
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const latencies = successful.map(r => r.latency);

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   LOAD TEST RESULTS                                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`⏱️  Duration:       ${Math.round(totalTime / 1000)}s`);
  console.log(`📨 Total requests: ${results.length}`);
  console.log(`✅ Successful:     ${successful.length} (${Math.round(successful.length / results.length * 100)}%)`);
  console.log(`❌ Failed:         ${failed.length} (${Math.round(failed.length / results.length * 100)}%)`);
  console.log(`📊 Throughput:     ${(results.length / (totalTime / 1000)).toFixed(2)} req/sec`);
  console.log('');

  if (latencies.length > 0) {
    console.log('📉 Latency Distribution:');
    console.log(`   Min:  ${Math.min(...latencies)}ms`);
    console.log(`   p50:  ${percentile(latencies, 50)}ms`);
    console.log(`   p75:  ${percentile(latencies, 75)}ms`);
    console.log(`   p90:  ${percentile(latencies, 90)}ms`);
    console.log(`   p95:  ${percentile(latencies, 95)}ms`);
    console.log(`   p99:  ${percentile(latencies, 99)}ms`);
    console.log(`   Max:  ${Math.max(...latencies)}ms`);
    console.log(`   Avg:  ${Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)}ms`);
    console.log('');
  }

  // Per-agent breakdown
  console.log('🤖 Per-Agent Latency (p95):');
  const agentIds = [...new Set(results.map(r => r.agent))].sort();
  for (const agentId of agentIds) {
    const agentResults = successful.filter(r => r.agent === agentId);
    const agentLatencies = agentResults.map(r => r.latency);
    if (agentLatencies.length > 0) {
      const p95 = percentile(agentLatencies, 95);
      const bar = '█'.repeat(Math.min(50, Math.round(p95 / 200)));
      console.log(`   ${agentId.padEnd(4)} ${bar} ${p95}ms (${agentResults.length} reqs)`);
    }
  }
  console.log('');

  // Error analysis
  if (failed.length > 0) {
    console.log('❌ Error Breakdown:');
    const errorCounts = {};
    for (const f of failed) {
      const key = f.statusCode === 429 ? 'Rate Limited (429)' : f.error || `HTTP ${f.statusCode}`;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    }
    for (const [err, count] of Object.entries(errorCounts)) {
      console.log(`   ${err}: ${count}`);
    }
    console.log('');
  }

  // Recommendations
  const errorRate = failed.length / results.length;
  const p99 = percentile(latencies, 99);
  const rateLimitErrors = failed.filter(r => r.statusCode === 429).length;

  console.log('💡 Recommendations:');
  
  if (errorRate < 0.001 && rateLimitErrors > 0) {
    console.log(`   ✅ Error rate is excellent (${(errorRate * 100).toFixed(2)}%)`);
    console.log(`   ⬆️  INCREASE rate limit: ${rateLimitErrors} requests were rate-limited`);
    console.log(`   📝 Recommended: 60 req/min (currently 30)`);
  } else if (errorRate < 0.01) {
    console.log(`   ✅ Error rate is good (${(errorRate * 100).toFixed(2)}%)`);
    console.log(`   📝 Current rate limit (30/min) is appropriate`);
  } else if (errorRate < 0.05) {
    console.log(`   ⚠️  Error rate is moderate (${(errorRate * 100).toFixed(2)}%)`);
    console.log(`   📝 Consider reducing rate limit to 20 req/min`);
  } else {
    console.log(`   🔴 Error rate is HIGH (${(errorRate * 100).toFixed(2)}%)`);
    console.log(`   📝 Reduce rate limit to 10 req/min or add replicas`);
  }

  if (p99 > 10000) {
    console.log(`   🔴 p99 latency (${p99}ms) is very high — add NIM replicas`);
    console.log(`   📝 Scale to 3 replicas when queue depth > 50`);
  } else if (p99 > 5000) {
    console.log(`   ⚠️  p99 latency (${p99}ms) is moderate — monitor closely`);
    console.log(`   📝 Scale to 2 replicas when queue depth > 25`);
  } else {
    console.log(`   ✅ p99 latency (${p99}ms) is healthy`);
  }

  console.log('');
  console.log('📊 Full metrics available at: ' + BASE_URL + '/api/metrics');
  console.log('🔧 Optimization tips at:      ' + BASE_URL + '/api/optimize');
  console.log('');

  // Fetch and display server-side metrics
  try {
    const metricsRes = await fetch(`${BASE_URL}/api/metrics`);
    const metricsData = await metricsRes.json();
    if (metricsData.slowestAgent) {
      console.log(`🐌 Slowest agent: ${metricsData.slowestAgent.agentId} (p95: ${metricsData.slowestAgent.p95Latency})`);
      console.log(`   → ${metricsData.slowestAgent.recommendation}`);
    }
    if (metricsData.latencyBreakdown) {
      console.log(`🔍 Bottleneck: ${metricsData.latencyBreakdown.bottleneck}`);
      console.log(`   → ${metricsData.latencyBreakdown.recommendation}`);
    }
  } catch {
    // Server metrics unavailable
  }

  console.log('');
}

runLoadTest().catch(console.error);
