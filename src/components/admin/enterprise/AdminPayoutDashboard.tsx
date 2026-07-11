import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-900 text-yellow-300',
  approved: 'bg-green-900 text-green-300',
  processing: 'bg-blue-900 text-blue-300',
  completed: 'bg-green-900 text-green-300',
  failed: 'bg-red-900 text-red-300',
  rejected: 'bg-red-900 text-red-300',
  not_submitted: 'bg-gray-700 text-gray-300',
}

export default function AdminPayoutDashboard({ adminToken }: { adminToken: string }) {
  const [tab, setTab] = useState<'pending' | 'all' | 'kyc' | 'batches' | 'balance'>('pending')
  const [rejectModal, setRejectModal] = useState<{ id: string; reason: string } | null>(null)
  const [processConfirm, setProcessConfirm] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">KYC & Payout Management</h2>
        <p className="text-gray-400 text-sm">Review KYC submissions and process client withdrawals via Kora Pay</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'pending', label: '⏳ Pending Payouts' },
          { id: 'all', label: '📋 All Payouts' },
          { id: 'kyc', label: '🪪 KYC Reviews' },
          { id: 'batches', label: '📦 Batch History' },
          { id: 'balance', label: '💰 Kora Balance' },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pending' && <PendingPayoutsTab adminToken={adminToken} />}
      {tab === 'all' && <AllPayoutsTab adminToken={adminToken} />}
      {tab === 'kyc' && <KycReviewTab adminToken={adminToken} />}
      {tab === 'batches' && <BatchHistoryTab adminToken={adminToken} />}
      {tab === 'balance' && <KoraBalanceTab adminToken={adminToken} />}
    </div>
  )
}

function PendingPayoutsTab({ adminToken }: { adminToken: string }) {
  const payouts = useQuery(api.admin_payouts.adminListPendingPayouts, { adminToken })
  const approvePayout = useMutation(api.admin_payouts.adminApprovePayout)
  const rejectPayout = useMutation(api.admin_payouts.adminRejectPayout)
  const processPayout = useMutation(api.admin_payouts.adminProcessPayout)
  const [selected, setSelected] = useState<string[]>([])
  const [processing, setProcessing] = useState<string | null>(null)

  const handleApprove = async (id: string) => {
    await approvePayout({ adminToken, requestId: id as any })
  }

  const handleReject = async (id: string) => {
    setRejectModal({ id, reason: '' })
  }

  const handleProcess = async (id: string) => {
    setProcessConfirm(id)
    setProcessing(id)
    try {
      const result = await processPayout({ adminToken, requestId: id as any })
      if (result?.error) alert(`Error: ${result.error}`)
      else alert(`Payout sent! Ref: ${result.koraReference}`)
    } catch (e: any) { alert(`Error: ${e.message}`) }
    setProcessing(null)
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Pending Payout Requests ({payouts?.length || 0})</h3>
      </div>

      {!payouts || payouts.length === 0 ? (
        <div className="bg-gray-900 rounded-xl p-8 text-center border border-gray-800">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-gray-400">No pending payout requests</div>
        </div>
      ) : (
        <div className="space-y-2">
          {payouts.map((p: any) => (
            <div key={p._id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <input type="checkbox" checked={selected.includes(p._id)} onChange={() => toggleSelect(p._id)}
                    className="w-4 h-4 rounded" />
                  <div>
                    <div className="text-white font-medium">₦{p.amount.toLocaleString()}</div>
                    <div className="text-gray-400 text-sm">{p.bankName} • {p.accountNumber} • {p.accountName}</div>
                    <div className="text-gray-500 text-xs">{new Date(p.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                  {p.status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(p._id)} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">Approve</button>
                      <button onClick={() => handleReject(p._id)} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">Reject</button>
                    </>
                  )}
                  {p.status === 'approved' && (
                    <button onClick={() => handleProcess(p._id)} disabled={processing === p._id}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                      {processing === p._id ? '⏳' : '💸 Process'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AllPayoutsTab({ adminToken }: { adminToken: string }) {
  const [filter, setFilter] = useState('')
  const payouts = useQuery(api.admin_payouts.adminListAllPayouts, { adminToken, status: filter || undefined, limit: 50 })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold text-white">All Payout Requests</h3>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="bg-gray-800 text-white rounded-lg px-3 py-1 text-sm border border-gray-700">
          <option value="">All Status</option>
          {['pending', 'approved', 'processing', 'completed', 'failed', 'rejected'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="text-left px-4 py-3 text-gray-400">Amount</th>
              <th className="text-left px-4 py-3 text-gray-400">Bank</th>
              <th className="text-left px-4 py-3 text-gray-400">Account</th>
              <th className="text-left px-4 py-3 text-gray-400">Status</th>
              <th className="text-left px-4 py-3 text-gray-400">Date</th>
              <th className="text-left px-4 py-3 text-gray-400">Ref</th>
            </tr>
          </thead>
          <tbody>
            {payouts?.map((p: any) => (
              <tr key={p._id} className="border-t border-gray-800">
                <td className="px-4 py-3 text-white font-medium">₦{p.amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-300">{p.bankName}</td>
                <td className="px-4 py-3 text-gray-300">{p.accountNumber}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[p.status]}`}>{p.status}</span></td>
                <td className="px-4 py-3 text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{p.koraReference || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KycReviewTab({ adminToken }: { adminToken: string }) {
  const [statusFilter, setStatusFilter] = useState('pending')
  const [rejectModal, setRejectModal] = useState<{ id: string; reason: string } | null>(null)
  const submissions = useQuery(api.client_kyc.adminListKycSubmissions, { adminToken, status: statusFilter })
  const approveKyc = useMutation(api.client_kyc.adminApproveKyc)
  const rejectKyc = useMutation(api.client_kyc.adminRejectKyc)

  const handleApprove = async (id: string) => {
    await approveKyc({ adminToken, submissionId: id as any })
  }

  const handleReject = async (id: string) => {
    setRejectModal({ id, reason: '' })
  }

  const confirmReject = async () => {
    if (!rejectModal?.reason) return
    await rejectKyc({ adminToken, submissionId: rejectModal.id as any, reason: rejectModal.reason })
    setRejectModal(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold text-white">KYC Submissions</h3>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 text-white rounded-lg px-3 py-1 text-sm border border-gray-700">
          {['pending', 'approved', 'rejected', 'not_submitted'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {!submissions || submissions.length === 0 ? (
        <div className="bg-gray-900 rounded-xl p-8 text-center border border-gray-800">
          <div className="text-gray-400">No {statusFilter} KYC submissions</div>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((s: any) => (
            <div key={s._id} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-white font-medium text-lg">{s.legalName}</div>
                  {s.businessName && <div className="text-gray-300">{s.businessName} • RC: {s.registrationNumber || 'N/A'}</div>}
                  <div className="text-gray-400 text-sm">{s.email} • {s.phoneNumber || 'No phone'}</div>
                  <div className="text-gray-400 text-sm">{s.address || 'No address'}{s.city ? `, ${s.city}` : ''}{s.state ? `, ${s.state}` : ''}</div>
                  <div className="text-gray-500 text-xs">Submitted: {new Date(s.createdAt).toLocaleDateString()}</div>
                  {s.rejectionReason && <div className="text-red-400 text-sm">Reason: {s.rejectionReason}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded text-xs ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                  {s.status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(s._id)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">✅ Approve</button>
                      <button onClick={() => handleReject(s._id)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">❌ Reject</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BatchHistoryTab({ adminToken }: { adminToken: string }) {
  const batches = useQuery(api.admin_payouts.adminGetBatchHistory, { adminToken })

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Bulk Payout Batch History</h3>
      {!batches || batches.length === 0 ? (
        <div className="bg-gray-900 rounded-xl p-8 text-center border border-gray-800">
          <div className="text-gray-400">No batches processed yet</div>
        </div>
      ) : (
        <div className="space-y-2">
          {batches.map((b: any) => (
            <div key={b._id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center justify-between">
              <div>
                <div className="text-white font-medium">{b.batchReference}</div>
                <div className="text-gray-400 text-sm">₦{b.totalAmount.toLocaleString()} • {b.totalPayouts} payouts</div>
                <div className="text-gray-500 text-xs">{new Date(b.createdAt).toLocaleDateString()}</div>
              </div>
              <span className={`px-3 py-1 rounded text-xs ${STATUS_COLORS[b.status]}`}>{b.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function KoraBalanceTab({ adminToken }: { adminToken: string }) {
  const [balance, setBalance] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rejectModal, setRejectModal] = useState<{ id: string; reason: string } | null>(null)
  const [processConfirm, setProcessConfirm] = useState<string | null>(null)
  const getBalance = useMutation(api.admin_payouts.adminGetKoraBalance)

  const fetchBalance = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getBalance({ adminToken })
      if (result?.error) setError(result.error)
      else setBalance(result?.balance)
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-black text-white mb-4">Rejection Reason</h3>
            <input
              placeholder="Reason for rejection"
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white mb-4"
            />
            <div className="flex gap-2">
              <button onClick={confirmReject} disabled={!rejectModal.reason} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold disabled:opacity-50">Reject</button>
              <button onClick={() => setRejectModal(null)} className="px-4 py-2 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs font-bold">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Process Confirm Modal */}
      {processConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-black text-white mb-2">Process Payout?</h3>
            <p className="text-sm text-slate-400 mb-4">Process this payout via Kora Pay?</p>
            <div className="flex gap-2">
              <button onClick={async () => { setProcessing(processConfirm); try { await processPayout({ adminToken, payoutRequestId: processConfirm as any }); showToast('Payout processed', 'success'); } catch (e: any) { showToast(e.message || 'Failed', 'error'); } finally { setProcessing(null); setProcessConfirm(null); } }} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold">Confirm</button>
              <button onClick={() => setProcessConfirm(null)} className="px-4 py-2 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs font-bold">Cancel</button>
            </div>
          </div>
        </div>
      )}
      <h3 className="text-lg font-semibold text-white">Kora Pay Balance</h3>
      <button onClick={fetchBalance} disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
        {loading ? '⏳ Loading...' : '🔄 Refresh Balance'}
      </button>

      {error && <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">{error}</div>}

      {balance && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(balance).map(([currency, amount]) => (
              <div key={currency} className="text-center">
                <div className="text-gray-400 text-sm">{currency}</div>
                <div className="text-2xl font-bold text-white">₦{Number(amount).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
