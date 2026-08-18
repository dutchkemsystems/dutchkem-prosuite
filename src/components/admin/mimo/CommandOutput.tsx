interface CommandOutputProps {
  commandOutput: string | null
  onClear: () => void
  title?: string
  isDark?: boolean
}

export function CommandOutput({ commandOutput, onClear, title = 'Command Output', isDark = false }: CommandOutputProps) {
  if (!commandOutput) return null
  return (
    <div className={`${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-100 border-slate-200'} border rounded-2xl p-3 md:p-4`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-xs md:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{title}</h4>
        <button onClick={onClear} className="text-xs text-slate-500 hover:text-white">Clear</button>
      </div>
      <pre className="text-[10px] md:text-xs text-emerald-400 overflow-x-auto max-h-48 md:max-h-64 overflow-y-auto font-mono whitespace-pre-wrap">{commandOutput}</pre>
    </div>
  )
}