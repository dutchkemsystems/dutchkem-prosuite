import { useEffect, useState, useRef } from 'react'

const COLORS = ['#FF6B35', '#F7931E', '#6C3CE1', '#00D4FF']

function FloatingDot({ index }: { index: number }) {
  const color = COLORS[index % COLORS.length]
  const size = 2 + (index % 3) * 2
  const left = (index * 17.3) % 100
  const top = (index * 23.7) % 100
  const duration = 20 + (index % 5) * 5

  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: `${size}px`, height: `${size}px`,
        left: `${left}%`, top: `${top}%`,
        backgroundColor: color, opacity: 0.12,
        animation: `dotFloat ${duration}s ease-in-out infinite`,
      }}
    />
  )
}

export function AnimatedBackground({ variant = 'login' }: { variant?: 'login' | 'dashboard' }) {
  return (
    <>
      <style>{`
        @keyframes dotFloat {
          0%, 100% { transform: translateY(0); opacity: 0.1; }
          50% { transform: translateY(-20px); opacity: 0.2; }
        }
      `}</style>
      <div className="fixed inset-0 z-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1A1A2E 50%, #0F172A 100%)' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 30%, rgba(255,107,53,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(108,60,225,0.08) 0%, transparent 50%)' }} />
        {Array.from({ length: 12 }).map((_, i) => <FloatingDot key={i} index={i} />)}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(15,23,42,0.6) 100%)' }} />
      </div>
    </>
  )
}
