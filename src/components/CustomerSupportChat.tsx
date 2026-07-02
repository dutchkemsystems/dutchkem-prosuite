import { useState, useEffect, useRef } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isError?: boolean
  agentId?: string
  agentName?: string
  routed?: boolean
  confidence?: string
  icon?: string
}

interface CustomerSupportChatProps {
  agentId?: string
  onClose: () => void
}

const AGENT_ICONS: Record<string, string> = {
  A1: '🎓', A2: '💼', A3: '✍️', A4: '📄', A5: '🛍️',
  A6: '📝', A7: '💰', A8: '🎬', A9: '🏥', A10: '🧹',
  A11: '🗣️', A12: '✈️', A13: '🚀', A14: '📝', A15: '🎉',
  GENERAL: '💬',
}

const AGENT_NAMES: Record<string, string> = {
  A1: 'Academic Pro', A2: 'Business Pro', A3: 'Content Pro',
  A4: 'Career Pro', A5: 'Personal Shopper', A6: 'Exam Pro',
  A7: 'Finance Pro', A8: 'MediaStudio Pro', A9: 'Health Pro',
  A10: 'Home Services Pro', A11: 'Language Tutor', A12: 'Travel Planner',
  A13: 'ServiceMart NG', A14: 'Translation Hub', A15: 'Event Planner',
  GENERAL: 'General Support',
}

export default function CustomerSupportChat({ agentId, onClose }: CustomerSupportChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeAgent, setActiveAgent] = useState<string>(agentId || 'GENERAL')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const processMessage = useAction(api.support_orchestrator.processMessage)
  const logInteraction = useMutation(api.support_orchestrator.logInteraction)
  const status = useQuery(api.support_orchestrator.getOrchestratorStatus)

  useEffect(() => {
    const greeting = agentId && agentId !== 'GENERAL'
      ? `👋 Hello! I'm ${AGENT_NAMES[agentId] || 'Agent'} Support. I'm here to answer any questions about our services, pricing, or anything else. What would you like to know? 😊`
      : '👋 Hello! I\'m your AI support assistant powered by the Multi-Agent Orchestrator. I\'ll route your question to the right expert automatically. What can I help you with today? 😊'

    setMessages([{
      role: 'assistant',
      content: greeting,
      timestamp: new Date().toISOString(),
      agentId: agentId || 'GENERAL',
      agentName: AGENT_NAMES[agentId || 'GENERAL'],
    }])
  }, [agentId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMsg: Message = { role: 'user', content: input, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const result = await processMessage({
        message: input,
        conversationHistory: messages.slice(-10).map(m => ({
          role: m.role,
          content: m.content,
        })),
      })

      if (result.response) {
        const routedAgent = result.agentId || activeAgent
        setActiveAgent(routedAgent)

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.response,
          timestamp: new Date().toISOString(),
          agentId: routedAgent,
          agentName: result.agentName || AGENT_NAMES[routedAgent] || 'Support',
          icon: result.icon || AGENT_ICONS[routedAgent] || '💬',
          routed: result.routed,
          confidence: result.confidence,
        }])

        // Log interaction for analytics
        try {
          logInteraction({
            userId: 'anonymous',
            message: input,
            response: result.response,
            agentId: routedAgent,
            agentName: result.agentName || AGENT_NAMES[routedAgent] || 'Support',
            confidence: result.confidence || 'low',
            routed: result.routed || false,
          })
        } catch {}
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again in a moment.',
          timestamp: new Date().toISOString(),
          isError: true,
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again in a moment.',
        timestamp: new Date().toISOString(),
        isError: true,
      }])
    }

    setIsLoading(false)
  }

  const currentIcon = AGENT_ICONS[activeAgent] || '💬'
  const currentName = AGENT_NAMES[activeAgent] || 'Support'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[460px] max-w-[95vw] h-[600px] bg-slate-900 border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-orange-500 to-amber-600">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{currentIcon}</span>
            <div>
              <p className="font-black text-white text-sm">Multi-Agent Orchestrator</p>
              <p className="text-[10px] text-white/70">
                {activeAgent !== 'GENERAL'
                  ? `Routed to ${currentName}`
                  : 'LLM-powered routing — Ask anything'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/70 bg-white/10 px-2 py-1 rounded">
              {status?.isAvailable !== false ? '🟢 Online' : '🟡 Connecting...'}
            </span>
            <button onClick={onClose} className="text-white/70 hover:text-white text-lg font-bold">&times;</button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                {msg.role === 'assistant' && msg.agentId && msg.agentId !== 'GENERAL' && (
                  <div className="flex items-center gap-1 mb-1 px-1">
                    <span className="text-[10px]">{msg.icon || AGENT_ICONS[msg.agentId] || '💬'}</span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {msg.agentName || AGENT_NAMES[msg.agentId] || 'Agent'}
                    </span>
                    {msg.routed && (
                      <span className="text-[9px] text-orange-400/60 ml-1">auto-routed</span>
                    )}
                  </div>
                )}
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-orange-500 text-white rounded-br-md'
                    : msg.isError
                      ? 'bg-red-500/10 border border-red-500/20 text-red-400 rounded-bl-md'
                      : 'bg-white/5 border border-white/10 text-white rounded-bl-md'
                }`}>
                  {msg.content}
                </div>
                <p className="text-[9px] text-slate-500 mt-1 px-2">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] text-slate-500">Orchestrator routing to expert...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Agent chips */}
        <div className="px-4 py-2 border-t border-white/5 bg-white/[0.02] overflow-x-auto">
          <div className="flex gap-1.5">
            {['GENERAL', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15'].map((id) => (
              <button
                key={id}
                onClick={() => {
                  setActiveAgent(id)
                  setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `Switched to ${AGENT_NAMES[id] || 'General Support'}. How can I help? 😊`,
                    timestamp: new Date().toISOString(),
                    agentId: id,
                    agentName: AGENT_NAMES[id],
                  }])
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
                  activeAgent === id
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {AGENT_ICONS[id]} {AGENT_NAMES[id]?.split(' ')[0] || 'General'}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-3 border-t border-white/10 bg-white/[0.02]">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="💬 Ask me anything — the orchestrator will route to the right expert..."
              rows={1}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="px-5 py-3 bg-orange-600 text-white font-black text-sm rounded-xl hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
