import { useState } from 'react';
import { useQuery } from 'convex/react';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../../convex/_generated/api';

const AGENT_ICONS: Record<string, string> = {
  A1: '🎓', A2: '💼', A3: '✍️', A4: '📄', A5: '🛍️',
  A6: '📝', A7: '💰', A8: '🎬', A9: '🏥', A10: '🧹',
  A11: '🗣️', A12: '✈️', A13: '🚀', A14: '📝', A15: '🎉',
};

const AGENT_NAMES: Record<string, string> = {
  A1: 'Academic Writer', A2: 'Business Consultant', A3: 'Content Strategist',
  A4: 'Career Coach', A5: 'Personal Shopper', A6: 'Exam Prep',
  A7: 'Finance Advisor', A8: 'MediaStudio', A9: 'Wellness Coach',
  A10: 'Home Services', A11: 'Language Tutor', A12: 'Travel Planner',
  A13: 'ServiceMart NG', A14: 'Translation Hub', A15: 'Event Planner',
};

export function AgentMonitoringDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'performance' | 'queue'>('overview');
  
  const agentStates: any = useQuery(api.support_orchestrator.getAgentStates);
  const agentLoad: any = useQuery(api.support_orchestrator.getAgentLoad);
  const agentPerformance: any = useQuery(api.support_orchestrator.getAgentPerformance, { days: 7 });
  const queueStatus: any = useQuery(api.support_orchestrator.getQueueStatus);
  const businessHours: any = useQuery(api.support_orchestrator.getBusinessHoursStatus);
  const analytics: any = useQuery(api.support_orchestrator.getSupportAnalytics, { days: 7 });

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'agents' as const, label: 'Agents', icon: '🤖' },
    { id: 'performance' as const, label: 'Performance', icon: '⚡' },
    { id: 'queue' as const, label: 'Queue', icon: '⏳' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Agent Monitoring</h2>
          <p className="text-xs text-slate-400 mt-1">Real-time agent status, performance, and queue management</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            businessHours?.withinHours ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
          }`}>
            {businessHours?.withinHours ? '🟢 Online' : '🟡 After Hours'}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400">
            {queueStatus?.totalActive || 0} active
          </span>
        </div>
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
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-2xl font-black text-emerald-400">{analytics?.totalInteractions || 0}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Total Conversations (7d)</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-2xl font-black text-blue-400">{analytics?.avgResponseMs || 0}ms</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Avg Response Time</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-2xl font-black text-amber-400">{queueStatus?.availableSlots || 50}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Available Slots</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-2xl font-black text-purple-400">{analytics?.routedCount || 0}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Routed to Agents</p>
            </div>
          </div>

          {/* Business Hours */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Business Hours</p>
                <p className="text-xs text-slate-400">{businessHours?.hours || '8:00 - 22:00 WAT'}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                businessHours?.withinHours ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {businessHours?.withinHours ? 'Open Now' : 'Closed'}
              </span>
            </div>
            {businessHours?.message && (
              <p className="text-xs text-slate-400 mt-2">{businessHours.message}</p>
            )}
          </div>

          {/* Queue Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-sm font-bold text-white mb-3">Queue Status</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl">
                <p className="text-lg font-black text-white">{queueStatus?.totalActive || 0}</p>
                <p className="text-[10px] text-slate-500">Active Conversations</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl">
                <p className="text-lg font-black text-emerald-400">{queueStatus?.availableSlots || 50}</p>
                <p className="text-[10px] text-slate-500">Available Slots</p>
              </div>
            </div>
            <div className="mt-3 w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full transition-all" style={{
                width: `${queueStatus ? ((queueStatus.totalActive / queueStatus.maxConcurrent) * 100) : 0}%`
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Agents Tab */}
      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(AGENT_NAMES).map(([id, name]) => {
            const enabled = agentStates?.[id] !== false;
            const load = agentLoad?.[id] || 0;
            const perf = agentPerformance?.[id];
            return (
              <div key={id} className={`p-4 rounded-2xl border transition-all ${
                enabled ? 'bg-slate-900 border-slate-800' : 'bg-slate-950 border-slate-800 opacity-50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{AGENT_ICONS[id]}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{name}</p>
                      <p className="text-[9px] text-slate-500">{id}</p>
                    </div>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Load: {load}</span>
                  <span>Score: {perf?.score || 0}</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div className={`h-full rounded-full ${
                    load >= 3 ? 'bg-red-500' : load >= 1 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} style={{ width: `${Math.min(100, load * 20)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-3">
          {agentPerformance && Object.entries(agentPerformance).map(([id, perf]: [string, any]) => (
            <div key={id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{AGENT_ICONS[id]}</span>
                <div>
                  <p className="text-sm font-bold text-white">{AGENT_NAMES[id]}</p>
                  <p className="text-[10px] text-slate-500">{perf.totalInteractions} conversations · {perf.avgResponseMs}ms avg</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`text-lg font-black ${perf.score >= 70 ? 'text-emerald-400' : perf.score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{perf.score}</p>
                  <p className="text-[9px] text-slate-500">score</p>
                </div>
                <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${perf.score >= 70 ? 'bg-emerald-500' : perf.score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${perf.score}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-4">Queue Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl">
                <p className="text-3xl font-black text-white">{queueStatus?.totalActive || 0}</p>
                <p className="text-xs text-slate-400">Active Now</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl">
                <p className="text-3xl font-black text-emerald-400">{queueStatus?.availableSlots || 50}</p>
                <p className="text-xs text-slate-400">Available</p>
              </div>
            </div>
            <div className="mt-4 w-full h-3 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 rounded-full transition-all" style={{
                width: `${queueStatus ? ((queueStatus.totalActive / queueStatus.maxConcurrent) * 100) : 0}%`
              }} />
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-slate-500">
              <span>0</span>
              <span>{queueStatus?.maxConcurrent || 50} max</span>
            </div>
          </div>

          {/* Per-Agent Load */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-white mb-3">Per-Agent Load</h3>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {queueStatus?.agentLoads && Object.entries(queueStatus.agentLoads).map(([id, load]: [string, any]) => (
                <div key={id} className="text-center p-2 bg-slate-950 rounded-xl">
                  <span className="text-lg">{AGENT_ICONS[id]}</span>
                  <p className={`text-sm font-black ${load >= 3 ? 'text-red-400' : load >= 1 ? 'text-amber-400' : 'text-emerald-400'}`}>{load}</p>
                  <p className="text-[8px] text-slate-500">{id}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
