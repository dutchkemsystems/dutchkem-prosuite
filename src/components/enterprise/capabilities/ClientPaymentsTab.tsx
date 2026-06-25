import { useState } from 'react'
import { useMutation, useQuery, useAction } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function ClientPaymentsTab({ token }: { token: string }) {
  const payments = useQuery(api.enterprise_client_payments.listClientPayments, token ? { token } : 'skip') || []
  const stats = useQuery(api.enterprise_client_payments.getClientPaymentStats, token ? { token } : 'skip') || { totalCollected: 0, totalPending: 0, totalFailed: 0, totalCount: 0, completedCount: 0 }
  const bankAccounts = useQuery(api.enterprise_client_payments.getOrgBankAccounts, token ? { token } : 'skip') || []
  const createInvoice = useMutation(api.enterprise_client_payments.createClientInvoice)
  const initPayment = useAction(api.enterprise_client_payments.initializeGatewayPayment)
  const addBankAccount = useMutation(api.enterprise_client_payments.addBankAccount)

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ customerName: '', customerEmail: '', amount: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showBank, setShowBank] = useState(false)
  const [bankForm, setBankForm] = useState({ bankName: '', bankCode: '', accountNumber: '', accountName: '' })

  const showToast = (msg: string, isError = false) => {
    if (isError) setError(msg)
    else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 3000)
  }

  const handleCreateInvoice = async () => {
    if (!form.customerName || !form.customerEmail || !form.amount || !form.description) {
      showToast('All fields required', true)
      return
    }
    setLoading(true)
    try {
      const result = await createInvoice({
        token,
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        amount: Number(form.amount),
        currency: 'NGN',
        description: form.description,
      })
      if (result.error) { showToast(result.error, true); return }

      const payResult = await initPayment({ paymentId: result.paymentId, token })
      if (payResult.error) {
        showToast(`Invoice created (${result.invoiceNumber}) but gateway init failed: ${payResult.error}`, true)
      } else {
        showToast(`Invoice ${result.invoiceNumber} created! Redirecting to payment...`)
        if (payResult.checkoutUrl) {
          window.open(payResult.checkoutUrl, '_blank')
        }
      }
      setShowCreate(false)
      setForm({ customerName: '', customerEmail: '', amount: '', description: '' })
    } catch (e: any) {
      showToast(e.message || 'Failed to create invoice', true)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBank = async () => {
    if (!bankForm.bankName || !bankForm.bankCode || !bankForm.accountNumber || !bankForm.accountName) {
      showToast('All fields required', true)
      return
    }
    setLoading(true)
    try {
      await addBankAccount({ token, ...bankForm })
      showToast('Bank account added!')
      setShowBank(false)
      setBankForm({ bankName: '', bankCode: '', accountNumber: '', accountName: '' })
    } catch (e: any) {
      showToast(e.message || 'Failed to add bank account', true)
    } finally {
      setLoading(false)
    }
  }

  const statusColors: Record<string, string> = {
    completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    pending: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    failed: 'text-red-400 bg-red-500/10 border-red-500/20',
    refunded: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  }

  return (
    <div className="space-y-6">
      {(error || success) && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${error ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {error || success}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Client Payments</h2>
          <p className="text-sm text-slate-400 mt-1">Collect payments directly from your customers</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setShowCreate(!showCreate); setShowBank(false) }}
            className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-sm rounded-xl hover:scale-105 transition-all">
            Create Invoice
          </button>
          <button onClick={() => { setShowBank(!showBank); setShowCreate(false) }}
            className="px-5 py-3 bg-white/5 border border-white/10 text-white font-black text-sm rounded-xl hover:bg-white/10 transition-all">
            Bank Accounts
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Total Collected</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">₦{stats.totalCollected.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Pending</p>
          <p className="text-2xl font-black text-orange-400 mt-1">₦{stats.totalPending.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Completed</p>
          <p className="text-2xl font-black text-white mt-1">{stats.completedCount}</p>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Failed</p>
          <p className="text-2xl font-black text-red-400 mt-1">{stats.totalFailed}</p>
        </div>
      </div>

      {/* Create Invoice Form */}
      {showCreate && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <h3 className="font-black">Create Invoice</h3>
          <div className="grid grid-cols-2 gap-4">
            <input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })}
              placeholder="Customer Name"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium" />
            <input value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })}
              placeholder="Customer Email"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">₦</span>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="Amount"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium" />
            </div>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Description"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium" />
          </div>
          <button onClick={handleCreateInvoice} disabled={loading}
            className="px-6 py-3 bg-emerald-600 text-white font-black text-sm rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50">
            {loading ? 'Processing...' : 'Create & Send Invoice'}
          </button>
        </div>
      )}

      {/* Bank Account Form */}
      {showBank && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <h3 className="font-black">Add Bank Account</h3>
          <div className="grid grid-cols-2 gap-4">
            <input value={bankForm.bankName} onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}
              placeholder="Bank Name (e.g. GTBank)"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium" />
            <input value={bankForm.bankCode} onChange={e => setBankForm({ ...bankForm, bankCode: e.target.value })}
              placeholder="Bank Code (e.g. 058)"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input value={bankForm.accountNumber} onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })}
              placeholder="Account Number"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium" />
            <input value={bankForm.accountName} onChange={e => setBankForm({ ...bankForm, accountName: e.target.value })}
              placeholder="Account Name"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium" />
          </div>
          <button onClick={handleAddBank} disabled={loading}
            className="px-6 py-3 bg-emerald-600 text-white font-black text-sm rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50">
            {loading ? 'Saving...' : 'Add Bank Account'}
          </button>

          {bankAccounts.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Saved Accounts</p>
              {bankAccounts.map((acc: any) => (
                <div key={acc._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <p className="text-sm font-bold">{acc.bankName} - {acc.accountNumber}</p>
                    <p className="text-xs text-slate-400">{acc.accountName}</p>
                  </div>
                  {acc.isDefault && <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">DEFAULT</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment History */}
      <div>
        <h3 className="font-black mb-4">Payment History</h3>
        {payments.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="text-4xl mb-2">💳</p>
            <p className="font-bold">No payments yet</p>
            <p className="text-sm mt-1">Create an invoice to start collecting payments</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((p: any) => (
              <div key={p._id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex-1">
                  <p className="font-bold">{p.customerName}</p>
                  <p className="text-xs text-slate-400">{p.customerEmail} • {p.description}</p>
                  <p className="text-xs text-slate-500 mt-1">{p.invoiceNumber} • {new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-lg">₦{p.amount.toLocaleString()}</p>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${statusColors[p.status] || ''}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
