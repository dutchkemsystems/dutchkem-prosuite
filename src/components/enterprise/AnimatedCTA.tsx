import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Link } from '@tanstack/react-router'
import * as THREE from 'three'

function TorusKnot() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.3
      ref.current.rotation.y = state.clock.elapsedTime * 0.5
    }
  })
  return (
    <mesh ref={ref}>
      <torusKnotGeometry args={[1, 0.3, 128, 32, 2, 3]} />
      <meshStandardMaterial color="#ff6b35" wireframe transparent opacity={0.2} />
    </mesh>
  )
}

function FloatingParticles() {
  const ref = useRef<THREE.Points>(null!)
  const positions = useMemo(() => {
    const arr = new Float32Array(100 * 3)
    for (let i = 0; i < 300; i += 3) {
      arr[i] = (Math.random() - 0.5) * 10
      arr[i + 1] = (Math.random() - 0.5) * 10
      arr[i + 2] = (Math.random() - 0.5) * 10
    }
    return arr
  }, [])
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.1
    }
  })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#ff6b35" transparent opacity={0.4} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  )
}

export function AnimatedCTA() {
  return (
    <section className="relative py-48 bg-slate-950 overflow-hidden">
      {/* 3D Background */}
      <div className="absolute inset-0 -z-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={0.5} />
          <TorusKnot />
          <FloatingParticles />
        </Canvas>
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950" />
      <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 to-indigo-600/10" />

      <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-[11px] font-black uppercase tracking-[0.2em] text-orange-400 mb-12">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
          </span>
          Limited Early Access
        </div>

        <h2 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-8 leading-[0.9] tracking-tighter">
          Ready to Build the
          <br />
          <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-pink-500 bg-clip-text text-transparent">
            Future?
          </span>
        </h2>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-14 font-medium leading-relaxed">
          Join 10,000+ forward-thinking companies already using ProSuite NG+
          to deploy autonomous AI agents. Start your free trial today.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Link to="/auth" className="group relative px-14 py-7 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-lg rounded-full shadow-[0_0_60px_rgba(255,107,53,0.4)] hover:shadow-[0_0_80px_rgba(255,107,53,0.6)] hover:scale-105 active:scale-95 transition-all">
            <span className="relative z-10 flex items-center gap-3">
              Start Free Trial
              <span className="group-hover:translate-x-3 transition-transform text-xl">→</span>
            </span>
          </Link>
          <a href="#enterprise-features" className="px-14 py-7 bg-white/5 backdrop-blur-xl border border-white/10 text-white font-black text-lg rounded-full hover:bg-white/10 transition-all">
            Explore Platform
          </a>
        </div>

        <div className="flex flex-wrap justify-center gap-8 mt-14 pt-10 border-t border-white/5">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-emerald-400">✓</span>
            <span className="text-sm font-bold">14-day free trial</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-emerald-400">✓</span>
            <span className="text-sm font-bold">No credit card required</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-emerald-400">✓</span>
            <span className="text-sm font-bold">Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-emerald-400">✓</span>
            <span className="text-sm font-bold">Bank-grade security</span>
          </div>
        </div>
      </div>
    </section>
  )
}
