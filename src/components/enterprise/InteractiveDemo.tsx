import { useState, useEffect, useCallback } from 'react'

const demos = [
  {
    title: 'Multi-Agent Workflow',
    description: 'Watch 5 agents collaborate on a business plan — research, analysis, writing, design, and review — all orchestrated automatically.',
    steps: [
      { agent: 'Research Agent', action: 'Gathering market data...', status: 'complete' as const },
      { agent: 'Analysis Agent', action: 'Running financial projections...', status: 'complete' as const },
      { agent: 'Writing Agent', action: 'Drafting 50-page business plan...', status: 'active' as const },
      { agent: 'Design Agent', action: 'Creating pitch deck visuals...', status: 'pending' as const },
      { agent: 'Review Agent', action: 'Quality assurance & compliance...', status: 'pending' as const },
    ],
  },
  {
    title: 'Agentic Payment Flow',
    description: 'Agents autonomously negotiate pricing, verify funds via Guardian AI, and settle transactions in under 3 seconds.',
    steps: [
      { agent: 'Buyer Agent', action: 'Negotiating price with seller...', status: 'complete' as const },
      { agent: 'Guardian AI', action: 'Verifying payment authenticity...', status: 'complete' as const },
      { agent: 'Escrow Agent', action: 'Funds locked in secure escrow...', status: 'active' as const },
      { agent: 'Settlement Agent', action: 'Processing instant settlement...', status: 'pending' as const },
      { agent: 'Notification Agent', action: 'Sending receipt & confirmation...', status: 'pending' as const },
    ],
  },
  {
    title: 'Knowledge Graph Trace',
    description: 'Every AI recommendation is fully explainable — trace the reasoning chain from data source to final output.',
    steps: [
      { agent: 'Data Ingestion', action: 'Collecting from 12 sources...', status: 'complete' as const },
      { agent: 'Entity Extraction', action: 'Identifying 847 entities...', status: 'complete' as const },
      { agent: 'Graph Construction', action: 'Building relationship map...', status: 'complete' as const },
      { agent: 'Reasoning Engine', action: 'Applying inference rules...', status: 'active' as const },
      { agent: 'Explanation Layer', action: 'Generating human-readable trace...', status: 'pending' as const },
    ],
  },
]

function StatusDot({ status }: { status: 'complete' | 'active' | 'pending' }) {
  if (status === 'complete') return <div className="w-3 h-3 bg-emerald-500 rounded-full flex-shrink-0" />
  if (status === 'active') return (
    <div className="w-3 h-3 bg-orange-500 rounded-full flex-shrink-0 relative">
      <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-75" />
    </div>
  )
  return <div className="w-3 h-3 bg-slate-300 rounded-full flex-shrink-0" />
}

export function InteractiveDemo() {
  const [activeDemo, setActiveDemo] = useState(0)
  const [activeStep, setActiveStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  const advanceStep = useCallback(() => {
    setActiveStep(prev => {
      if (prev >= demos[activeDemo].steps.length - 1) {
        setTimeout(() => {
          setActiveDemo(d => (d + 1) % demos.length)
          setActiveStep(0)
        }, 2000)
        return prev
      }
      return prev + 1
    })
  }, [activeDemo])

  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(advanceStep, 1500)
    return () => clearInterval(timer)
  }, [isPlaying, advanceStep])

  useEffect(() => {
    setActiveStep(0)
  }, [activeDemo])

  const demo = demos[activeDemo]

  return (
    <section className="py-32 bg-slate-950 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-orange-400 mb-8">
            Interactive Demo
          </div>
          <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter">
            See It <span className="text-gradient-primary">In Action</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto font-medium">
            Watch our AI agents collaborate in real-time. Select a demo to see enterprise workflows come alive.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-12 items-start">
          {/* Demo selector */}
          <div className="lg:col-span-2 space-y-4">
            {demos.map((d, i) => (
              <button
                key={i}
                onClick={() => { setActiveDemo(i); setActiveStep(0); }}
                className={`w-full text-left p-6 rounded-2xl border transition-all duration-300 ${
                  i === activeDemo
                    ? 'bg-white/10 border-orange-500/50 shadow-[0_0_30px_rgba(255,107,53,0.1)]'
                    : 'bg-white/5 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                    i === activeDemo ? 'bg-orange-500 text-white' : 'bg-white/10 text-slate-400'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-black text-lg tracking-tight">{d.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">{d.description.slice(0, 60)}...</p>
                  </div>
                </div>
              </button>
            ))}

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'} Simulation
            </button>
          </div>

          {/* Active demo */}
          <div className="lg:col-span-3">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-10 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black tracking-tight">{demo.title}</h3>
                  <p className="text-slate-400 text-sm mt-1">{demo.description}</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live</span>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                {demo.steps.map((step, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${
                      i <= activeStep
                        ? i === activeStep
                          ? 'bg-orange-500/10 border border-orange-500/20'
                          : 'bg-white/5 border border-white/5'
                        : 'opacity-30'
                    }`}
                  >
                    <StatusDot status={i < activeStep ? 'complete' : i === activeStep ? 'active' : 'pending'} />
                    <div className="flex-grow">
                      <p className="font-black text-sm uppercase tracking-wider">{step.agent}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{step.action}</p>
                    </div>
                    {i < activeStep && <span className="text-emerald-400 text-xs font-bold">✓ Done</span>}
                    {i === activeStep && <span className="text-orange-400 text-xs font-bold animate-pulse">Running...</span>}
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500"
                  style={{ width: `${((activeStep + 1) / demo.steps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
