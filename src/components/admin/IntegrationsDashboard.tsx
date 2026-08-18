import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const INTEGRATION_ICONS: Record<string, string> = {
  'agent-reach': '🌍',
  'understand-anything': '🧠',
  'openosint': '🔍',
  'voicebox': '🎙️',
}

export function IntegrationsDashboard({ adminToken }: { adminToken: string }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'agent-reach' | 'understand' | 'osint' | 'voicebox'>('overview')

  const dashboard: any = useQuery(api.integrations.getDashboard)

  if (!dashboard) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-black">🔌 Open-Source Integrations</h2>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'agent-reach' as const, label: 'Agent Reach', icon: '🌍' },
    { id: 'understand' as const, label: 'Understand', icon: '🧠' },
    { id: 'osint' as const, label: 'OpenOSINT', icon: '🔍' },
    { id: 'voicebox' as const, label: 'Voicebox', icon: '🎙️' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">🔌 Open-Source Integrations</h2>
        <p className="text-xs text-slate-400 mt-1">Agent Reach + Understand Anything + OpenOSINT + Voicebox — All FREE</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Integrations" value={dashboard.totalIntegrations} icon="🔌" color="blue" />
        <KPICard label="Total Features" value={dashboard.totalFeatures} icon="✨" color="emerald" />
        <KPICard label="Total Cost" value="FREE" icon="🆓" color="purple" />
        <KPICard label="All Active" value="4/4" icon="✅" color="cyan" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dashboard.integrations?.map((integration: any) => (
            <div key={integration.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{INTEGRATION_ICONS[integration.id]}</span>
                <div>
                  <h3 className="text-sm font-bold">{integration.name}</h3>
                  <p className="text-[10px] text-slate-500">{integration.description}</p>
                </div>
                <span className="ml-auto px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">
                  {integration.status}
                </span>
              </div>
              <div className="space-y-2">
                {integration.features?.map((feature: string) => (
                  <div key={feature} className="flex items-center gap-2">
                    <span className="text-emerald-400">✅</span>
                    <span className="text-xs text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                {Object.entries(integration.stats || {}).map(([key, value]) => (
                  <span key={key} className="text-[10px] px-2 py-0.5 bg-slate-800 rounded text-slate-400">
                    {key}: {String(value)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agent Reach Tab */}
      {activeTab === 'agent-reach' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold mb-4">🌍 Agent Reach — Zero-Cost Social Listening</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {['Twitter/X', 'Reddit', 'YouTube', 'LinkedIn', 'Bilibili'].map((platform) => (
              <div key={platform} className="bg-slate-800 rounded-xl p-3 text-center">
                <span className="text-2xl">{platform === 'Twitter/X' ? '🐦' : platform === 'Reddit' ? '🤖' : platform === 'YouTube' ? '📺' : platform === 'LinkedIn' ? '💼' : '🎬'}</span>
                <p className="text-xs font-bold mt-2">{platform}</p>
                <p className="text-[10px] text-emerald-400">FREE</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-bold mb-2">How It Works</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Zero API fees — uses public APIs and proxies</li>
              <li>• Auto-maintains tools — no manual updates needed</li>
              <li>• Multi-backend routing — fails over when one backend is down</li>
              <li>• Works with ALL 15 AI agents</li>
            </ul>
          </div>
        </div>
      )}

      {/* Understand Anything Tab */}
      {activeTab === 'understand' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold mb-4">🧠 Understand Anything — Code Knowledge Graphs</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {['Codebase Analysis', 'Knowledge Graphs', 'Impact Analysis', 'Dependency Tracking'].map((cap) => (
              <div key={cap} className="bg-slate-800 rounded-xl p-3 text-center">
                <span className="text-2xl">📊</span>
                <p className="text-xs font-bold mt-2">{cap}</p>
                <p className="text-[10px] text-emerald-400">FREE</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-bold mb-2">Capabilities</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Interactive code knowledge graphs</li>
              <li>• Multi-agent code analysis</li>
              <li>• Visual dashboard + guided tours</li>
              <li>• Impact analysis for changes</li>
            </ul>
          </div>
        </div>
      )}

      {/* OpenOSINT Tab */}
      {activeTab === 'osint' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold mb-4">🔍 OpenOSINT — AI-Powered Intelligence</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { name: 'Email Lookup', icon: '📧' },
              { name: 'Username Search', icon: '👤' },
              { name: 'Domain Intel', icon: '🌐' },
              { name: 'IP Lookup', icon: '📍' },
              { name: 'Phone Lookup', icon: '📱' },
              { name: 'WHOIS', icon: '📋' },
              { name: 'DNS Lookup', icon: '🔍' },
              { name: 'Breach Check', icon: '🔓' },
            ].map((tool) => (
              <div key={tool.name} className="bg-slate-800 rounded-xl p-3 text-center">
                <span className="text-2xl">{tool.icon}</span>
                <p className="text-xs font-bold mt-2">{tool.name}</p>
                <p className="text-[10px] text-emerald-400">FREE</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-bold mb-2">18 Investigation Tools</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Email, username, breach, domain, IP search</li>
              <li>• Local models for privacy</li>
              <li>• CLI, MCP server, web UI</li>
              <li>• No API keys required for basic lookups</li>
            </ul>
          </div>
        </div>
      )}

      {/* Voicebox Tab */}
      {activeTab === 'voicebox' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold mb-4">🎙️ Voicebox — Voice Cloning & TTS</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { name: 'Text-to-Speech', icon: '🔊' },
              { name: 'Voice Cloning', icon: '🎤' },
              { name: 'Agent Voice', icon: '🤖' },
              { name: 'Batch Generate', icon: '📦' },
            ].map((feature) => (
              <div key={feature.name} className="bg-slate-800 rounded-xl p-3 text-center">
                <span className="text-2xl">{feature.icon}</span>
                <p className="text-xs font-bold mt-2">{feature.name}</p>
                <p className="text-[10px] text-emerald-400">FREE</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-bold mb-2">4 TTS Engines (All FREE)</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Coqui TTS — High quality, local</li>
              <li>• Edge TTS — Microsoft, free, high quality</li>
              <li>• Google TTS — Fast, reliable</li>
              <li>• Pyttsx3 — Offline, basic</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function KPICard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400', amber: 'text-amber-400', blue: 'text-blue-400',
    purple: 'text-purple-400', cyan: 'text-cyan-400', slate: 'text-slate-400',
  }
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</span>
      </div>
      <p className={`text-2xl font-black ${colorMap[color] || 'text-white'}`}>{value}</p>
    </div>
  )
}
