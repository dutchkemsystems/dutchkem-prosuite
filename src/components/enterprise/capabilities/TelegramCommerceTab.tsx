import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function TelegramCommerceTab({ token }: { token: string }) {
  const [tab, setTab] = useState<'overview' | 'products' | 'orders' | 'config'>('overview')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const products = useQuery(api.telegram_commerce.getProducts, {}) || []
  const showToast = (msg: string, isError = false) => {
    if (isError) setError(msg)
    else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 3000)
  }

  const totalProducts = products.length
  const inStock = products.filter((p: any) => p.stock > 0).length

  const botConfigured = !!process.env.TELEGRAM_BOT_TOKEN

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold">{error}</div>}
      {success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-bold">{success}</div>}

      {/* Status Banner */}
      <div className={`p-4 rounded-2xl border ${botConfigured ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <p className={`text-sm font-bold ${botConfigured ? 'text-emerald-400' : 'text-orange-400'}`}>
              Telegram Bot {botConfigured ? 'Connected' : 'Not Configured'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {botConfigured ? 'Bot is active and processing commands' : 'Set TELEGRAM_BOT_TOKEN env var to enable'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-2xl p-5 border border-blue-500/20">
          <p className="text-3xl font-black text-blue-400">{totalProducts}</p>
          <p className="text-xs text-slate-400 mt-1">Products Synced</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl p-5 border border-emerald-500/20">
          <p className="text-3xl font-black text-emerald-400">{inStock}</p>
          <p className="text-xs text-slate-400 mt-1">In Stock</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-2xl p-5 border border-orange-500/20">
          <p className="text-3xl font-black text-orange-400">7</p>
          <p className="text-xs text-slate-400 mt-1">Bot Commands</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['overview', 'products', 'orders', 'config'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === t ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black">Bot Commands</h3>
          <div className="grid gap-3">
            {[
              { cmd: '/start', desc: 'Welcome message and command list', icon: '👋' },
              { cmd: '/shop', desc: 'Browse product catalog with prices', icon: '🛒' },
              { cmd: '/add <id>', desc: 'Add a product to your cart', icon: '➕' },
              { cmd: '/cart', desc: 'View cart contents and total', icon: '🧺' },
              { cmd: '/pay', desc: 'Checkout and get payment link', icon: '💳' },
              { cmd: '/status', desc: 'Check order status and tracking', icon: '📦' },
              { cmd: '/help', desc: 'Show all available commands', icon: '❓' },
            ].map(c => (
              <div key={c.cmd} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
                <span className="text-2xl">{c.icon}</span>
                <div>
                  <p className="font-mono text-sm font-bold text-orange-400">{c.cmd}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Tab */}
      {tab === 'products' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black">Synced Products</h3>
          <p className="text-xs text-slate-400">Products from your E-commerce tab are automatically available in Telegram.</p>
          <div className="grid gap-3">
            {products.map((p: any) => (
              <div key={p._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex justify-between items-center">
                <div>
                  <p className="font-black text-sm">{p.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{p.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-orange-400">NGN {p.price.toLocaleString()}</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-bold ${p.stock > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                  </span>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-sm">No products synced. Create products in the E-commerce tab first.</div>
            )}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black">Telegram Orders</h3>
          <p className="text-xs text-slate-400">Orders placed through the Telegram bot appear here.</p>
          <div className="text-center py-10 text-slate-500 text-sm">
            <p className="text-4xl mb-3">🤖</p>
            <p>Orders will appear here once customers start buying via Telegram.</p>
          </div>
        </div>
      )}

      {/* Config Tab */}
      {tab === 'config' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black">Bot Configuration</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Environment Variable</label>
              <p className="text-sm font-bold text-white mt-1">TELEGRAM_BOT_TOKEN</p>
              <p className="text-xs text-slate-400 mt-0.5">Set this in your Convex dashboard under Settings → Environment Variables</p>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Webhook URL</label>
              <p className="text-sm font-mono text-orange-400 mt-1">https://warmhearted-aardvark-280.convex.site/api/webhook/telegram</p>
              <p className="text-xs text-slate-400 mt-0.5">Configure this in BotFather to receive updates</p>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</label>
              <div className={`mt-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${botConfigured ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                <span className={`w-2 h-2 rounded-full ${botConfigured ? 'bg-emerald-400' : 'bg-orange-400'}`} />
                {botConfigured ? 'Bot Token Configured' : 'Bot Token Missing'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
