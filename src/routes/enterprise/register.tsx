import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'
import { CompanyLogo } from '~/components/CompanyLogo'

export const Route = createFileRoute('/enterprise/register')({
  component: EnterpriseRegister,
})

function EnterpriseRegister() {
  const navigate = useNavigate()
  const register = useMutation(api.enterprise_auth.register)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    industry: '',
    size: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name || !form.email || !form.password) {
      setError('Please fill in all required fields')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const result = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        industry: form.industry || undefined,
        size: form.size || undefined,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      localStorage.setItem('enterprise_token', result.token as string)
      navigate({ to: '/enterprise/dashboard' })
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,theme(colors.orange.900/15),transparent)] pointer-events-none" />
      <div className="absolute top-20 right-20 w-[30rem] h-[30rem] bg-orange-600/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-20 left-20 w-[25rem] h-[25rem] bg-indigo-600/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-lg w-full relative z-10">
        <div className="text-center mb-10 flex flex-col items-center">
          <CompanyLogo className="w-28 h-28 mb-6" />
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-orange-400 mb-4">
            Enterprise Portal
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Start Free Trial</h1>
          <p className="text-slate-400 font-medium">14 days free · No credit card required · Cancel anytime</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Organization Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Acme Corporation"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all font-medium"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Work Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="admin@company.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Industry</label>
                <select
                  value={form.industry}
                  onChange={(e) => update('industry', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium"
                >
                  <option value="" className="bg-slate-900">Select...</option>
                  <option value="technology" className="bg-slate-900">Technology</option>
                  <option value="finance" className="bg-slate-900">Finance & Banking</option>
                  <option value="healthcare" className="bg-slate-900">Healthcare</option>
                  <option value="education" className="bg-slate-900">Education</option>
                  <option value="government" className="bg-slate-900">Government / Public Sector</option>
                  <option value="military" className="bg-slate-900">Military / Defense</option>
                  <option value="manufacturing" className="bg-slate-900">Manufacturing</option>
                  <option value="retail" className="bg-slate-900">Retail & E-commerce</option>
                  <option value="legal" className="bg-slate-900">Legal Services</option>
                  <option value="other" className="bg-slate-900">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Company Size</label>
                <select
                  value={form.size}
                  onChange={(e) => update('size', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium"
                >
                  <option value="" className="bg-slate-900">Select...</option>
                  <option value="1-10" className="bg-slate-900">1-10 employees</option>
                  <option value="11-50" className="bg-slate-900">11-50 employees</option>
                  <option value="51-200" className="bg-slate-900">51-200 employees</option>
                  <option value="201-1000" className="bg-slate-900">201-1,000 employees</option>
                  <option value="1000+" className="bg-slate-900">1,000+ employees</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium"
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Confirm Password *</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                placeholder="Repeat password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-[0_0_30px_rgba(255,107,53,0.3)] hover:shadow-[0_0_40px_rgba(255,107,53,0.5)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Start Free Trial →'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-500 text-sm">
              Already have an account?{' '}
              <Link to="/enterprise/login" className="text-orange-400 font-bold hover:underline">
                Sign In
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
