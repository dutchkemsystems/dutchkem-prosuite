import { useQuery, useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../../convex/_generated/api'

export function WorkflowViewerTab({ token }: { token: string }) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [triggering, setTriggering] = useState<string | null>(null)

  const org = useQuery(api.enterprise_auth.getOrgDetails, token ? { token } : 'skip')
  const assignments = useQuery(
    api.admin_enterprise_hub.listOrgAssignments,
    org?._id ? { orgId: org._id } : 'skip'
  ) || []

  const triggerExecution = useMutation(api.admin_enterprise_hub.triggerExecution)

  const showToast = (msg: string, isError = false) => {
    if (isError) setError(msg)
    else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 3000)
  }

  const handleTrigger = async (assignment: any) => {
    if (!org?._id) return
    setTriggering(assignment.template._id)
    try {
      const result: any = await triggerExecution({
        templateId: assignment.template._id,
        orgId: org._id,
        triggerType: "manual",
      })
      if (result?.error) { showToast(result.error, true); return }
      showToast(`Workflow "${assignment.template.name}" executed successfully!`)
    } catch (e: any) { showToast(e.message || 'Execution failed', true) }
    finally { setTriggering(null) }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {(error || success) && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${error ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {error || success}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-black tracking-tight">Assigned Workflows</h2>
        <p className="text-sm text-slate-400 mt-1">View and trigger workflows deployed by your administrator</p>
      </div>

      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <p className="text-sm text-blue-400 font-bold">
          ℹ️ Workflow building is managed by the admin. Contact your administrator to request new workflows or modifications.
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-4xl mb-4">🔄</p>
          <p className="text-slate-500 font-bold mb-2">No workflows assigned yet</p>
          <p className="text-sm text-slate-600">Your administrator will deploy workflows for your organization.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((item: any) => (
            <div key={item.assignment._id} className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center text-2xl">🔄</div>
                <div>
                  <h3 className="font-black">{item.template.name}</h3>
                  <p className="text-xs text-slate-400">
                    {item.template.description || 'No description'} · {item.template.nodes?.length || 0} nodes · v{item.template.version}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Deployed {new Date(item.assignment.deployedAt).toLocaleDateString()} · Category: {item.template.category}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  active
                </span>
                <button
                  onClick={() => handleTrigger(item)}
                  disabled={triggering === item.template._id}
                  className="px-5 py-2.5 bg-violet-600 text-white font-black text-xs rounded-xl hover:bg-violet-700 transition-all disabled:opacity-50"
                >
                  {triggering === item.template._id ? 'Running...' : '▶ Trigger'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-2xl">
        <h3 className="font-black mb-3">Request Workflow</h3>
        <p className="text-sm text-slate-400 mb-4">Need a new workflow? Contact your administrator with your requirements.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {['Sales Pipeline', 'Content Automation', 'Support Triage', 'HR Onboarding', 'Data Analytics', 'Finance Approval'].map(name => (
            <div key={name} className="p-3 bg-white/5 border border-white/10 rounded-xl text-center">
              <p className="text-xs font-bold text-slate-400">{name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
