import { useState, useRef, useEffect } from 'react'

const features = [
  {
    icon: '🏪',
    title: 'Agent Marketplace',
    subtitle: 'Buy & Sell AI Templates',
    description: 'A curated marketplace where developers publish, monetize, and distribute pre-trained AI agent templates. Companies deploy production-ready agents in minutes, not months.',
    stats: ['2,400+ Templates', '$2.1M GMV', '450+ Creators'],
    color: 'from-orange-500 to-amber-500',
    bgGlow: 'bg-orange-500/10',
  },
  {
    icon: '🧠',
    title: 'Knowledge Graph',
    subtitle: 'Explainable AI Decisions',
    description: 'Every AI decision is traceable through our Knowledge Graph. Audit trails, causal reasoning chains, and compliance-ready documentation for regulated industries.',
    stats: ['99.7% Traceability', 'SOC 2 Type II', 'Real-time Auditing'],
    color: 'from-indigo-500 to-violet-500',
    bgGlow: 'bg-indigo-500/10',
  },
  {
    icon: '🤝',
    title: 'Companion Agent',
    subtitle: 'Human-AI Collaboration',
    description: 'A real-time collaborative agent that adapts to your work style. It learns your preferences, anticipates your needs, and evolves alongside your team.',
    stats: ['2ms Response', 'Context-Aware', 'Personality Learning'],
    color: 'from-cyan-500 to-teal-500',
    bgGlow: 'bg-cyan-500/10',
  },
  {
    icon: '💳',
    title: 'Agentic Payments',
    subtitle: 'Autonomous Transactions',
    description: 'Agents autonomously negotiate, transact, and settle payments with other agents. Built-in escrow, fraud detection, and multi-currency support for global commerce.',
    stats: ['₦50M+ Processed', '< 3s Settlement', 'Bank-Grade Security'],
    color: 'from-emerald-500 to-green-500',
    bgGlow: 'bg-emerald-500/10',
  },
  {
    icon: '🔗',
    title: 'Multi-Agent Orchestration',
    subtitle: 'Complex Workflow Automation',
    description: 'Deploy teams of specialized agents that collaborate on complex tasks. From research to execution, agents hand off work seamlessly across your organization.',
    stats: ['15 Expert Agents', 'Parallel Execution', 'Auto-Failover'],
    color: 'from-rose-500 to-pink-500',
    bgGlow: 'bg-rose-500/10',
  },
  {
    icon: '💜',
    title: 'Emotional AI',
    subtitle: 'Memory, Personality & Retention',
    description: 'Agents with persistent memory, emotional intelligence, and personality traits. They remember past interactions, adapt tone, and build lasting relationships with users.',
    stats: ['95% Retention', 'Personality Engine', 'Sentiment Analysis'],
    color: 'from-violet-500 to-purple-500',
    bgGlow: 'bg-violet-500/10',
  },
]

function FeatureCard({ feature, index }: { feature: typeof features[0], index: number }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`group relative transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
      style={{ transitionDelay: `${index * 100}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`relative p-1 rounded-[2.5rem] transition-all duration-500 ${isHovered ? 'bg-gradient-to-br ' + feature.color + ' shadow-2xl scale-[1.02]' : 'bg-slate-200 hover:bg-slate-300'}`}>
        <div className="bg-white p-10 rounded-[2.4rem] h-full relative overflow-hidden">
          {/* Glow effect */}
          <div className={`absolute -top-20 -right-20 w-40 h-40 ${feature.bgGlow} rounded-full blur-[60px] transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

          {/* Icon */}
          <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-4xl mb-8 transition-all duration-500 ${isHovered ? 'scale-110 rotate-3' : ''} bg-gradient-to-br ${feature.color} bg-opacity-10`}>
            {feature.icon}
          </div>

          {/* Content */}
          <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-3 bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}>
            {feature.subtitle}
          </p>
          <h3 className="text-2xl font-black text-slate-950 mb-4 tracking-tighter group-hover:text-slate-900 transition-colors">
            {feature.title}
          </h3>
          <p className="text-slate-500 font-medium leading-relaxed mb-8 text-sm">
            {feature.description}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-2">
            {feature.stats.map((stat, i) => (
              <span key={i} className="px-3 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-600 uppercase tracking-wider">
                {stat}
              </span>
            ))}
          </div>

          {/* Hover arrow */}
          <div className={`absolute bottom-10 right-10 transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
            <div className="w-10 h-10 bg-slate-950 rounded-full flex items-center justify-center text-white text-sm">→</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function EnterpriseFeatures() {
  return (
    <section id="enterprise-features" className="py-32 bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 mb-8">
            Enterprise Capabilities
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-slate-950 mb-6 tracking-tighter">
            Built for the <span className="bg-gradient-to-r from-orange-500 to-indigo-600 bg-clip-text text-transparent">Future</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
            Six enterprise-grade modules that transform how organizations leverage AI.
            From marketplace to orchestration, we cover the full agentic lifecycle.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
