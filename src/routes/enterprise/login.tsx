import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'
import { CompanyLogo } from '~/components/CompanyLogo'

export const Route = createFileRoute('/enterprise/login')({
  component: EnterpriseLogin,
})

function EnterpriseLogin() {
  const navigate = useNavigate()
  const login = useMutation(api.enterprise_auth.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const result = await login({ email, password })

      if (result.error) {
        setError(result.error)
        return
      }

      localStorage.setItem('enterprise_token', result.token as string)
      navigate({ to: '/enterprise/dashboard' })
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,theme(colors.orange.900/15),transparent)] pointer-events-none" />
      <div className="absolute top-20 right-20 w-[30rem] h-[30rem] bg-orange-600/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-20 left-20 w-[25rem] h-[25rem] bg-indigo-600/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10 flex flex-col items-center">
          <CompanyLogo className="w-28 h-28 mb-6" />
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-orange-400 mb-4">
            Enterprise Portal
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Welcome Back</h1>
          <p className="text-slate-400 font-medium">Sign in to your enterprise dashboard</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all font-medium"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all font-medium"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-[0_0_30px_rgba(255,107,53,0.3)] hover:shadow-[0_0_40px_rgba(255,107,53,0.5)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : 'Sign In →'}
            </button>
          </form>

          <div className="mt-8 text-center space-y-3">
            <p className="text-slate-500 text-sm">
              Contact your administrator for access.
            </p>
            <p className="text-slate-600 text-xs">
              <Link to="/auth" className="hover:text-slate-400 transition-colors">
                ← Client Login (15 Agents)
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-slate-600 text-xs font-bold hover:text-slate-400 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
