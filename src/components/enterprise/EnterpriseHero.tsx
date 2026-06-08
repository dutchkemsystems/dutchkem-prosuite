import { useRef, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ParticleField } from './ParticleField'

function AnimatedCounter({ target, suffix = '' }: { target: number, suffix?: string }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const duration = 2000
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target])
  return <span>{count.toLocaleString()}{suffix}</span>
}

export function EnterpriseHero() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect()
        setMousePos({
          x: ((e.clientX - rect.left) / rect.width - 0.5) * 20,
          y: ((e.clientY - rect.top) / rect.height - 0.5) * 20,
        })
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center overflow-hidden bg-slate-950">
      <ParticleField />

      {/* Gradient orbs */}
      <div className="absolute top-20 left-20 w-[30rem] h-[30rem] bg-orange-600/10 rounded-full blur-[150px] animate-pulse" />
      <div className="absolute bottom-20 right-20 w-[25rem] h-[25rem] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '-2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20rem] h-[20rem] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '-4s' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-32 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <div className="space-y-10">
            <div
              className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-[11px] font-black uppercase tracking-[0.2em] text-orange-400 animate-in fade-in slide-in-from-left-8 duration-700"
              style={{ transform: `translate(${mousePos.x * 0.1}px, ${mousePos.y * 0.1}px)` }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
              </span>
              ENTERPRISE AI PLATFORM
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter animate-in fade-in slide-in-from-left-12 duration-1000">
              The Future of
              <br />
              <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-pink-500 bg-clip-text text-transparent">
                Agentic AI
              </span>
              <br />
              Starts Here.
            </h1>

            <p className="text-lg md:text-xl text-slate-400 max-w-xl leading-relaxed font-medium animate-in fade-in slide-in-from-left-12 duration-1000 delay-200">
              Deploy autonomous AI agents that think, collaborate, and transact on your behalf.
              Enterprise-grade orchestration with consumer-grade simplicity.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-left-12 duration-1000 delay-300">
              <Link to="/enterprise/login" className="group relative px-10 py-5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_40px_rgba(255,107,53,0.3)] hover:shadow-[0_0_60px_rgba(255,107,53,0.5)] hover:scale-105 active:scale-95 transition-all overflow-hidden">
                <span className="relative z-10 flex items-center gap-3">
                  Enterprise Login
                  <span className="group-hover:translate-x-2 transition-transform">→</span>
                </span>
              </Link>
              <a href="#enterprise-features" className="px-10 py-5 bg-white/5 backdrop-blur-xl border border-white/10 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all text-center">
                Explore Platform
              </a>
            </div>

            {/* Trust metrics */}
            <div className="flex flex-wrap gap-8 pt-8 border-t border-white/5 animate-in fade-in duration-1000 delay-500">
              <div>
                <p className="text-3xl font-black text-white"><AnimatedCounter target={10000} suffix="+" /></p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Active Users</p>
              </div>
              <div>
                <p className="text-3xl font-black text-white"><AnimatedCounter target={99} suffix=".9%" /></p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Uptime SLA</p>
              </div>
              <div>
                <p className="text-3xl font-black text-white"><AnimatedCounter target={15} /></p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Expert Agents</p>
              </div>
              <div>
                <p className="text-3xl font-black text-white"><AnimatedCounter target={50} suffix="M+" /></p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Tasks Completed</p>
              </div>
            </div>
          </div>

          {/* Right: 3D Visual */}
          <div className="relative hidden lg:flex items-center justify-center" style={{ transform: `translate(${mousePos.x * 0.2}px, ${mousePos.y * 0.2}px)` }}>
            <div className="relative w-[500px] h-[500px]">
              {/* Glowing ring */}
              <div className="absolute inset-0 rounded-full border-2 border-orange-500/20 animate-spin" style={{ animationDuration: '20s' }} />
              <div className="absolute inset-4 rounded-full border border-indigo-500/10 animate-spin" style={{ animationDuration: '30s', animationDirection: 'reverse' }} />
              <div className="absolute inset-8 rounded-full border border-cyan-500/10 animate-spin" style={{ animationDuration: '25s' }} />

              {/* Center content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 bg-gradient-to-br from-orange-500/20 to-indigo-500/20 rounded-[3rem] border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center space-y-4 hover:scale-105 transition-transform duration-500 shadow-[0_0_80px_rgba(255,107,53,0.15)]">
                  <div className="text-6xl">🤖</div>
                  <p className="text-white font-black text-sm uppercase tracking-widest">ProSuite NG+</p>
                  <p className="text-slate-400 text-xs font-bold">Enterprise AI</p>
                </div>
              </div>

              {/* Orbiting elements */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4">
                <div className="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl text-white text-xs font-bold animate-bounce">🧠 Knowledge Graph</div>
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4">
                <div className="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl text-white text-xs font-bold animate-bounce" style={{ animationDelay: '-0.5s' }}>💳 Agentic Payments</div>
              </div>
              <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-4">
                <div className="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl text-white text-xs font-bold animate-bounce" style={{ animationDelay: '-1s' }}>🔗 Multi-Agent</div>
              </div>
              <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-4">
                <div className="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl text-white text-xs font-bold animate-bounce" style={{ animationDelay: '-1.5s' }}>💜 Emotional AI</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
