import { useState, useEffect } from 'react'

const guidanceExamples = [
  { agent: 'Companion AI', message: 'The customer seems frustrated. Consider offering a 10% discount to retain them.', type: 'suggestion', time: 'Just now' },
  { agent: 'Companion AI', message: 'This ticket matches Pattern #47 (billing dispute). Recommended response template loaded.', type: 'template', time: '2 min ago' },
  { agent: 'Companion AI', message: 'Compliance check: This response needs legal review before sending.', type: 'compliance', time: '5 min ago' },
]

export function CompanionAgentTab({ token }: { token: string }) {
  const [activeSession, setActiveSession] = useState(false)
  const [guidance, setGuidance] = useState(guidanceExamples)
  const [metrics, setMetrics] = useState({ handleTime: '7.2 min', resolution: '87%', satisfaction: '4.6/5' })

  useEffect(() => {
    if (!activeSession) return
    const timer = setInterval(() => {
      const newGuidance = [
        { agent: 'Companion AI', message: 'Customer mentioned "competitor" — consider highlighting our unique features.', type: 'suggestion', time: 'Just now' },
        { agent: 'Companion AI', message: 'This is a high-value account. Escalate to senior support if needed.', type: 'alert', time: 'Just now' },
        { agent: 'Companion AI', message: 'Suggested upsell: Enterprise plan based on usage patterns.', type: 'upsell', time: 'Just now' },
      ]
      setGuidance(prev => [newGuidance[Math.floor(Math.random() * newGuidance.length)], ...prev.slice(0, 9)])
    }, 5000)
    return () => clearInterval(timer)
  }, [activeSession])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Companion Agent</h2>
          <p className="text-sm text-slate-400 mt-1">Real-time guidance for human teams</p>
        </div>
        <button
          onClick={() => setActiveSession(!activeSession)}
          className={`px-6 py-3 font-black text-sm rounded-xl transition-all ${
            activeSession
              ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {activeSession ? '⏹ End Session' : '▶ Start Session'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
          <p className="text-3xl font-black text-emerald-400">{metrics.handleTime}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Avg Handle Time</p>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
          <p className="text-3xl font-black text-blue-400">{metrics.resolution}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">First-Call Resolution</p>
        </div>
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center">
          <p className="text-3xl font-black text-orange-400">{metrics.satisfaction}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Customer Satisfaction</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">
          {activeSession ? '🔴 Live Guidance Feed' : 'Guidance History'}
        </h3>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {guidance.map((g, i) => (
            <div key={i} className={`flex items-start gap-3 p-4 rounded-xl ${
              i === 0 && activeSession ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5'
            }`}>
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-sm flex-shrink-0">🤝</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-300">{g.message}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                    g.type === 'suggestion' ? 'bg-blue-500/10 text-blue-400' :
                    g.type === 'compliance' ? 'bg-red-500/10 text-red-400' :
                    g.type === 'template' ? 'bg-violet-500/10 text-violet-400' :
                    'bg-amber-500/10 text-amber-400'
                  }`}>{g.type}</span>
                  <span className="text-[10px] text-slate-600">{g.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
