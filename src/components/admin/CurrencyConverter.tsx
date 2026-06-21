import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export default function CurrencyConverter() {
  const [amount, setAmount] = useState<number>(100000)
  const [fromCurrency, setFromCurrency] = useState('NGN')
  const [toCurrency, setToCurrency] = useState('USD')

  const currencies = useQuery(api.payment_improvements.getSupportedCurrencies, {})
  const conversion = useQuery(
    api.payment_improvements.convertCurrency,
    amount > 0 ? { amount, from: fromCurrency, to: toCurrency } : 'skip'
  )

  const handleSwap = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">💱 Currency Converter</h2>
          <p className="text-gray-400 text-sm">Live exchange rates for supported currencies</p>
        </div>
        <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
          <span className="text-green-400 font-bold text-sm">✓ Live Rates</span>
        </div>
      </div>

      {/* Exchange Rates Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(currencies ?? []).map((curr: any) => (
          <div key={curr.code} className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{curr.symbol}</span>
              <span className="text-xs text-slate-400">{curr.code}</span>
            </div>
            <div className="text-xl font-bold text-white">{curr.symbol}1</div>
            <div className="text-xs text-slate-400">= ₦{curr.rate.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Converter */}
      <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Quick Convert</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs text-slate-400 mb-2 block">From</label>
            <div className="flex gap-2">
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
              >
                {(currencies ?? []).map((c: any) => (
                  <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                ))}
              </select>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
              />
            </div>
          </div>
          
          <button
            onClick={handleSwap}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"
          >
            ⇄
          </button>
          
          <div className="flex-1">
            <label className="text-xs text-slate-400 mb-2 block">To</label>
            <div className="flex gap-2">
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
              >
                {(currencies ?? []).map((c: any) => (
                  <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                ))}
              </select>
              <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold">
                {conversion?.convertedAmount?.toLocaleString() ?? '0'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
