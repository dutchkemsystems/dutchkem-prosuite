import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const AGENT_NAMES: Record<string, string> = {
  A1: 'Academic Pro', A2: 'Business Pro', A3: 'Content Pro',
  A4: 'Career Pro', A5: 'Personal Shopper', A6: 'Exam Pro',
  A7: 'Finance Pro', A8: 'MediaStudio Pro', A9: 'Health Pro',
  A10: 'Home Services Pro', A11: 'Language Tutor', A12: 'Travel Planner',
  A13: 'ServiceMart NG', A14: 'Translation Hub', A15: 'Event Planner',
}

const AGENT_ICONS: Record<string, string> = {
  A1: '🎓', A2: '💼', A3: '✍️', A4: '📄', A5: '🛍️',
  A6: '📝', A7: '💰', A8: '🎬', A9: '🏥', A10: '🧹',
  A11: '🗣️', A12: '✈️', A13: '🚀', A14: '📝', A15: '🎉',
}

export function MyTasks({ userId }: { userId: string }) {
  const tasks = useQuery(api.agent_packages.getClientTasks, { userId })

  if (!tasks) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-sm text-slate-400">No tasks yet</p>
        <p className="text-xs text-slate-500 mt-1">Chat with an agent and purchase a package to get started</p>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400',
    generating: 'bg-blue-500/10 text-blue-400',
    delivered: 'bg-emerald-500/10 text-emerald-400',
    failed: 'bg-red-500/10 text-red-400',
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-sm">My Tasks</h3>
        <span className="text-xs text-slate-500">{tasks.length} total</span>
      </div>

      {tasks.map((task: any) => (
        <div key={task._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{AGENT_ICONS[task.agentId] || '📋'}</span>
              <div>
                <p className="text-sm font-bold text-white">{task.packageName}</p>
                <p className="text-[10px] text-slate-500">
                  {AGENT_NAMES[task.agentId] || task.agentId}
                </p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[task.status] || ''}`}>
              {task.status}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span>Purchased: {new Date(task.createdAt).toLocaleDateString()}</span>
            <span>Amount: {(task.amount / 100).toLocaleString()} NGN</span>
          </div>

          {task.status === 'delivered' && task.content && (
            <div className="mt-3 bg-slate-800 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Deliverable</p>
              <div className="text-xs text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
                {task.content}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(task.content)
                }}
                className="mt-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-white rounded-lg"
              >
                Copy to Clipboard
              </button>
            </div>
          )}

          {task.status === 'pending' && (
            <div className="mt-2 text-[10px] text-yellow-400">
              Waiting for payment confirmation...
            </div>
          )}

          {task.status === 'generating' && (
            <div className="mt-2 text-[10px] text-blue-400">
              Generating your deliverable...
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
