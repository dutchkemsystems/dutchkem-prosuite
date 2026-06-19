import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/payment/callback')({
  component: PaymentCallback,
})

function PaymentCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const txRef = params.get('tx_ref')
    const statusParam = params.get('status')

    if (statusParam === 'successful' || statusParam === 'success') {
      setStatus('success')
      setMessage('Payment successful! Your subscription is now active.')
    } else if (statusParam === 'failed' || statusParam === 'cancelled') {
      setStatus('failed')
      setMessage('Payment was not completed. Please try again.')
    } else {
      setStatus('success')
      setMessage('Payment processing. You will receive a confirmation shortly.')
    }

    const timer = setTimeout(() => {
      navigate({ to: '/dashboard', search: { payment: 'success' } })
    }, 3000)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-xl font-black text-white mb-2">Processing Payment</h2>
            <p className="text-slate-400 text-sm">Please wait while we confirm your payment...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-4xl text-emerald-400 mx-auto mb-6 border border-emerald-500/20">
              ✓
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Payment Successful!</h2>
            <p className="text-slate-400 mb-6">{message}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Redirecting to dashboard in 3 seconds...</p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-4xl text-red-400 mx-auto mb-6 border border-red-500/20">
              ✕
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Payment Failed</h2>
            <p className="text-slate-400 mb-6">{message}</p>
            <button
              onClick={() => navigate({ to: '/dashboard' })}
              className="w-full py-3 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-700 transition-all"
            >
              Return to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}
