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

export function ClientAnalyticsDashboard({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'spending' | 'agents'>('overview');

  const analytics: any = useQuery(api.support_orchestrator.getSupportAnalytics, { days: 30 });
  const agentPerformance: any = useQuery(api.support_orchestrator.getAgentPerformance, { days: 30 });

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'usage' as const, label: 'My Usage', icon: '📈' },
    { id: 'spending' as const, label: 'Spending', icon: '💰' },
    { id: 'agents' as const, label: 'Agent Performance', icon: '🤖' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">My Analytics</h2>
          <p className="text-xs text-slate-400 mt-1">Track your usage, spending, and agent performance</p>
        </div>
      </div>

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

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-2xl font-black text-blue-400">{analytics?.totalInteractions || 0}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Total Conversations</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-2xl font-black text-emerald-400">{analytics?.routedCount || 0}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Routed to Agents</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-2xl font-black text-amber-400">{analytics?.avgResponseMs || 0}ms</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Avg Response Time</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-2xl font-black text-purple-400">{analytics?.totalEscalations || 0}</p>
              <p className="text-[10px] text-slate-500 uppercase mt-1">Escalations</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'usage' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">Usage Breakdown (30 days)</h3>
            <div className="space-y-3">
              {Object.entries(analytics?.agentCounts || {}).map(([id, count]: [string, any]) => (
                <div key={id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{AGENT_ICONS[id]}</span>
                    <span className="text-xs text-white">{AGENT_NAMES[id] || id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">{count} chats</span>
                    <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{
                        width: `${analytics?.totalInteractions ? (count / analytics.totalInteractions) * 100 : 0}%`
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'spending' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">Spending Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl">
                <p className="text-lg font-black text-emerald-400">Free</p>
                <p className="text-[10px] text-slate-500">Pre-subscription exchanges</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl">
                <p className="text-lg font-black text-blue-400">Active</p>
                <p className="text-[10px] text-slate-500">Subscription plan</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'agents' && (
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
    </div>
  );
}
