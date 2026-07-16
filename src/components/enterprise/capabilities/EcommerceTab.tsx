import { useState } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function EcommerceTab({ token }: { token: string }) {
  const [tab, setTab] = useState<'products' | 'orders' | 'storefront'>('products')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', category: '', productType: 'digital', stock: '99' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [storeName, setStoreName] = useState('')
  const [storefrontHtml, setStorefrontHtml] = useState('')

  const products = useQuery(api.ecommerce.getProducts, {}) || []
  const orders = useQuery(api.order_management.getOrders, {}) || []
  const createProduct = useMutation(api.ecommerce.createProduct)
  const generateStorefront = useAction(api.ecommerce.generateStorefront)

  const showToast = (msg: string, isError = false) => {
    if (isError) setError(msg)
    else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 3000)
  }

  const handleCreateProduct = async () => {
    if (!form.name || !form.price || !form.category) {
      showToast('Name, price, and category are required', true)
      return
    }
    setLoading(true)
    try {
      const result = await createProduct({
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        category: form.category,
        productType: form.productType,
        stock: parseInt(form.stock) || 99,
        adminToken: token,
      })
      if (result.success) {
        showToast('Product created successfully')
        setForm({ name: '', description: '', price: '', category: '', productType: 'digital', stock: '99' })
        setShowCreate(false)
      } else {
        showToast(result.error || 'Failed to create product', true)
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to create product', true)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateStorefront = async () => {
    if (!storeName) { showToast('Store name is required', true); return }
    setLoading(true)
    try {
      const result = await generateStorefront({
        storeName,
        products: products.map((p: any) => ({ name: p.name, price: p.price, description: p.description, imageUrl: p.imageUrl })),
        adminToken: token,
      })
      if (result.success) {
        setStorefrontHtml(result.html)
        showToast('Storefront generated!')
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to generate storefront', true)
    } finally {
      setLoading(false)
    }
  }

  const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
  const totalProducts = products.length
  const totalOrders = orders.length

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold">{error}</div>}
      {success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-bold">{success}</div>}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-2xl p-5 border border-orange-500/20">
          <p className="text-3xl font-black text-orange-400">{totalProducts}</p>
          <p className="text-xs text-slate-400 mt-1">Products</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-2xl p-5 border border-blue-500/20">
          <p className="text-3xl font-black text-blue-400">{totalOrders}</p>
          <p className="text-xs text-slate-400 mt-1">Orders</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl p-5 border border-emerald-500/20">
          <p className="text-3xl font-black text-emerald-400">NGN {totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Revenue</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['products', 'orders', 'storefront'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === t ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Products Tab */}
      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black">Product Catalog</h3>
            <button onClick={() => setShowCreate(!showCreate)}
              className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-all">
              {showCreate ? 'Cancel' : '+ Add Product'}
            </button>
          </div>

          {showCreate && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Product name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" />
                <input placeholder="Price (NGN)" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" />
                <input placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" />
                <select value={form.productType} onChange={e => setForm({ ...form, productType: e.target.value })}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm">
                  <option value="digital">Digital</option>
                  <option value="physical">Physical</option>
                  <option value="subscription">Subscription</option>
                </select>
              </div>
              <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm h-20" />
              <div className="flex gap-3">
                <input placeholder="Stock" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
                  className="w-32 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" />
                <button onClick={handleCreateProduct} disabled={loading}
                  className="px-6 py-3 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 disabled:opacity-50 transition-all">
                  {loading ? 'Creating...' : 'Create Product'}
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-3">
            {products.map((p: any) => (
              <div key={p._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex justify-between items-center">
                <div>
                  <p className="font-black text-sm">{p.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{p.category} · {p.productType}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Stock: {p.stock} · Sales: {p.salesCount || 0}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-orange-400">NGN {p.price.toLocaleString()}</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-bold ${p.isPublished ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                    {p.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-sm">No products yet. Create your first product above.</div>
            )}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black">Recent Orders</h3>
          <div className="grid gap-3">
            {orders.map((o: any) => (
              <div key={o._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex justify-between items-center">
                <div>
                  <p className="font-black text-sm">{o.orderNumber}</p>
                  <p className="text-xs text-slate-400 mt-1">{o.customerName} · {o.customerEmail}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{new Date(o.createdAt).toLocaleDateString('en-NG')}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-orange-400">NGN {(o.total || 0).toLocaleString()}</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-bold ${
                    o.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                    o.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                    'bg-orange-500/10 text-orange-400'
                  }`}>{o.status}</span>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-sm">No orders yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Storefront Tab */}
      {tab === 'storefront' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black">Generate Storefront</h3>
          <p className="text-xs text-slate-400">Generate a hosted storefront page with all your products.</p>
          <div className="flex gap-3">
            <input placeholder="Store name" value={storeName} onChange={e => setStoreName(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" />
            <button onClick={handleGenerateStorefront} disabled={loading || products.length === 0}
              className="px-6 py-3 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 disabled:opacity-50 transition-all">
              {loading ? 'Generating...' : 'Generate Storefront'}
            </button>
          </div>
          {storefrontHtml && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <p className="text-xs text-emerald-400 font-bold">Storefront generated! Preview:</p>
              <iframe srcDoc={storefrontHtml} className="w-full h-96 rounded-xl border border-slate-700" title="Storefront Preview" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
