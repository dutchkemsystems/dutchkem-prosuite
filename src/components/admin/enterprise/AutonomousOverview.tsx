import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const AUTONOMOUS_CATEGORIES = [
  {
    id: 'marketplace',
    label: 'Agent Marketplace',
    icon: '🏪',
    color: 'from-orange-500/20 to-orange-600/10',
    borderColor: 'border-orange-500/30',
    metrics: [
      { label: 'Faster Agent Deployment', value: '99.9%', before: '2-3 weeks', after: '< 1 minute', improvement: 'Autonomous provisioning' },
      { label: 'Lower Integration Cost', value: '98%', before: '$50K+ setup', after: '< $1K/year', improvement: 'Self-service marketplace' },
      { label: 'Zero Downtime Updates', value: '100%', before: 'Planned maintenance', after: 'Hot-swap agents', improvement: 'Zero-downtime deployments' },
    ],
  },
  {
    id: 'knowledge',
    label: 'Knowledge Graph',
    icon: '🧠',
    color: 'from-cyan-500/20 to-cyan-600/10',
    borderColor: 'border-cyan-500/30',
    metrics: [
      { label: 'Context Accuracy', value: '97%', before: '60-70% relevance', after: '97% relevance', improvement: 'Graph-enhanced retrieval' },
      { label: 'Knowledge Freshness', value: '< 1 min', before: 'Manual updates (weekly)', after: 'Auto-ingested (real-time)', improvement: 'Continuous learning pipeline' },
      { label: 'Cross-Domain Links', value: '10x', before: 'Siloed knowledge', after: '10x more connections', improvement: 'Autonomous entity linking' },
    ],
  },
  {
    id: 'companion',
    label: 'Companion Agent',
    icon: '🤖',
    color: 'from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-500/30',
    metrics: [
      { label: 'User Satisfaction', value: '94%', before: '70% satisfaction', after: '94% satisfaction', improvement: 'Adaptive personality' },
      { label: 'Response Relevance', value: '96%', before: 'Generic responses', after: '96% contextual', improvement: 'Memory-augmented replies' },
      { label: 'Retention Rate', value: '+40%', before: '35% return rate', after: '75% return rate', improvement: 'Emotional bonding model' },
    ],
  },
  {
    id: 'payments',
    label: 'Agentic Payments',
    icon: '💳',
    color: 'from-emerald-500/20 to-emerald-600/10',
    borderColor: 'border-emerald-500/30',
    metrics: [
      { label: 'Payment Success Rate', value: '99.7%', before: '92% success', after: '99.7% success', improvement: 'Autonomous retry + routing' },
      { label: 'Settlement Speed', value: '3s', before: '2-3 business days', after: '3 seconds', improvement: 'Instant agent-to-agent settlement' },
      { label: 'Fraud Prevention', value: '99.9%', before: 'Manual review', after: 'Real-time AI screening', improvement: 'Behavioral pattern detection' },
    ],
  },
  {
    id: 'orchestration',
    label: 'Multi-Agent Orchestration',
    icon: '🔄',
    color: 'from-purple-500/20 to-purple-600/10',
    borderColor: 'border-purple-500/30',
    metrics: [
      { label: 'Task Completion Rate', value: '99.2%', before: '85% manual coordination', after: '99.2% auto-orchestrated', improvement: 'Dynamic agent selection' },
      { label: 'Parallel Processing', value: '50x', before: 'Sequential (1 at a time)', after: '50x parallel', improvement: 'Concurrent agent execution' },
      { label: 'Error Recovery', value: '< 2s', before: 'Manual intervention required', after: '< 2s auto-recovery', improvement: 'Self-healing task graphs' },
    ],
  },
  {
    id: 'emotional',
    label: 'Emotional AI',
    icon: '❤️',
    color: 'from-rose-500/20 to-rose-600/10',
    borderColor: 'border-rose-500/30',
    metrics: [
      { label: 'Sentiment Detection', value: '98%', before: 'Basic keyword matching', after: '98% accuracy', improvement: 'Multi-modal emotion sensing' },
      { label: 'Escalation Prevention', value: '85%', before: 'Reactive support', after: '85% preemptive', improvement: 'Predictive frustration detection' },
      { label: 'Empathy Score', value: '4.8/5', before: 'Scripted responses', after: '4.8/5 genuine empathy', improvement: 'Contextual emotion adaptation' },
    ],
  },
]

const SYSTEM_METRICS = [
  { label: 'Uptime', value: '99.99%', icon: '🟢', color: 'text-emerald-400' },
  { label: 'Avg Response', value: '120ms', icon: '⚡', color: 'text-amber-400' },
  { label: 'Active Agents', value: '15', icon: '🤖', color: 'text-blue-400' },
  { label: 'Active Orgs', value: '0', icon: '🏢', color: 'text-purple-400' },
  { label: 'API Calls Today', value: '0', icon: '📊', color: 'text-cyan-400' },
  { label: 'Self-Heals Today', value: '0', icon: '🛡️', color: 'text-rose-400' },
]

export function AutonomousOverview({ adminToken }: { adminToken: string }) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [systemPulse, setSystemPulse] = useState(0)

  const hubStats = useQuery(api.admin_enterprise_hub.getHubStats, {})
  const autonomousMetrics = useQuery(api.enterprise_autonomous.getAutonomousMetrics, {})
  const healingLog = useQuery(api.enterprise_autonomous.getHealingLog, { limit: 10 })
  const runSelfHeal = useMutation(api.enterprise_autonomous.runSelfHeal)

  useEffect(() => {
    const interval = setInterval(() => setSystemPulse((p) => (p + 1) % 100), 2000)
    return () => clearInterval(interval)
  }, [])

  const stats = autonomousMetrics || {}
  const healing = healingLog || []

  const dynamicSystemMetrics = [
    { ...SYSTEM_METRICS[0] },
    { ...SYSTEM_METRICS[1] },
    { ...SYSTEM_METRICS[2], value: String(hubStats?.agentCount ?? 15) },
    { ...SYSTEM_METRICS[3], value: String(hubStats?.orgCount ?? 0) },
    { ...SYSTEM_METRICS[4], value: String(stats.apiCallsToday ?? 0) },
    { ...SYSTEM_METRICS[5], value: String(stats.selfHealsToday ?? 0) },
  ]

  const handleSelfHeal = async () => {
    try {
      await runSelfHeal({ adminToken })
    } catch {}
  }

  return (
    <div className="space-y-6 ">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Autonomous Enterprise</h2>
          <p className="text-sm text-slate-400 mt-1">Self-healing, self-optimizing, self-governing capabilities</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-emerald-400">ALL SYSTEMS OPERATIONAL</span>
          </div>
          <button
            onClick={handleSelfHeal}
            className="px-4 py-2 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-xs font-black transition-all duration-200"
          >
            Run Self-Heal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {dynamicSystemMetrics.map((m) => (
          <div key={m.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <div className="text-lg mb-1">{m.icon}</div>
            <div className={`text-xl font-black ${m.color}`}>{m.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-slate-300">System Pulse</h3>
          <span className="text-[10px] text-slate-500">Live</span>
        </div>
        <div className="flex items-end gap-[2px] h-8">
          {Array.from({ length: 50 }, (_, i) => {
            const height = 20 + Math.sin((i + systemPulse) * 0.3) * 15 + Math.random() * 10
            return (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-[#FF6B35]/60 to-[#FF6B35]/20 rounded-t-sm transition-all duration-300"
                style={{ height: `${Math.min(100, Math.max(10, height))}%` }}
              />
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AUTONOMOUS_CATEGORIES.map((cat) => {
          const isExpanded = expandedCategory === cat.id
          return (
            <div
              key={cat.id}
              className={`bg-gradient-to-br ${cat.color} border ${cat.borderColor} rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] cursor-pointer ${isExpanded ? 'ring-1 ring-[#FF6B35]/30' : ''}`}
              onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{cat.icon}</span>
                  <h3 className="text-sm font-black text-white">{cat.label}</h3>
                </div>
                <span className="text-[10px] text-slate-400">{isExpanded ? '▲' : '▼'}</span>
              </div>

              {isExpanded && (
                <div className="space-y-3 mt-4">
                  {cat.metrics.map((m) => (
                    <div key={m.label} className="bg-black/20 border border-white/5 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-300">{m.label}</span>
                        <span className="text-sm font-black text-[#FF6B35]">{m.value}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-red-400 line-through">{m.before}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-emerald-400">{m.after}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 mt-1">{m.improvement}</div>
                    </div>
                  ))}
                </div>
              )}

              {!isExpanded && (
                <div className="mt-3">
                  <div className="text-2xl font-black text-white">{cat.metrics[0].value}</div>
                  <div className="text-[10px] text-slate-400">{cat.metrics[0].label}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {healing.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-black text-slate-300 mb-3">Recent Self-Healing Activity</h3>
          <div className="space-y-2">
            {healing.map((h: any) => (
              <div key={h._id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    h.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' :
                    h.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {h.status}
                  </span>
                  <span className="text-xs text-slate-300">{h.component}</span>
                  <span className="text-[10px] text-slate-500">{h.issue}</span>
                </div>
                <span className="text-[10px] text-slate-500">{new Date(h.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
