import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const NIGERIAN_BANKS = [
  { code: "044", name: "Access Bank" }, { code: "063", name: "Diamond Bank" },
  { code: "050", name: "Ecobank Nigeria" }, { code: "045", name: "Equitorial Trust Bank" },
  { code: "011", name: "First Bank of Nigeria" }, { code: "214", name: "First City Monument Bank" },
  { code: "070", name: "Fidelity Bank" }, { code: "058", name: "Guaranty Trust Bank" },
  { code: "030", name: "Heritage Bank" }, { code: "082", name: "Keystone Bank" },
  { code: "526", name: "Jaiz Bank" }, { code: "014", name: "MainStreet Bank" },
  { code: "760", name: "Polaris Bank" }, { code: "076", name: "Skye Bank" },
  { code: "221", name: "Stanbic IBTC Bank" }, { code: "068", name: "Standard Chartered Bank" },
  { code: "033", name: "United Bank for Africa" }, { code: "032", name: "Union Bank" },
  { code: "215", name: "Unity Bank" }, { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" }, { code: "999999", name: "PalmPay" },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-900 text-yellow-300',
  approved: 'bg-green-900 text-green-300',
  processing: 'bg-blue-900 text-blue-300',
  completed: 'bg-green-900 text-green-300',
  failed: 'bg-red-900 text-red-300',
  rejected: 'bg-red-900 text-red-300',
  not_submitted: 'bg-gray-700 text-gray-300',
}

export default function ClientWalletDashboard({ userId }: { userId?: string }) {

  const wallet = useQuery(api.client_wallet.getMyWallet, userId ? { userId } : 'skip')
  const kyc = useQuery(api.client_kyc.getMyKycStatus, userId ? { userId } : 'skip')
  const bankAccounts = useQuery(api.client_payouts.getMyBankAccounts, userId ? { userId } : 'skip')
  const payoutRequests = useQuery(api.client_payouts.getMyPayoutRequests, userId ? { userId } : 'skip')
  const transactions = useQuery(api.client_wallet.getMyTransactions, userId ? { userId, limit: 20 } : 'skip')

  const [tab, setTab] = useState<'wallet' | 'kyc' | 'banks' | 'withdraw' | 'history'>('wallet')

  if (!userId) return <div className="text-gray-400 p-8 text-center">Please log in to view your wallet.</div>

  const kycApproved = kyc?.status === 'approved'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">My Wallet</h2>
        <p className="text-gray-400 text-sm">Earnings from Dutchkem AI agents & platform usage</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-8 text-white">
        <div className="text-sm opacity-80 mb-1">Available Balance</div>
        <div className="text-5xl font-bold mb-4">₦{(wallet?.balance || 0).toLocaleString()}</div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><span className="opacity-70">Pending:</span> <span className="font-medium">₦{(wallet?.pendingWithdrawals || 0).toLocaleString()}</span></div>
          <div><span className="opacity-70">Earned:</span> <span className="font-medium">₦{(wallet?.totalEarned || 0).toLocaleString()}</span></div>
          <div><span className="opacity-70">Withdrawn:</span> <span className="font-medium">₦{(wallet?.totalWithdrawn || 0).toLocaleString()}</span></div>
        </div>
      </div>

      {/* KYC Banner */}
      {kyc?.status !== 'approved' && (
        <div className={`rounded-xl p-4 border ${
          kyc?.status === 'pending' ? 'bg-yellow-900/20 border-yellow-800' :
          kyc?.status === 'rejected' ? 'bg-red-900/20 border-red-800' :
          'bg-orange-900/20 border-orange-800'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div className="flex-1">
              <div className={`font-medium ${kyc?.status === 'pending' ? 'text-yellow-400' : kyc?.status === 'rejected' ? 'text-red-400' : 'text-orange-400'}`}>
                {kyc?.status === 'pending' ? 'KYC Under Review' :
                 kyc?.status === 'rejected' ? 'KYC Rejected' :
                 'KYC Required for Withdrawals'}
              </div>
              <div className="text-gray-400 text-sm">
                {kyc?.status === 'pending' ? 'Admin will review within 24-48 hours.' :
                 kyc?.status === 'rejected' ? `Reason: ${kyc?.submission?.rejectionReason || 'N/A'}. Please resubmit.` :
                 'Complete KYC verification to access withdrawal features.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'wallet', label: '📊 Overview' },
          { id: 'kyc', label: '📋 KYC' },
          { id: 'banks', label: '🏦 Bank Accounts' },
          { id: 'withdraw', label: '💸 Withdraw', disabled: !kycApproved },
          { id: 'history', label: '📜 History' },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as any)} disabled={t.disabled}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-blue-600 text-white' :
              t.disabled ? 'bg-gray-800 text-gray-600 cursor-not-allowed' :
              'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'kyc' && <KycTab userId={userId} kyc={kyc} />}
      {tab === 'banks' && <BanksTab userId={userId} bankAccounts={bankAccounts} />}
      {tab === 'withdraw' && <WithdrawTab userId={userId} wallet={wallet} bankAccounts={bankAccounts} />}
      {tab === 'history' && <HistoryTab transactions={transactions} payoutRequests={payoutRequests} />}
    </div>
  )
}

function KycTab({ userId, kyc }: { userId: string; kyc: any }) {
  const submitKyc = useMutation(api.client_kyc.submitKyc)
  const [form, setForm] = useState({
    legalName: '', businessName: '', registrationNumber: '', phoneNumber: '',
    address: '', city: '', state: '', country: 'Nigeria',
  })
  const [identityDoc, setIdentityDoc] = useState<File | null>(null)
  const [proofOfAddress, setProofOfAddress] = useState<File | null>(null)
  const [certIncorp, setCertIncorp] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMsg(null)

    try {
      const result = await submitKyc({
        userId, ...form,
        identityDocId: undefined,
        proofOfAddressId: undefined,
        certificateOfIncorporationId: undefined,
      })

      if (result?.error) {
        setMsg({ type: 'error', text: result.error })
      } else {
        setMsg({ type: 'success', text: 'KYC submitted! Admin will review within 24-48 hours.' })
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Submission failed' })
    }
    setSubmitting(false)
  }

  if (kyc?.status === 'approved') {
    return (
      <div className="bg-green-900/20 border border-green-800 rounded-xl p-6 text-center">
        <div className="text-4xl mb-2">✅</div>
        <div className="text-green-400 font-bold text-lg">KYC Approved</div>
        <div className="text-gray-400 text-sm">You can now request withdrawals</div>
      </div>
    )
  }

  if (kyc?.status === 'pending') {
    return (
      <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-6 text-center">
        <div className="text-4xl mb-2">⏳</div>
        <div className="text-yellow-400 font-bold text-lg">KYC Under Review</div>
        <div className="text-gray-400 text-sm">Submitted: {kyc?.submission ? new Date(kyc.submission.createdAt).toLocaleDateString() : 'N/A'}</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h3 className="text-lg font-semibold text-white mb-4">KYC Verification</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Full Legal Name *</label>
            <input value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} required
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Business Name</label>
            <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Registration Number (RC)</label>
            <input value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Phone Number *</label>
            <input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} required
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700" />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Business Address *</label>
          <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required rows={2}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">City *</label>
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">State *</label>
            <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Country *</label>
            <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700">
              <option value="Nigeria">Nigeria</option>
              <option value="Ghana">Ghana</option>
              <option value="Kenya">Kenya</option>
              <option value="South Africa">South Africa</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Valid ID (Passport, Driver's License, National ID, NIN) *</label>
            <input type="file" onChange={(e) => setIdentityDoc(e.target.files?.[0] || null)} accept=".pdf,.jpg,.png"
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Proof of Address (Utility Bill, Bank Statement) *</label>
            <input type="file" onChange={(e) => setProofOfAddress(e.target.files?.[0] || null)} accept=".pdf,.jpg,.png"
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Certificate of Incorporation (Optional)</label>
            <input type="file" onChange={(e) => setCertIncorp(e.target.files?.[0] || null)} accept=".pdf"
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700 text-sm" />
          </div>
        </div>

        {msg && (
          <div className={`rounded-lg p-3 text-sm ${msg.type === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            {msg.text}
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium">
          {submitting ? '⏳ Submitting...' : '📋 Submit KYC'}
        </button>
      </form>
    </div>
  )
}

function BanksTab({ userId, bankAccounts }: { userId: string; bankAccounts: any }) {
  const addBank = useMutation(api.client_payouts.addBankAccount)
  const removeBank = useMutation(api.client_payouts.removeBankAccount)
  const resolveAccount = useMutation(api.client_payouts.resolveBankAccount)
  const [showAdd, setShowAdd] = useState(false)
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [resolving, setResolving] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)

  const handleResolve = async () => {
    if (bankCode.length < 3 || accountNumber.length < 10) return
    setResolving(true)
    try {
      const result = await resolveAccount({ bankCode, accountNumber })
      if (result?.success) {
        setAccountName(result.accountName)
        setMsg({ type: 'success', text: `Account resolved: ${result.accountName}` })
      } else {
        setMsg({ type: 'error', text: result?.error || 'Resolution failed' })
      }
    } catch (e: any) { setMsg({ type: 'error', text: e.message }) }
    setResolving(false)
  }

  const handleAdd = async () => {
    if (!bankCode || !accountNumber || !accountName) return
    try {
      const bankName = NIGERIAN_BANKS.find((b) => b.code === bankCode)?.name || bankCode
      await addBank({ userId, bankCode, bankName, accountNumber, accountName })
      setShowAdd(false)
      setBankCode('')
      setAccountNumber('')
      setAccountName('')
      setMsg({ type: 'success', text: 'Bank account added!' })
    } catch (e: any) { setMsg({ type: 'error', text: e.message }) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Bank Accounts</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          {showAdd ? '✕ Cancel' : '+ Add Account'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Bank</label>
              <select value={bankCode} onChange={(e) => setBankCode(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700">
                <option value="">Select bank...</option>
                {NIGERIAN_BANKS.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Account Number</label>
              <div className="flex gap-2">
                <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="10-digit account number"
                  className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700" />
                <button onClick={handleResolve} disabled={resolving || bankCode.length < 3 || accountNumber.length < 10}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm">
                  {resolving ? '...' : 'Verify'}
                </button>
              </div>
            </div>
          </div>
          {accountName && (
            <div className="bg-gray-800 rounded-lg p-3">
              <span className="text-gray-400 text-sm">Verified Name: </span>
              <span className="text-white font-medium">{accountName}</span>
            </div>
          )}
          {accountName && (
            <button onClick={handleAdd} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">💾 Save Account</button>
          )}
        </div>
      )}

      {msg && (
        <div className={`rounded-lg p-3 text-sm ${msg.type === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          {msg.text}
        </div>
      )}

      {bankAccounts && bankAccounts.length > 0 ? (
        <div className="space-y-2">
          {bankAccounts.map((acc: any) => (
            <div key={acc._id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏦</span>
                <div>
                  <div className="text-white font-medium">{acc.bankName}</div>
                  <div className="text-gray-400 text-sm">{acc.accountNumber} • {acc.accountName}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {acc.isDefault && <span className="px-2 py-1 bg-blue-900 text-blue-300 rounded text-xs">Default</span>}
                <button onClick={() => removeBank({ userId, accountId: acc._id })} className="text-red-400 hover:text-red-300 text-sm">✕</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl p-6 text-center border border-gray-800">
          <div className="text-gray-400">No bank accounts added yet</div>
        </div>
      )}
    </div>
  )
}

function WithdrawTab({ userId, wallet, bankAccounts }: { userId: string; wallet: any; bankAccounts: any }) {
  const requestWithdrawal = useMutation(api.client_payouts.requestWithdrawal)
  const [amount, setAmount] = useState('')
  const [selectedBank, setSelectedBank] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)

  const handleSubmit = async () => {
    const amt = parseInt(amount)
    if (!amt || amt <= 0) return setMsg({ type: 'error', text: 'Enter valid amount' })
    if (amt > (wallet?.balance || 0)) return setMsg({ type: 'error', text: 'Insufficient balance' })
    if (!selectedBank) return setMsg({ type: 'error', text: 'Select a bank account' })

    setSubmitting(true)
    try {
      const result = await requestWithdrawal({ userId, amount: amt, bankAccountId: selectedBank as any })
      if (result?.error) {
        setMsg({ type: 'error', text: result.error })
      } else {
        setMsg({ type: 'success', text: 'Withdrawal request submitted! Admin will process within 24-48 hours.' })
        setAmount('')
      }
    } catch (e: any) { setMsg({ type: 'error', text: e.message }) }
    setSubmitting(false)
  }

  if (!bankAccounts || bankAccounts.length === 0) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-6 text-center">
        <div className="text-yellow-400 font-medium">Add a bank account first</div>
        <div className="text-gray-400 text-sm mt-1">Go to Bank Accounts tab to add your account</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
      <h3 className="text-lg font-semibold text-white">Request Withdrawal</h3>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Amount (₦)</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Enter amount"
          className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 text-2xl font-bold" />
        <div className="text-gray-500 text-sm mt-1">Available: ₦{(wallet?.balance || 0).toLocaleString()}</div>
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Withdraw to</label>
        <select value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}
          className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700">
          <option value="">Select bank account...</option>
          {bankAccounts.map((acc: any) => (
            <option key={acc._id} value={acc._id}>{acc.bankName} - {acc.accountNumber}</option>
          ))}
        </select>
      </div>
      {msg && (
        <div className={`rounded-lg p-3 text-sm ${msg.type === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          {msg.text}
        </div>
      )}
      <button onClick={handleSubmit} disabled={submitting || !amount || !selectedBank}
        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
        {submitting ? '⏳ Submitting...' : '💸 Submit Withdrawal Request'}
      </button>
      <div className="text-gray-500 text-xs text-center">Admin will review and process within 24-48 hours</div>
    </div>
  )
}

function HistoryTab({ transactions, payoutRequests }: { transactions: any; payoutRequests: any }) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Withdrawal Requests</h3>
        {!payoutRequests || payoutRequests.length === 0 ? (
          <div className="text-gray-500 text-center py-4">No withdrawal requests yet</div>
        ) : (
          <div className="space-y-2">
            {payoutRequests.map((p: any) => (
              <div key={p._id} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                <div>
                  <div className="text-white font-medium">₦{p.amount.toLocaleString()}</div>
                  <div className="text-gray-400 text-xs">{p.bankName} • {p.accountNumber}</div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[p.status] || 'bg-gray-700 text-gray-300'}`}>{p.status}</span>
                  <div className="text-gray-500 text-xs mt-1">{new Date(p.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Wallet Transactions</h3>
        {!transactions || transactions.length === 0 ? (
          <div className="text-gray-500 text-center py-4">No transactions yet</div>
        ) : (
          <div className="space-y-2">
            {transactions.map((t: any) => (
              <div key={t._id} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{t.type === 'credit' ? '💰' : t.type === 'withdrawal' ? '💸' : '📤'}</span>
                  <div>
                    <div className="text-white text-sm">{t.description}</div>
                    <div className="text-gray-500 text-xs">{new Date(t.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <span className={`font-bold ${t.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.type === 'credit' ? '+' : '-'}₦{t.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
