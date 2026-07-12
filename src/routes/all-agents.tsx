import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AgentBrowser } from '~/components/dashboard/AgentBrowser'
import { AgentMonitoringDashboard } from '~/components/dashboard/AgentMonitoringDashboard'

export const Route = createFileRoute('/all-agents')({
  component: AllAgentsPage,
})

function AllAgentsPage() {
  const [activeTab, setActiveTab] = useState<'browse' | 'monitor'>('browse')

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-800 rounded-xl p-1 mb-6 max-w-md">
        <button onClick={() => setActiveTab('browse')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'browse' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
          }`}>
          🤖 Browse Agents
        </button>
        <button onClick={() => setActiveTab('monitor')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'monitor' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
          }`}>
          📊 Monitor
        </button>
      </div>

      {/* Content */}
      {activeTab === 'browse' && (
        <AgentBrowser isOpen={true} onClose={() => {}} mode="page" />
      )}
      {activeTab === 'monitor' && (
        <AgentMonitoringDashboard />
      )}
    </div>
  )
}
