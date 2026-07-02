import { useState } from 'react'
import CustomerSupportChat from './CustomerSupportChat'

interface AgentSupportButtonProps {
  agentId: string
  agentName: string
}

export function AgentSupportButton({ agentId, agentName }: AgentSupportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg text-[10px] font-bold text-orange-400 hover:bg-orange-500/20 transition-all"
      >
        <span>🎧</span>
        <span>Need Help?</span>
      </button>

      {isOpen && (
        <CustomerSupportChat
          agentId={agentId}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
