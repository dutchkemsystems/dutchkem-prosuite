import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { getDeviceFingerprint } from '~/lib/fingerprint'
import { CompanyLogo } from '~/components/CompanyLogo'

export const Route = createFileRoute('/admin/login')({
  component: AdminLoginPage,
})

function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [stage, setStage] = useState<'login' | '2fa'>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [rememberDevice, setRememberDevice] = useState(true)
  
  const login = useMutation(api.admin_auth.adminLogin)
  const verify2FA = useMutation(api.admin_auth.verifyAdmin2FA)
  const navigate = useNavigate()

  // Brute force protection: Track attempts in local state for UI cooldown
  const [lockoutTime, setLockoutTime] = useState(0)

  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime(prev => Math.max(0, prev - 1))
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [lockoutTime])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lockoutTime > 0) return
    setLoading(true)
    setError('')
    const deviceInfo = getDeviceFingerprint();
    try {
      const result = await login({ 
        email, 
        password, 
        deviceId: deviceInfo.fingerprint,
      })
      
      if (result.status === 'success') {
        localStorage.setItem('admin_session_token', result.token!)
        navigate({ to: '/admin/dashboard' })
      } else if (result.status === '2fa_required') {
        setStage('2fa')
      } else if (result.status === 'locked') {
        setError(result.message)
        setLockoutTime(1800) // 30 minutes
      } else {
        setError(result.message)
      }
    } catch (err: any) {
      setError(err?.message || "Login failed. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const deviceInfo = getDeviceFingerprint();
    try {
      const result = await verify2FA({ 
        email, 
        code, 
        deviceId: deviceInfo.fingerprint,
      })
      if (result.success) {
        localStorage.setItem('admin_session_token', result.token!)
        navigate({ to: '/admin/dashboard' })
      } else {
        setError(result.message || 'Invalid code')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 selection:bg-red-500/30">
      {/* Design requested in ASCII representation translated to UI */}
      <div className="w-full max-w-xl space-y-12 animate-in fade-in zoom-in-95 duration-700">
        
        <div className="text-center space-y-6">
           <div className="inline-block px-10 py-2 border-y-2 border-red-600/30">
              <h2 className="text-sm font-black uppercase tracking-[0.6em] text-slate-400">ADMIN LOGIN — Dutchkem Ventures</h2>
           </div>
           
           <div className="py-12 space-y-4 flex flex-col items-center">
              <CompanyLogo className="w-32 h-32" />
              <div>
                 <h1 className="text-4xl font-black tracking-tighter uppercase text-white">ADMIN PORTAL</h1>
                 <p className="text-red-500 font-black uppercase tracking-[0.4em] text-[10px]">Restricted Access Only</p>
              </div>
           </div>
        </div>

        <div className="bg-slate-900 border-2 border-slate-800 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
          
          {stage === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.3em] flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span> 📧 Email Address
                </label>
                 <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-5 text-white font-black text-lg focus:outline-none focus:border-red-600 transition-all placeholder:text-slate-800"
                  placeholder="admin@dutchkem.com"
                  autoFocus
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.3em] flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span> 🔑 Password
                </label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-5 text-white font-black text-lg focus:outline-none focus:border-red-600 transition-all placeholder:text-slate-800"
                  placeholder="••••••••••••••••"
                />
              </div>

              <div className="flex items-center gap-3">
                 <input 
                    type="checkbox" 
                    checked={rememberDevice} 
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="w-5 h-5 accent-red-600 rounded border-2 border-slate-800"
                 />
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Remember this device (7 days)</span>
              </div>

              {error && (
                <div className="p-6 bg-red-600/10 border-2 border-red-600/20 rounded-2xl text-red-500 text-xs font-black text-center uppercase tracking-widest leading-relaxed animate-shake">
                  ⚠️ {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading || lockoutTime > 0}
                className="w-full py-6 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-[2rem] font-black text-xl transition-all shadow-[0_20px_50px_rgba(220,38,38,0.25)] disabled:opacity-50 disabled:grayscale uppercase tracking-[0.3em]"
              >
                {loading ? 'AUTHENTICATING...' : lockoutTime > 0 ? `LOCKED (${Math.floor(lockoutTime/60)}m)` : '🔐 LOGIN'}
              </button>

              <div className="flex justify-between items-center pt-4 px-2">
                 <button type="button" className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Forgot password?</button>
                 <span className="w-px h-3 bg-slate-800"></span>
                 <button type="button" className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Need backup code?</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handle2FA} className="space-y-8">
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">2FA Verification</h3>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest leading-relaxed">Enter the 6-digit code from your <span className="text-red-500">authenticator app</span> or use a <span className="text-red-500">backup code</span>.</p>
              </div>
              <input 
                type="text" 
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-3xl px-6 py-8 text-center text-4xl font-black tracking-[0.4em] text-white focus:outline-none focus:border-red-600 transition-all placeholder:text-slate-900"
                placeholder="000000"
                autoFocus
              />
              {error && (
                <div className="p-6 bg-red-600/10 border-2 border-red-600/20 rounded-2xl text-red-500 text-xs font-black text-center uppercase tracking-widest animate-shake">
                   ⚠️ INVALID CODE
                </div>
              )}
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-6 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-[2rem] font-black text-xl transition-all shadow-[0_20px_50px_rgba(220,38,38,0.25)] disabled:opacity-50 uppercase tracking-[0.3em]"
              >
                {loading ? 'VERIFYING...' : 'VERIFY CODE'}
              </button>
              <button onClick={() => setStage('login')} className="w-full text-slate-600 font-black text-[10px] uppercase tracking-widest hover:text-slate-400 transition-colors">Back to Authorization</button>
            </form>
          )}
        </div>

        <div className="text-center space-y-6 opacity-60">
           <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em]">
             ⚠️ Unauthorized access attempts are logged and reported.
           </p>
           <div className="flex justify-center gap-8 text-[9px] font-black uppercase tracking-[0.3em] text-slate-700">
              <span>Secure Session</span>
              <span>•</span>
              <span>End-to-End Encrypted</span>
              <span>•</span>
              <span>Audit Log Active</span>
           </div>
        </div>
      </div>
    </div>
  )
}
