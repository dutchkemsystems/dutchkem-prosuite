import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export function AutoResponseRulesPanel({ adminToken }: { adminToken: string }) {
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(null)
  const [showAddRule, setShowAddRule] = useState(false)
  const [newRule, setNewRule] = useState({ id: '', keywords: '', response: '', priority: 1 })

  const rules: any = useQuery(api.support_auto_response.getAutoResponseRules, {})
  const addRule = useMutation(api.support_auto_response.addAutoResponseRule)
  const toggleRule = useMutation(api.support_auto_response.toggleAutoResponseRule)

  const showToast = (type: string, msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const handleAddRule = async () => {
    if (!newRule.id || !newRule.keywords || !newRule.response) {
      showToast('error', 'Please fill in all fields')
      return
    }

    try {
      await addRule({
        id: newRule.id,
        keywords: newRule.keywords.split(',').map((k) => k.trim()),
        response: newRule.response,
        priority: newRule.priority,
        adminToken,
      })
      showToast('success', 'Rule added successfully')
      setShowAddRule(false)
      setNewRule({ id: '', keywords: '', response: '', priority: 1 })
    } catch (e: any) {
      showToast('error', e.message)
    }
  }

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await toggleRule({ ruleId, enabled, adminToken })
      showToast('success', `Rule ${enabled ? 'enabled' : 'disabled'}`)
    } catch (e: any) {
      showToast('error', e.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-black">Auto-Response Rules</h3>
        <button
          onClick={() => setShowAddRule(!showAddRule)}
          className="px-3 py-1 bg-orange-500 text-white rounded-lg text-xs font-bold"
        >
          {showAddRule ? 'Cancel' : '+ Add Rule'}
        </button>
      </div>

      {showAddRule && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <input
            type="text"
            placeholder="Rule ID (e.g., pricing)"
            value={newRule.id}
            onChange={(e) => setNewRule({ ...newRule, id: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
          />
          <input
            type="text"
            placeholder="Keywords (comma-separated)"
            value={newRule.keywords}
            onChange={(e) => setNewRule({ ...newRule, keywords: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
          />
          <textarea
            placeholder="Auto-response message"
            value={newRule.response}
            onChange={(e) => setNewRule({ ...newRule, response: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
          />
          <input
            type="number"
            placeholder="Priority (1 = highest)"
            value={newRule.priority}
            onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
          />
          <button
            onClick={handleAddRule}
            className="w-full py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold"
          >
            Add Rule
          </button>
        </div>
      )}

      <div className="space-y-2">
        {(rules ?? []).map((rule: any) => (
          <div
            key={rule.id}
            className={`rounded-2xl border-l-4 p-4 transition-all ${
              rule.enabled ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-900/50 border-red-500/30 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-black text-sm">{rule.id}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Priority: {rule.priority} | Keywords: {rule.keywords.join(', ')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => handleToggleRule(rule.id, !rule.enabled)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2">{rule.response}</p>
          </div>
        ))}
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-5 py-3 rounded-2xl shadow-2xl z-50 animate-pulse ${
            toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          <p className="text-sm font-bold">{toast.msg}</p>
        </div>
      )}
    </div>
  )
}
