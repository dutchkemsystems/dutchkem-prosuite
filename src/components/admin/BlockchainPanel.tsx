import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export function BlockchainPanel() {
  const [type, setType] = useState('transaction')
  const [data, setData] = useState('')
  const [result, setResult] = useState<any>(null)

  const verifications: any = useQuery(api.blockchain_verification.getVerifications, {})
  const stats: any = useQuery(api.blockchain_verification.getVerificationStats, {})
  const createVerification = useMutation(api.blockchain_verification.createVerification)

  const handleVerify = async () => {
    if (!data) return
    const res = await createVerification({ type, data })
    setResult(res)
    setData('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">⛓️ Blockchain Verification</h2>
        <p className="text-xs text-slate-400 mt-1">Immutable audit trail — $500K/year potential</p>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-orange-400">{stats.totalRecords}</p>
            <p className="text-[10px] text-slate-500 uppercase">Total Records</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-400">{Object.keys(stats.byType || {}).length}</p>
            <p className="text-[10px] text-slate-500 uppercase">Record Types</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-blue-400">
              {stats.lastRecord ? new Date(stats.lastRecord).toLocaleDateString() : '—'}
            </p>
            <p className="text-[10px] text-slate-500 uppercase">Last Record</p>
          </div>
        </div>
      )}

      {/* Create Verification */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-black text-white mb-3">Create Verification Record</h3>
        <div className="flex gap-3">
          <select value={type} onChange={e => setType(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
            <option value="transaction">Transaction</option>
            <option value="contract">Contract</option>
            <option value="audit">Audit</option>
            <option value="identity">Identity</option>
          </select>
          <input value={data} onChange={e => setData(e.target.value)} placeholder="Data to verify..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500" />
          <button onClick={handleVerify}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-xl text-xs font-bold text-white">Verify</button>
        </div>
        {result && (
          <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
            <p className="text-xs text-emerald-400 font-bold">✓ Record Created</p>
            <p className="text-[10px] text-slate-400 mt-1">Hash: {result.hash}</p>
            <p className="text-[10px] text-slate-400">Previous: {result.previousHash}</p>
          </div>
        )}
      </div>

      {/* Records List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-slate-800">
            <th className="text-left px-4 py-3 text-slate-500 font-bold">Type</th>
            <th className="text-left px-4 py-3 text-slate-500 font-bold">Data</th>
            <th className="text-left px-4 py-3 text-slate-500 font-bold">Hash</th>
            <th className="text-left px-4 py-3 text-slate-500 font-bold">Time</th>
          </tr></thead>
          <tbody>
            {(verifications || []).length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No records yet</td></tr>
            ) : (verifications || []).map((r: any) => (
              <tr key={r._id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded text-[10px] font-bold capitalize">{r.type}</span></td>
                <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{r.data}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">{r.hash}</td>
                <td className="px-4 py-3 text-slate-400">{new Date(r.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
