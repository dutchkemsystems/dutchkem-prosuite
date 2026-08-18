import type { MimoData } from '../useMimoData'
import { CronOverview } from './cron/CronOverview'
import { CronJobsList } from './cron/CronJobsList'
import { CronHistory } from './cron/CronHistory'
import { CronCategories } from './cron/CronCategories'

export function CronJobsTab({ mimo }: { mimo: MimoData }) {
  const { cronSubTab, setCronSubTab, commandOutput, setCommandOutput } = mimo

  return (
    <div className="space-y-6">
      {/* Cron Sub-Tabs */}
      <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
        {[
          { id: 'overview' as const, label: 'Overview', icon: '📊' },
          { id: 'jobs' as const, label: 'All Jobs', icon: '⏰' },
          { id: 'history' as const, label: 'Execution History', icon: '📜' },
          { id: 'categories' as const, label: 'By Category', icon: '📁' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCronSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              cronSubTab === tab.id
                ? 'bg-orange-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {cronSubTab === 'overview' && <CronOverview mimo={mimo} />}
      {cronSubTab === 'jobs' && <CronJobsList mimo={mimo} />}
      {cronSubTab === 'history' && <CronHistory mimo={mimo} />}
      {cronSubTab === 'categories' && <CronCategories mimo={mimo} />}

      {/* Command Output */}
      {commandOutput && (
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-slate-300">Result</h4>
            <button onClick={() => setCommandOutput(null)} className="text-xs text-slate-500 hover:text-white">Clear</button>
          </div>
          <pre className="text-xs text-emerald-400 overflow-x-auto max-h-64 overflow-y-auto font-mono whitespace-pre-wrap">{commandOutput}</pre>
        </div>
      )}
    </div>
  )
}