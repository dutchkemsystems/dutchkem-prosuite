import { useState } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'

// ═══════════════════════════════════════════════════════════════════
// ENTERPRISE BUILT-IN FEATURES — Orders, CRM, Reports, QR, etc.
// ═══════════════════════════════════════════════════════════════════

const fmt = (n: number, c = 'NGN') => `${c} ${n.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

// ─── LANDING PAGE SECTION (used by index.tsx) ───
export function EnterpriseFeatures() {
  const features = [
    { icon: '📦', name: 'Order Management', desc: 'Full order lifecycle from creation to delivery' },
    { icon: '👥', name: 'Customer Database', desc: 'CRM with tags, loyalty, and import' },
    { icon: '📊', name: 'Analytics & Reports', desc: 'Sales, customers, inventory, dashboard' },
    { icon: '📄', name: 'Invoices & Receipts', desc: 'Professional HTML invoices and receipts' },
    { icon: '📱', name: 'QR Codes', desc: 'Payment links, business cards, products' },
    { icon: '📅', name: 'Appointments', desc: 'Booking slots, scheduling, reminders' },
    { icon: '📣', name: 'SMS Marketing', desc: 'Bulk campaigns with AI message generation' },
    { icon: '🕐', name: 'Business Hours', desc: 'Auto-reply outside hours, timezone support' },
    { icon: '🛒', name: 'E-commerce', desc: 'Product listings, storefront, orders' },
  ]
  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-black text-white mb-3">Built-in Enterprise Features</h2>
        <p className="text-slate-400 mb-10">Everything your business needs, included by default</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {features.map(f => (
            <div key={f.name} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 text-left hover:border-orange-500/50 transition-all">
              <span className="text-2xl">{f.icon}</span>
              <p className="text-white font-bold text-sm mt-3">{f.name}</p>
              <p className="text-slate-400 text-xs mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── ORDERS TAB ───
export function OrdersTab({ token }: { token: string }) {
  const [filter, setFilter] = useState('')
  const orders = useQuery(api.order_management.getOrders, filter ? { status: filter } : {})
  const updateStatus = useMutation(api.order_management.updateOrderStatus)

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === s ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>
      <div className="grid gap-3">
        {(orders || []).map((o: any) => (
          <div key={o._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-black text-sm">{o.orderNumber}</p>
                <p className="text-xs text-slate-400 mt-1">{o.customerName} · {o.customerEmail}</p>
                <p className="text-xs text-slate-500 mt-1">{o.itemCount} items · {new Date(o.createdAt).toLocaleDateString('en-NG')}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-orange-400">{fmt(o.total, o.currency)}</p>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-bold ${
                  o.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                  o.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                  o.status === 'shipped' ? 'bg-blue-500/10 text-blue-400' :
                  'bg-orange-500/10 text-orange-400'
                }`}>{o.status}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {o.status === 'pending' && (
                <button onClick={() => updateStatus({ orderId: o._id, status: 'confirmed', adminToken: token })}
                  className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-[11px] font-bold hover:bg-emerald-500/20">Confirm</button>
              )}
              {o.status === 'confirmed' && (
                <button onClick={() => updateStatus({ orderId: o._id, status: 'processing', adminToken: token })}
                  className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-[11px] font-bold hover:bg-blue-500/20">Process</button>
              )}
              {o.status === 'processing' && (
                <button onClick={() => updateStatus({ orderId: o._id, status: 'shipped', adminToken: token })}
                  className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-[11px] font-bold hover:bg-blue-500/20">Ship</button>
              )}
              {o.status === 'shipped' && (
                <button onClick={() => updateStatus({ orderId: o._id, status: 'delivered', adminToken: token })}
                  className="px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg text-[11px] font-bold hover:bg-purple-500/20">Deliver</button>
              )}
              {!['completed', 'cancelled', 'delivered'].includes(o.status) && (
                <button onClick={() => updateStatus({ orderId: o._id, status: 'cancelled', adminToken: token })}
                  className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-[11px] font-bold hover:bg-red-500/20">Cancel</button>
              )}
            </div>
          </div>
        ))}
        {(!orders || orders.length === 0) && <p className="text-slate-500 text-sm text-center py-10">No orders yet</p>}
      </div>
    </div>
  )
}

// ─── CUSTOMERS TAB ───
export function CustomersTab({ token }: { token: string }) {
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', tags: '' })
  const customers = useQuery(api.customer_database.getCustomers, search ? { search } : {})
  const addCustomer = useMutation(api.customer_database.addCustomer)
  const addTag = useMutation(api.customer_database.addCustomerTag)

  const handleAdd = async () => {
    if (!form.name || !form.email) return
    await addCustomer({
      name: form.name, email: form.email, phone: form.phone,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
      source: 'enterprise', adminToken: token,
    })
    setForm({ name: '', email: '', phone: '', tags: '' })
    setShowAdd(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-5 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600">+ Add</button>
      </div>
      {showAdd && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Name"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" />
          <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" />
          <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" />
          <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="Tags (comma separated)"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" />
          <button onClick={handleAdd} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold">Save Customer</button>
        </div>
      )}
      <div className="grid gap-3">
        {(customers || []).map((c: any) => (
          <div key={c._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex justify-between">
              <div>
                <p className="font-black text-sm">{c.name}</p>
                <p className="text-xs text-slate-400">{c.email} {c.phone ? `· ${c.phone}` : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">{c.totalOrders} orders</p>
                <p className="text-xs text-orange-400 font-bold">{fmt(c.totalSpent)}</p>
              </div>
            </div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {(c.tags || []).map((t: string) => (
                <span key={t} className="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full text-[10px] font-bold">{t}</span>
              ))}
              {c.loyaltyPoints > 0 && (
                <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded-full text-[10px] font-bold">⭐ {c.loyaltyPoints} pts</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── REPORTING TAB ───
export function ReportingTab({ token }: { token: string }) {
  const dashboard = useQuery(api.reporting.getDashboardSummary)
  const sales = useQuery(api.reporting.getSalesReport, {})
  const customerReport = useQuery(api.reporting.getCustomerReport)

  return (
    <div className="space-y-6">
      {dashboard && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Revenue (30d)" value={fmt(dashboard.revenue.last30Days)} color="text-orange-400" />
            <StatCard label="Orders (30d)" value={dashboard.orders.last30Days.toString()} color="text-blue-400" />
            <StatCard label="New Customers (30d)" value={dashboard.customers.newLast30Days.toString()} color="text-emerald-400" />
            <StatCard label="Growth" value={`${dashboard.revenue.growthPercent}%`} color="text-purple-400" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="All-Time Revenue" value={fmt(dashboard.revenue.allTime)} color="text-orange-400" />
            <StatCard label="Total Orders" value={dashboard.orders.total.toString()} color="text-blue-400" />
            <StatCard label="Total Customers" value={dashboard.customers.total.toString()} color="text-emerald-400" />
            <StatCard label="Total Products" value={dashboard.products.total.toString()} color="text-purple-400" />
          </div>
          {dashboard.alerts.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
              <p className="text-sm font-bold text-red-400 mb-2">⚠️ Alerts</p>
              {dashboard.alerts.map((a: string, i: number) => (
                <p key={i} className="text-xs text-slate-400">{a}</p>
              ))}
            </div>
          )}
        </>
      )}
      {sales && sales.topItems.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <p className="text-sm font-bold mb-3">Top Selling Items</p>
          {sales.topItems.map((item: any, i: number) => (
            <div key={i} className="flex justify-between py-2 border-b border-slate-800 last:border-0">
              <span className="text-xs text-slate-300">{item.name}</span>
              <span className="text-xs text-orange-400 font-bold">{item.count} sold · {fmt(item.revenue)}</span>
            </div>
          ))}
        </div>
      )}
      {customerReport && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <p className="text-sm font-bold mb-3">Customer Tiers</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="VIP (500K+)" value={customerReport.tiers.vip.count.toString()} color="text-yellow-400" />
            <StatCard label="Premium (100K+)" value={customerReport.tiers.premium.count.toString()} color="text-orange-400" />
            <StatCard label="Regular (10K+)" value={customerReport.tiers.regular.count.toString()} color="text-blue-400" />
            <StatCard label="New (<10K)" value={customerReport.tiers.newCustomers.count.toString()} color="text-slate-400" />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── QR CODES TAB ───
export function QRCodesTab({ token }: { token: string }) {
  const [data, setData] = useState('')
  const [type, setType] = useState('link')
  const [result, setResult] = useState<any>(null)
  const generateQR = useAction(api.qr_generator.generateQRCode)

  const handleGenerate = async () => {
    if (!data) return
    const res = await generateQR({ data, type, size: 300, adminToken: token })
    setResult(res)
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {['link', 'url', 'phone', 'email', 'wifi', 'payment'].map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${type === t ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{t}</button>
          ))}
        </div>
        <input value={data} onChange={e => setData(e.target.value)}
          placeholder={type === 'link' ? 'https://example.com' : type === 'phone' ? '+234...' : 'Enter data...'}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white" />
        <button onClick={handleGenerate}
          className="px-5 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600">Generate QR Code</button>
      </div>
      {result?.svg && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
          <div dangerouslySetInnerHTML={{ __html: result.svg }} className="inline-block" />
          <p className="text-xs text-slate-400 mt-3">Type: {result.type} · Size: {result.size}px</p>
        </div>
      )}
    </div>
  )
}

// ─── INVOICES TAB ───
export function InvoicesTab({ token }: { token: string }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ to: '', toEmail: '', items: [{ description: '', quantity: 1, rate: 0 }], tax: 0, discount: 0 })
  const [invoice, setInvoice] = useState<any>(null)
  const createInvoice = useAction(api.invoice_generator.createInvoice)

  const handleCreate = async () => {
    const res = await createInvoice({
      from: 'DutchKem Prosuite', fromEmail: 'billing@dutchkem.com', fromAddress: 'Lagos, Nigeria',
      to: form.to, toEmail: form.toEmail, toAddress: '',
      items: form.items.filter(i => i.description),
      tax: form.tax, discount: form.discount, adminToken: token,
    })
    setInvoice(res)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      <button onClick={() => setShowForm(!showForm)}
        className="px-5 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600">+ Create Invoice</button>
      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <input value={form.to} onChange={e => setForm({...form, to: e.target.value})} placeholder="Client Name"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" />
          <input value={form.toEmail} onChange={e => setForm({...form, toEmail: e.target.value})} placeholder="Client Email"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" />
          {form.items.map((item, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <input value={item.description} onChange={e => { const items = [...form.items]; items[i].description = e.target.value; setForm({...form, items}) }} placeholder="Description"
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
              <input type="number" value={item.quantity} onChange={e => { const items = [...form.items]; items[i].quantity = +e.target.value; setForm({...form, items}) }} placeholder="Qty"
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
              <input type="number" value={item.rate} onChange={e => { const items = [...form.items]; items[i].rate = +e.target.value; setForm({...form, items}) }} placeholder="Rate"
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={form.tax} onChange={e => setForm({...form, tax: +e.target.value})} placeholder="Tax %"
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
            <input type="number" value={form.discount} onChange={e => setForm({...form, discount: +e.target.value})} placeholder="Discount %"
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
          </div>
          <button onClick={handleCreate} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold">Generate Invoice</button>
        </div>
      )}
      {invoice?.html && (
        <div className="bg-white rounded-2xl overflow-hidden">
          <iframe srcDoc={invoice.html} className="w-full h-[600px] border-0" title="Invoice" />
        </div>
      )}
    </div>
  )
}

// ─── RECEIPTS TAB ───
export function ReceiptsTab({ token }: { token: string }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ customerName: '', customerEmail: '', paymentMethod: 'Bank Transfer', items: [{ description: '', quantity: 1, unitPrice: 0 }], tax: 0 })
  const [receipt, setReceipt] = useState<any>(null)
  const generateReceipt = useAction(api.receipt_generator.generateReceipt)

  const handleCreate = async () => {
    const res = await generateReceipt({
      businessName: 'DutchKem Prosuite', businessEmail: 'billing@dutchkem.com',
      customerName: form.customerName, customerEmail: form.customerEmail,
      items: form.items.filter(i => i.description),
      paymentMethod: form.paymentMethod, tax: form.tax, adminToken: token,
    })
    setReceipt(res)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      <button onClick={() => setShowForm(!showForm)}
        className="px-5 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600">+ Generate Receipt</button>
      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <input value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} placeholder="Customer Name"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" />
          <input value={form.customerEmail} onChange={e => setForm({...form, customerEmail: e.target.value})} placeholder="Customer Email"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" />
          <select value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white">
            <option>Bank Transfer</option><option>Cash</option><option>Card</option><option>USSD</option><option>Mobile Money</option>
          </select>
          {form.items.map((item, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <input value={item.description} onChange={e => { const items = [...form.items]; items[i].description = e.target.value; setForm({...form, items}) }} placeholder="Item"
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
              <input type="number" value={item.quantity} onChange={e => { const items = [...form.items]; items[i].quantity = +e.target.value; setForm({...form, items}) }} placeholder="Qty"
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
              <input type="number" value={item.unitPrice} onChange={e => { const items = [...form.items]; items[i].unitPrice = +e.target.value; setForm({...form, items}) }} placeholder="Price"
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
            </div>
          ))}
          <button onClick={handleCreate} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold">Generate Receipt</button>
        </div>
      )}
      {receipt?.html && (
        <div className="bg-white rounded-2xl overflow-hidden">
          <iframe srcDoc={receipt.html} className="w-full h-[600px] border-0" title="Receipt" />
        </div>
      )}
    </div>
  )
}

// ─── APPOINTMENTS TAB ───
export function AppointmentsTab({ token }: { token: string }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', date: '', startTime: '09:00', endTime: '10:00', durationMinutes: 60 })
  const slots = useQuery(api.appointment_booking.getAvailableSlots, {})
  const createSlot = useMutation(api.appointment_booking.createBookingSlot)

  const handleCreate = async () => {
    if (!form.title || !form.date) return
    await createSlot({ ...form, maxBookings: 1, location: 'Online', adminToken: token })
    setForm({ title: '', date: '', startTime: '09:00', endTime: '10:00', durationMinutes: 60 })
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      <button onClick={() => setShowForm(!showForm)}
        className="px-5 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600">+ Create Slot</button>
      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Title (e.g. Consultation)"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" />
          <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" />
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-slate-500">Start</label>
              <input type="time" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" /></div>
            <div><label className="text-xs text-slate-500">End</label>
              <input type="time" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" /></div>
          </div>
          <button onClick={handleCreate} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold">Create Slot</button>
        </div>
      )}
      <div className="grid gap-3">
        {(slots || []).map((s: any) => (
          <div key={s._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex justify-between items-center">
            <div>
              <p className="font-black text-sm">{s.title}</p>
              <p className="text-xs text-slate-400">{s.date} · {s.startTime} - {s.endTime}</p>
            </div>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold">
              {s.currentBookings}/{s.maxBookings} booked
            </span>
          </div>
        ))}
        {(!slots || slots.length === 0) && <p className="text-slate-500 text-sm text-center py-10">No appointment slots</p>}
      </div>
    </div>
  )
}

// ─── BUSINESS HOURS TAB ───
export function BusinessHoursTab({ token }: { token: string }) {
  const schedule = useQuery(api.business_hours.getSchedule)
  const setSchedule = useMutation(api.business_hours.setSchedule)
  const [localSchedule, setLocalSchedule] = useState<any>(null)
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  const s = localSchedule || schedule?.schedule || {}

  const handleSave = async () => {
    await setSchedule({ schedule: s, timezone: 'Africa/Lagos', adminToken: token })
    setLocalSchedule(null)
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        {days.map(day => (
          <div key={day} className="flex items-center gap-3">
            <span className="w-24 text-xs font-bold capitalize">{day}</span>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={s[day]?.enabled ?? (day !== 'sunday')}
                onChange={e => {
                  const newS = { ...s, [day]: { ...(s[day] || { open: '08:00', close: '18:00' }), enabled: e.target.checked } }
                  setLocalSchedule(newS)
                }} className="accent-orange-500" />
              <span className="text-[10px] text-slate-500">Open</span>
            </label>
            <input type="time" value={s[day]?.open || '08:00'}
              onChange={e => { const newS = { ...s, [day]: { ...(s[day] || {}), open: e.target.value } }; setLocalSchedule(newS) }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" disabled={!s[day]?.enabled} />
            <span className="text-xs text-slate-500">to</span>
            <input type="time" value={s[day]?.close || '18:00'}
              onChange={e => { const newS = { ...s, [day]: { ...(s[day] || {}), close: e.target.value } }; setLocalSchedule(newS) }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" disabled={!s[day]?.enabled} />
          </div>
        ))}
        <button onClick={handleSave}
          className="px-5 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600">Save Schedule</button>
      </div>
    </div>
  )
}

// ─── MARKETING TAB ───
export function MarketingTab({ token }: { token: string }) {
  const [campaignName, setCampaignName] = useState('')
  const [message, setMessage] = useState('')
  const [recipients, setRecipients] = useState('')
  const [result, setResult] = useState<any>(null)
  const campaigns = useQuery(api.sms_marketing.getCampaigns)
  const createCampaign = useMutation(api.sms_marketing.createCampaign)
  const generateMessage = useAction(api.sms_marketing.generateCampaignMessage)

  const handleCreate = async () => {
    if (!campaignName || !message || !recipients) return
    const phoneList = recipients.split(',').map(r => r.trim()).filter(Boolean)
    await createCampaign({
      name: campaignName, message, recipients: phoneList,
      adminToken: token,
    })
    setCampaignName(''); setMessage(''); setRecipients('')
  }

  const handleGenerate = async () => {
    const res = await generateMessage({ product: 'DutchKem Prosuite', offer: 'Special offer', tone: 'professional', adminToken: token })
    setMessage(res.message)
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <p className="text-sm font-bold">Create SMS Campaign</p>
        <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Campaign name"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" />
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="SMS message..." rows={3}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white resize-none" />
        <input value={recipients} onChange={e => setRecipients(e.target.value)} placeholder="Phone numbers (comma separated)"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" />
        <div className="flex gap-2">
          <button onClick={handleGenerate} className="px-4 py-2 bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-slate-600">AI Generate</button>
          <button onClick={handleCreate} className="px-5 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600">Create Campaign</button>
        </div>
      </div>
      {(campaigns || []).length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <p className="text-sm font-bold mb-3">Recent Campaigns</p>
          {campaigns.map((c: any) => (
            <div key={c._id} className="flex justify-between py-2 border-b border-slate-800 last:border-0">
              <div>
                <p className="text-xs font-bold">{c.name}</p>
                <p className="text-[10px] text-slate-500">{c.recipientCount} recipients · {c.sentCount} sent</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'}`}>{c.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SHARED ───
function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <p className={`text-xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{label}</p>
    </div>
  )
}
