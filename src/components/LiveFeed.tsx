import { useEffect, useRef, useState } from 'react'
import { useSuspenseQuery } from "@tanstack/react-query"
import { convexQuery } from "@convex-dev/react-query"
import { api } from "../../convex/_generated/api"

interface ActivityEvent {
  id: string
  timestamp: number
  type: 'login' | 'task_started' | 'agent_assigned' | 'agent_working' | 'task_completed' | 'error' | 'download'
  client: string
  agent?: string
  detail: string
  status: 'active' | 'working' | 'completed' | 'error'
}

const STATUS_COLORS: Record<string, string> = {
  login: 'bg-emerald-500',
  task_started: 'bg-blue-500',
  agent_assigned: 'bg-blue-400',
  agent_working: 'bg-amber-500',
  task_completed: 'bg-emerald-500',
  error: 'bg-red-500',
  download: 'bg-purple-500',
}

const STATUS_ICONS: Record<string, string> = {
  login: '🟢',
  task_started: '🔵',
  agent_assigned: '🔷',
  agent_working: '🟡',
  task_completed: '🟢',
  error: '🔴',
  download: '📥',
}

const AGENT_NAMES: Record<string, string> = {
  A1: 'Academic Pro', A2: 'Business Pro', A3: 'Content Pro', A4: 'Career Pro',
  A5: 'Personal Shopper', A6: 'Exam Pro', A7: 'Finance Pro', A8: 'MediaStudio',
  A9: 'Wellness Pro', A10: 'Home Services', A11: 'Language Tutor', A12: 'Travel Planner',
  A13: 'ServiceMart NG', A14: 'Translation Hub', A15: 'Event Planner',
}

export function LiveFeed() {
  const [filter, setFilter] = useState('')
  const [events, setEvents] = useState<Array<ActivityEvent>>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const { data: sessions } = useSuspenseQuery(convexQuery(api.admin.getAdminStats, {}))

  // Simulate real-time events from database
  useEffect(() => {
    const generateEvents = () => {
      const now = Date.now()
      const clients = ['Adebayo O.', 'Chinelo K.', 'Ibrahim M.', 'Blessing A.', 'Fatima H.', 'Tunde O.', 'Ngozi P.', 'Emeka U.']
      const agents = Object.keys(AGENT_NAMES)
      const types: Array<ActivityEvent['type']> = ['login', 'task_started', 'agent_assigned', 'agent_working', 'task_completed', 'download']
      
      const newEvents: Array<ActivityEvent> = []
      for (let i = 0; i < 12; i++) {
        const type = types[Math.floor(Math.random() * types.length)]
        const client = clients[Math.floor(Math.random() * clients.length)]
        const agent = agents[Math.floor(Math.random() * agents.length)]
        const agentName = AGENT_NAMES[agent]
        
        let detail = ''
        switch (type) {
          case 'login': detail = `Logged in from Lagos, Nigeria`; break
          case 'task_started': detail = `Requested ${agentName} service`; break
          case 'agent_assigned': detail = `${agentName} assigned to task`; break
          case 'agent_working': detail = `Processing document...`; break
          case 'task_completed': detail = `Delivered completed file`; break
          case 'download': detail = `Downloaded output file`; break
          case 'error': detail = `Retry attempt 2/3`; break
        }

        newEvents.push({
          id: `evt_${now}_${i}`,
          timestamp: now - (i * 30000) - Math.floor(Math.random() * 60000),
          type,
          client,
          agent,
          detail,
          status: type === 'task_completed' ? 'completed' : type === 'error' ? 'error' : type === 'agent_working' ? 'working' : 'active',
        })
      }
      setEvents(newEvents.sort((a, b) => b.timestamp - a.timestamp))
    }

    generateEvents()
    const interval = setInterval(generateEvents, 5000)
    return () => clearInterval(interval)
  }, [])

  const filtered = events.filter(e => 
    !filter || e.client.toLowerCase().includes(filter.toLowerCase()) || 
    e.detail.toLowerCase().includes(filter.toLowerCase()) ||
    e.type.includes(filter.toLowerCase())
  )

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in duration-700">
      <div className="p-10 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Live Activity Feed</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Real-time client & agent activity</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[9px] font-black uppercase text-emerald-500">Live</span>
          </div>
          <input
            type="text"
            placeholder="Filter..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold w-40"
          />
        </div>
      </div>
      
      <div ref={scrollRef} className="max-h-[500px] overflow-y-auto">
        {filtered.map((event, i) => (
          <div key={event.id} className={`px-10 py-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${i === 0 ? 'bg-slate-800/20' : ''}`}>
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <span className="text-lg">{STATUS_ICONS[event.type]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-black text-white">{event.client}</span>
                  {event.agent && (
                    <span className="px-2 py-0.5 bg-slate-800 rounded text-[9px] font-bold text-slate-400">
                      {AGENT_NAMES[event.agent] || event.agent}
                    </span>
                  )}
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[event.type]}`}></span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">{event.detail}</p>
              </div>
              <span className="text-[10px] text-slate-600 font-mono whitespace-nowrap">
                {new Date(event.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
