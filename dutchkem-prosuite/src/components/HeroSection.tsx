import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Star, Users, ShieldCheck, Sparkles, Zap, TrendingUp, Clock } from 'lucide-react';
import { swStates } from '../data/agents';

interface HeroProps {
  setCurrentPage: (page: string) => void;
}

function CountUp({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 2500;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end]);
  return <>{count}{suffix}</>;
}

// Floating particle component
function FloatingParticle({ delay, x, size, color }: { delay: number; x: number; size: number; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{ width: size, height: size, left: `${x}%`, bottom: '-5%', background: color }}
      animate={{ y: [0, -800], opacity: [0, 0.6, 0], x: [0, Math.random() * 100 - 50] }}
      transition={{ duration: 8 + Math.random() * 6, repeat: Infinity, delay, ease: 'linear' }}
    />
  );
}

export default function HeroSection({ setCurrentPage }: HeroProps) {
  const [activeWord, setActiveWord] = useState(0);
  const rotatingWords = ['Thesis', 'CV', 'Business Plan', 'JAMB Prep', 'Film Script', 'Phone Recovery', 'IELTS Score', 'Pitch Deck'];

  useEffect(() => {
    const interval = setInterval(() => setActiveWord(prev => (prev + 1) % rotatingWords.length), 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-navy via-navy-dark to-navy">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.2, 1] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(232,83,58,0.15) 0%, transparent 70%)' }} />
        <motion.div animate={{ x: [0, -40, 0], y: [0, 30, 0], scale: [1, 1.3, 1] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute top-1/4 -right-1/4 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)' }} />
        <motion.div animate={{ x: [0, 20, 0], y: [0, -40, 0], scale: [1.1, 1, 1.1] }} transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
          className="absolute -bottom-1/4 left-1/3 w-[700px] h-[700px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(26,122,74,0.1) 0%, transparent 70%)' }} />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <FloatingParticle key={i} delay={i * 0.8} x={Math.random() * 100} size={3 + Math.random() * 4}
            color={['rgba(232,83,58,0.4)', 'rgba(245,166,35,0.4)', 'rgba(26,122,74,0.4)', 'rgba(10,95,168,0.3)'][i % 4]} />
        ))}
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 lg:pt-36 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            {/* Logo + Live Badge */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="flex items-center gap-3 mb-6 justify-center lg:justify-start">
              <motion.img src="/images/dutchkem-logo.png" alt="Dutchkem Ventures"
                animate={{ rotate: [0, 2, -2, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-2xl rounded-lg" />
              <motion.div animate={{ boxShadow: ['0 0 0 0 rgba(26,122,74,0.4)', '0 0 0 8px rgba(26,122,74,0)', '0 0 0 0 rgba(26,122,74,0)'] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/10">
                <span className="w-2 h-2 rounded-full bg-forest animate-pulse" />
                <span className="text-white/80 text-sm font-medium">🔥 13 AI Agents Live — 24/7</span>
              </motion.div>
            </motion.div>

            {/* Main Headline */}
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight">
              Stop Struggling.{' '}
              <span className="bg-gradient-to-r from-coral via-gold to-coral bg-[length:200%_auto] bg-clip-text text-transparent animate-[shimmer_3s_ease-in-out_infinite]">
                Start Winning.
              </span>
            </motion.h1>

            {/* Rotating Words */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
              className="mt-4 h-10 overflow-hidden">
              <p className="text-xl sm:text-2xl text-white/90 font-display font-semibold">
                Your next{' '}
                <span className="relative inline-block w-48 text-left">
                  {rotatingWords.map((word, i) => (
                    <motion.span key={word}
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: activeWord === i ? 0 : -30, opacity: activeWord === i ? 1 : 0 }}
                      transition={{ duration: 0.4 }}
                      className="absolute left-0 bg-gradient-to-r from-gold to-coral bg-clip-text text-transparent font-bold">
                      {word}
                    </motion.span>
                  ))}
                </span>
                {' '}is one chat away.
              </p>
            </motion.div>

            {/* Subheadline */}
            <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="mt-4 text-lg text-white/50 max-w-xl mx-auto lg:mx-0">
              13 AI specialists that write your essays, build your CV, prep you for JAMB,
              produce your films, recover your stolen phone, and grow your business — while you sleep.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <motion.button whileHover={{ scale: 1.03, boxShadow: '0 20px 40px rgba(232,83,58,0.3)' }} whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentPage('chat')}
                className="group px-8 py-4 bg-gradient-to-r from-coral to-coral-dark text-white font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-lg relative overflow-hidden">
                <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '100%'] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }} />
                <span className="relative z-10 flex items-center gap-2">
                  <Sparkles size={18} /> Get Started — It's Instant
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentPage('pricing')}
                className="group px-8 py-4 bg-white/5 backdrop-blur-sm text-white font-semibold rounded-2xl hover:bg-white/10 flex items-center justify-center gap-2 border border-white/10 cursor-pointer">
                <Play size={18} className="text-gold" /> Prices From ₦2,000
              </motion.button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="mt-10 flex flex-wrap gap-5 justify-center lg:justify-start">
              {[
                { icon: <Users size={14} />, text: '10,000+ Clients' },
                { icon: <Star size={14} />, text: '4.9★ Reviews' },
                { icon: <ShieldCheck size={14} />, text: 'Bank-Grade Security' },
              ].map((badge, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex items-center gap-2 text-white/50">
                  <span className="text-gold">{badge.icon}</span>
                  <span className="text-xs font-medium">{badge.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right — Animated Feature Showcase */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.6 }}
            className="relative hidden lg:block">
            <div className="relative w-full aspect-square max-w-lg mx-auto">
              {/* Glow ring */}
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-8 rounded-full border border-coral/10" />
              <motion.div animate={{ rotate: -360 }} transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-16 rounded-full border border-gold/10" />

              {/* Map with live dots */}
              <svg viewBox="0 0 100 100" className="w-full h-full relative z-10">
                <path d="M15 20 L30 15 L50 12 L70 15 L85 25 L88 40 L85 55 L80 65 L70 75 L55 80 L40 78 L25 70 L18 55 L15 40 Z" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" />
                {swStates.map((state, i) => (
                  <g key={state.name}>
                    <circle cx={state.x} cy={state.y} r="4" fill="none" stroke="rgba(245,166,35,0.5)" strokeWidth="0.4" className="map-dot-pulse" style={{ animationDelay: `${i * 0.5}s` }} />
                    <circle cx={state.x} cy={state.y} r="1.2" fill="#F5A623" />
                    <text x={state.x} y={state.y - 4} fill="rgba(255,255,255,0.5)" fontSize="2.2" textAnchor="middle" fontFamily="DM Sans">{state.name}</text>
                  </g>
                ))}
              </svg>

              {/* Floating service cards */}
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-4 right-0 bg-white/10 backdrop-blur-xl rounded-xl p-3 border border-white/10 shadow-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-coral/20 flex items-center justify-center"><Zap size={14} className="text-coral-light" /></div>
                  <div><p className="text-white text-[10px] font-medium">Agents Online</p><p className="text-gold font-bold text-sm font-mono">13/13</p></div>
                </div>
              </motion.div>

              <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
                className="absolute bottom-20 -left-2 bg-white/10 backdrop-blur-xl rounded-xl p-3 border border-white/10 shadow-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-forest/20 flex items-center justify-center"><TrendingUp size={14} className="text-forest-light" /></div>
                  <div><p className="text-white text-[10px] font-medium">Projects Today</p><p className="text-forest-light font-bold text-sm font-mono">847</p></div>
                </div>
              </motion.div>

              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                className="absolute bottom-2 right-4 bg-white/10 backdrop-blur-xl rounded-xl p-3 border border-white/10 shadow-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center"><Clock size={14} className="text-gold" /></div>
                  <div><p className="text-white text-[10px] font-medium">Avg Delivery</p><p className="text-gold font-bold text-sm font-mono">30 min</p></div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Stats Bar */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'AI Agents Ready Now', value: 13, suffix: '', icon: '🤖' },
            { label: 'Projects Delivered', value: 50, suffix: 'K+', icon: '✅' },
            { label: 'Naira Saved', value: 2, suffix: 'B+', icon: '💰' },
            { label: 'Min Avg Delivery', value: 30, suffix: '', icon: '⚡' },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.1 }}
              whileHover={{ scale: 1.05, borderColor: 'rgba(245,166,35,0.3)' }}
              className="bg-white/[0.03] backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-white/[0.06] text-center cursor-default transition-colors">
              <span className="text-2xl">{stat.icon}</span>
              <p className="text-2xl lg:text-3xl font-bold text-white mt-2 font-mono">
                <CountUp end={stat.value} suffix={stat.suffix} />
              </p>
              <p className="text-white/40 text-xs mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Wave Divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H0Z" fill="#FDF8F3" />
        </svg>
      </div>
    </section>
  );
}
