import type { MimoData } from '../useMimoData'

export function DatabaseTab({ mimo }: { mimo: MimoData }) {
  const { databaseStats, databaseIndexes, dbSubTab, setDbSubTab } = mimo

  return (
    <div className="space-y-6">
      {/* Sub-Tabs */}
      <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
        {[
          { id: 'tables' as const, label: 'Tables', icon: '📊' },
          { id: 'indexes' as const, label: 'Indexes', icon: '🔍' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setDbSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              dbSubTab === tab.id ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="text-2xl font-black text-white">{databaseStats?.totalTables ?? 0}</div>
          <div className="text-xs text-slate-400">Total Tables</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="text-2xl font-black text-white">{databaseStats?.totalRows?.toLocaleString() ?? 0}</div>
          <div className="text-xs text-slate-400">Total Rows</div>
        </div>
      </div>

      {/* Tables Tab */}
      {dbSubTab === 'tables' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-black text-white mb-4">Table Statistics</h3>
          <div className="space-y-2">
            {databaseStats?.tables?.map((table: any) => (
              <div key={table.name} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-lg">📋</span>
                  <span className="text-sm text-white font-medium font-mono">{table.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-400">{table.rowCount.toLocaleString()} rows</span>
                  {table.lastActivity > 0 && (
                    <span className="text-xs text-slate-500">{new Date(table.lastActivity).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indexes Tab */}
      {dbSubTab === 'indexes' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-black text-white mb-4">Database Indexes</h3>
          <div className="space-y-2">
            {databaseIndexes?.indexes?.map((idx: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔍</span>
                  <div>
                    <span className="text-sm text-white font-medium">{idx.table}.{idx.name}</span>
                    <div className="text-xs text-slate-400">{idx.fields.join(', ')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}