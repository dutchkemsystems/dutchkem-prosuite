import { useState, useEffect, useRef } from 'react'
import { useAction } from 'convex/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isError?: boolean
}

interface CustomerSupportChatProps {
  agentId: string
  onClose: () => void
}

const AGENT_ICONS: Record<string, string> = {
  A1: '🎓', A2: '💼', A3: '✍️', A4: '📄', A5: '🛍️',
  A6: '📝', A7: '💰', A8: '🎬', A9: '🏥', A10: '🧹',
  A11: '🗣️', A12: '✈️', A13: '🚀', A14: '📝', A15: '🎉',
}

const AGENT_NAMES: Record<string, string> = {
  A1: 'Academic Pro', A2: 'Business Pro', A3: 'Content Pro',
  A4: 'Career Pro', A5: 'Personal Shopper', A6: 'Exam Pro',
  A7: 'Finance Pro', A8: 'MediaStudio Pro', A9: 'Health Pro',
  A10: 'Home Services Pro', A11: 'Language Tutor', A12: 'Travel Planner',
  A13: 'ServiceMart NG', A14: 'Translation Hub', A15: 'Event Planner',
}

export default function CustomerSupportChat({ agentId, onClose }: CustomerSupportChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: agentInfo } = useSuspenseQuery(convexQuery(api.customer_support.getAgentSupportInfo, { agentId }))
  const generateResponse = useAction(api.customer_support.generateSupportResponse)

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `👋 Hello! I'm ${AGENT_NAMES[agentId] || 'Agent'} Support. I'm here to answer any questions about our services, pricing, or anything else. What would you like to know? 😊`,
      timestamp: new Date().toISOString(),
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
      const result = await generateResponse({
        agentId,
        message: input,
        conversationHistory: messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
      })

      if (result.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.message,
          timestamp: result.timestamp,
        }])
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[460px] max-w-[95vw] h-[600px] bg-slate-900 border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-orange-500 to-amber-600">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{AGENT_ICONS[agentId] || '🤖'}</span>
            <div>
              <p className="font-black text-white text-sm">{AGENT_NAMES[agentId] || 'Agent'} Support</p>
              <p className="text-[10px] text-white/70">Powered by NVIDIA LLM</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/70 bg-white/10 px-2 py-1 rounded">🟢 Online</span>
            <button onClick={onClose} className="text-white/70 hover:text-white text-lg font-bold">&times;</button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : ''}`}>
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
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Info */}
        {agentInfo && (
          <div className="px-4 py-2 border-t border-white/5 bg-white/[0.02]">
            <p className="text-[10px] text-slate-500 truncate">
              💡 Ask about: {agentInfo.specialty}
            </p>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-white/10 bg-white/[0.02]">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="💬 Ask me anything..."
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
