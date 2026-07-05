import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-500/20 text-slate-400',
  normal: 'bg-blue-500/20 text-blue-400',
  high: 'bg-amber-500/20 text-amber-400',
  critical: 'bg-red-500/20 text-red-400',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-amber-500/20 text-amber-400',
  waiting_customer: 'bg-purple-500/20 text-purple-400',
  resolved: 'bg-emerald-500/20 text-emerald-400',
  closed: 'bg-slate-500/20 text-slate-400',
}

export function SupportTicketDashboard({ adminToken }: { adminToken: string }) {
  const [filter, setFilter] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [form, setForm] = useState({ subject: '', description: '', priority: 'normal' as string, category: 'technical' as string, customerEmail: '', customerName: '', companyId: '', orgId: '' })

  const dashboard = useQuery(api.enterprise_support.getSupportDashboard, { adminToken })
  const tickets = useQuery(api.enterprise_support.listAllTickets, { status: filter !== 'all' ? filter : undefined, adminToken })
  const createTicket = useMutation(api.enterprise_support.createTicket)
  const updateStatus = useMutation(api.enterprise_support.updateTicketStatus)
  const rateTicket = useMutation(api.enterprise_support.rateTicket)

  const data = dashboard || {}
  const ticketList = tickets || []

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleStatusUpdate = async (ticketId: string, status: string) => {
    try {
      await updateStatus({ ticketId: ticketId as any, status: status as any, adminToken })
      showToast('Status updated', 'success')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  const handleRate = async (ticketId: string, score: number) => {
    try {
      await rateTicket({ ticketId: ticketId as any, score, adminToken })
      showToast('Rating submitted', 'success')
    } catch (e: any) { showToast(e.message || 'Failed', 'error') }
  }

  return (
    <div className="space-y-6 ">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-black ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">24/7 Enterprise Support</h2>
          <p className="text-sm text-slate-400 mt-1">Global support ticketing system with SLA compliance tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-emerald-400">24/7 AVAILABLE</span>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-xs font-black transition-all">
            + Create Ticket
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black">{data.total ?? 0}</div>
          <div className="text-xs text-slate-400">Total Tickets</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-amber-400">{data.open ?? 0}</div>
          <div className="text-xs text-slate-400">Open</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-purple-400">{data.inProgress ?? 0}</div>
          <div className="text-xs text-slate-400">In Progress</div>
        </div>
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-red-400">{data.critical ?? 0}</div>
          <div className="text-xs text-slate-400">Critical</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-white/10 rounded-2xl p-4">
          <div className="text-2xl font-black text-emerald-400">{data.slaCompliance ?? 100}%</div>
          <div className="text-xs text-slate-400">SLA Compliance</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-black text-slate-300 mb-3">Priority Breakdown</h3>
          {data.priorityBreakdown && Object.entries(data.priorityBreakdown).map(([priority, count]: [string, any]) => (
            <div key={priority} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${PRIORITY_COLORS[priority]}`}>{priority}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FF6B35] rounded-full" style={{ width: `${data.total > 0 ? (count / data.total) * 100 : 0}%` }} />
                </div>
                <span className="text-xs font-black text-white w-8 text-right">{count}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="text-sm font-black text-slate-300 mb-3">Category Breakdown</h3>
          {data.categoryBreakdown && Object.entries(data.categoryBreakdown).map(([category, count]: [string, any]) => (
            <div key={category} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-xs text-slate-300 capitalize">{category.replace(/_/g, ' ')}</span>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${data.total > 0 ? (count / data.total) * 100 : 0}%` }} />
                </div>
                <span className="text-xs font-black text-white w-8 text-right">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        {['all', 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === f ? 'bg-[#FF6B35] text-white' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}>
            {f === 'all' ? 'All' : f.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black">Create Support Ticket</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <input placeholder="Organization ID *" value={form.orgId} onChange={(e) => setForm({ ...form, orgId: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <input placeholder="Company ID *" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <input placeholder="Your Name *" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <input type="email" placeholder="Your Email *" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <input placeholder="Subject *" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <textarea placeholder="Description *" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF6B35]/50" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white">
                  <option value="low" className="bg-[#0a0a0f]">Low Priority</option>
                  <option value="normal" className="bg-[#0a0a0f]">Normal Priority</option>
                  <option value="high" className="bg-[#0a0a0f]">High Priority</option>
                  <option value="critical" className="bg-[#0a0a0f]">Critical (&lt; 15 min)</option>
                </select>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white">
                  <option value="technical" className="bg-[#0a0a0f]">Technical</option>
                  <option value="billing" className="bg-[#0a0a0f]">Billing</option>
                  <option value="feature_request" className="bg-[#0a0a0f]">Feature Request</option>
                  <option value="security" className="bg-[#0a0a0f]">Security</option>
                  <option value="compliance" className="bg-[#0a0a0f]">Compliance</option>
                  <option value="general" className="bg-[#0a0a0f]">General</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={async () => {
                  if (!form.orgId || !form.companyId || !form.subject || !form.description || !form.customerName || !form.customerEmail) {
                    showToast('Please fill in all required fields', 'error')
                    return
                  }
                  try {
                    await createTicket({
                      orgId: form.orgId as any,
                      companyId: form.companyId,
                      customerName: form.customerName,
                      customerEmail: form.customerEmail,
                      subject: form.subject,
                      description: form.description,
                      priority: form.priority as any,
                      category: form.category as any,
                      adminToken,
                    })
                    showToast('Ticket created successfully', 'success')
                    setShowCreate(false)
                    setForm({ subject: '', description: '', priority: 'normal', category: 'technical', customerEmail: '', customerName: '', companyId: '', orgId: '' })
                  } catch (e: any) {
                    showToast(e.message || 'Failed to create ticket', 'error')
                  }
                }} className="flex-1 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#FF8255] text-white rounded-xl text-xs font-black transition-all">Submit Ticket</button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs font-black hover:text-white">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-black text-slate-300 mb-3">Tickets ({ticketList.length})</h3>
        {ticketList.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No tickets found.</div>
        ) : (
          <div className="space-y-2">
            {ticketList.map((ticket: any) => (
              <div key={ticket._id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-xs font-black text-[#FF6B35]">{ticket.ticketNumber}</div>
                    <div className="text-sm font-bold text-white">{ticket.subject}</div>
                    <div className="text-[10px] text-slate-400">{ticket.customerName} · {ticket.customerEmail}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${STATUS_COLORS[ticket.status]}`}>{ticket.status.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-slate-500">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  <div className="flex gap-1">
                    {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                      <select onChange={(e) => handleStatusUpdate(ticket._id, e.target.value)} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] text-white">
                        <option value="" className="bg-[#0a0a0f]">Update...</option>
                        <option value="in_progress" className="bg-[#0a0a0f]">In Progress</option>
                        <option value="waiting_customer" className="bg-[#0a0a0f]">Waiting Customer</option>
                        <option value="resolved" className="bg-[#0a0a0f]">Resolved</option>
                        <option value="closed" className="bg-[#0a0a0f]">Closed</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-4">
          <div className="text-lg mb-2">💬</div>
          <h4 className="text-sm font-black text-white">Live Chat (24/7)</h4>
          <p className="text-[10px] text-slate-400 mt-1">Instant connection to enterprise support agents</p>
          <button className="mt-3 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg text-[10px] font-bold text-blue-400 hover:bg-blue-500/30">Start Chat</button>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-4">
          <div className="text-lg mb-2">📞</div>
          <h4 className="text-sm font-black text-white">Phone Support</h4>
          <p className="text-[10px] text-slate-400 mt-1">+1-888-DUTCHKEM (24/7 for critical issues)</p>
          <button className="mt-3 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/30">Call Now</button>
        </div>
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-4">
          <div className="text-lg mb-2">📧</div>
          <h4 className="text-sm font-black text-white">Email Support</h4>
          <p className="text-[10px] text-slate-400 mt-1">enterprise@dutchkem.com (response &lt; 1 hour)</p>
          <button className="mt-3 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-lg text-[10px] font-bold text-amber-400 hover:bg-amber-500/30">Send Email</button>
        </div>
      </div>
    </div>
  )
}
