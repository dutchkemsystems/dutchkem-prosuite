import { useState } from "react"
import { AgentBrowser } from '~/components/dashboard/AgentBrowser';
import { AgentMonitoringDashboard } from '~/components/dashboard/AgentMonitoringDashboard';

export function ActivityTab({ data }: { data: any }) {
  const [activityTab, setActivityTab] = useState<'browse' | 'monitor'>('browse');

  return (
    <div className="space-y-6">
      <div className="flex gap-1 bg-slate-800 rounded-xl p-1 max-w-md">
        <button onClick={() => setActivityTab('browse')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activityTab === 'browse' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
          }`}>
          🤖 Browse Agents
        </button>
        <button onClick={() => setActivityTab('monitor')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activityTab === 'monitor' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
          }`}>
          📊 Monitor
        </button>
      </div>
      {activityTab === 'browse' && (
        <AgentBrowser isOpen={true} onClose={() => {}} mode="page" agentEnhancement={data.agentEnhancement} />
      )}
      {activityTab === 'monitor' && (
        <AgentMonitoringDashboard />
      )}
    </div>
  );
}
