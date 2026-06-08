import { useEffect, useRef } from 'react'

const logos = [
  { name: 'Paystack', color: '#00b67e' },
  { name: 'KoraPay', color: '#6366f1' },
  { name: 'Flutterwave', color: '#f5a623' },
  { name: 'OPay', color: '#00b67e' },
  { name: 'Stripe', color: '#635bff' },
  { name: 'NVIDIA NIM', color: '#76b900' },
  { name: 'Meta Llama', color: '#0668E1' },
  { name: 'OpenRouter', color: '#8b5cf6' },
]

export function TrustedLogos() {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let animId: number
    let pos = 0
    const speed = 0.5
    const animate = () => {
      pos += speed
      if (pos >= el.scrollWidth / 2) pos = 0
      el.scrollLeft = pos
      animId = requestAnimationFrame(animate)
    }
    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  }, [])

  const doubledLogos = [...logos, ...logos]

  return (
    <section className="py-20 bg-white border-y border-slate-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 text-center mb-12">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
          Powered by Industry Leaders
        </p>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-16 items-center overflow-hidden whitespace-nowrap"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {doubledLogos.map((logo, i) => (
          <div
            key={i}
            className="flex-shrink-0 flex items-center gap-3 px-8 py-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300 group"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm"
              style={{ backgroundColor: logo.color }}
            >
              {logo.name[0]}
            </div>
            <span className="text-lg font-black text-slate-700 tracking-tight group-hover:text-slate-950 transition-colors">
              {logo.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
