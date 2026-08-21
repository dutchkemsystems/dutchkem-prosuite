import { useNavigate } from '@tanstack/react-router'
import {
  CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { ActivityStats, SocialProofFeed } from '~/components/SocialProofFeed';
import { FlashSaleBanner } from '~/components/FlashSaleBanner';
import { StatCard, Section, SubscriptionRow, EmptyState, StatusBadge, ActionButton } from './shared';

export function Overview({ data, setActiveTab, setModal, setShowAgentBrowser, setShowCredits, setShowHistory, setShowSupport }: { data: any, setActiveTab: (tab: string) => void, setModal: (m: string | null) => void, setShowAgentBrowser: (v: boolean) => void, setShowCredits: (v: boolean) => void, setShowHistory: (v: boolean) => void, setShowSupport: (v: boolean) => void }) {
  const navigate = useNavigate();
  const chartData = [
    { name: 'Week 1', value: 4000 },
    { name: 'Week 2', value: 3000 },
    { name: 'Week 3', value: 5000 },
    { name: 'Week 4', value: 8000 },
  ];

  const pieData = [
    { name: 'Business', value: 400 },
    { name: 'Academic', value: 300 },
    { name: 'Content', value: 300 },
    { name: 'Video', value: 200 },
  ];

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];

  return (
    <div className="space-y-8 ">
      <div className="md:hidden">
        <FlashSaleBanner />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Active Plans" value={data.stats.activeSubscriptions} icon="💳" color="indigo" />
        <StatCard label="Total Spent" value={`₦${data.stats.totalSpentThisMonth.toLocaleString()}`} icon="💸" color="emerald" />
        <StatCard label="Completed" value={data.stats.completedProjects} icon="✅" color="blue" />
        <StatCard label="Referral Earned" value={`₦${data.referrals.totalEarned.toLocaleString()}`} icon="🤝" color="amber" />
        <StatCard label="Monthly Savings" value={`₦${data.stats.savingsThisMonth.toLocaleString()}`} icon="💰" color="teal" />
      </div>

      <ActivityStats />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">📈 Subscription Value</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                      itemStyle={{ color: '#6366f1' }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">🧩 Agent Usage</h3>
              <div className="h-64 flex">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <SocialProofFeed limit={8} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Section title="Active Subscriptions" actionLabel="Manage All">
            <div className="space-y-3">
              {data.subscriptions.length === 0 ? (
                <EmptyState icon="💳" text="No active subscriptions." />
              ) : (
                data.subscriptions.map((s: any) => <SubscriptionRow key={s._id} sub={s} />)
              )}
            </div>
          </Section>

          <Section title="Recent Projects" actionLabel="View All">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-white">Project</th>
                    <th className="px-6 py-4 text-white">Agent</th>
                    <th className="px-6 py-4 text-white">Status</th>
                    <th className="px-6 py-4 text-white">Format</th>
                    <th className="px-6 py-4 text-white">Date</th>
                    <th className="px-6 py-4 text-white">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.projects.map((p: any) => (
                    <tr key={p._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium">{p.name}</td>
                      <td className="px-6 py-4 text-slate-400 capitalize">{p.agentId}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-4 text-slate-500">{p.format}</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <button className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">Download</button>
                      </td>
                    </tr>
                  ))}
                  {data.projects.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">No projects yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        <div className="space-y-8">
          <div className="bg-indigo-600 rounded-3xl p-8 shadow-2xl shadow-indigo-600/30">
            <h3 className="text-xl font-bold mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-3">
              <ActionButton icon="➕" text="New Project" highlight onClick={() => setModal("new-project")} />
              <ActionButton icon="🎓" text="Browse All Agents" onClick={() => setShowAgentBrowser(true)} />
              <ActionButton icon="💰" text="Buy Credits" onClick={() => setShowCredits(true)} />
              <ActionButton icon="📜" text="View Full History" onClick={() => setShowHistory(true)} />
              <ActionButton icon="🎁" text="Refer a Friend" onClick={() => setActiveTab("referrals")} />
              <ActionButton icon="🔧" text="Support" onClick={() => setShowSupport(true)} />
              <ActionButton icon="⚙️" text="Settings" onClick={() => setActiveTab("settings")} />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-2">Invite & Earn 🤝</h3>
            <p className="text-slate-400 text-sm mb-4">Share your link and earn ₦500 for every friend who subscribes.</p>
            <div className="flex gap-2">
              <input readOnly value={`prosuite.ng/ref/${data.user.referralCode}`} className="flex-grow bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-500 focus:outline-none" />
              <button onClick={() => {
                navigator.clipboard.writeText(`prosuite.ng/ref/${data.user.referralCode}`);
              }} className="px-3 py-2 bg-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all">Copy</button>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-slate-500">Earned: <span className="text-slate-100 font-bold">₦{data.referrals.totalEarned}</span></div>
              <button onClick={() => setActiveTab("referrals")} className="text-xs text-indigo-400 font-bold hover:underline">Referral Hub →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
