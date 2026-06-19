import { createFileRoute } from '@tanstack/react-router'
import { AgentBrowser } from '~/components/dashboard/AgentBrowser'

export const Route = createFileRoute('/all-agents')({
  component: AllAgentsPage,
})

function AllAgentsPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <AgentBrowser isOpen={true} onClose={() => {}} mode="page" />
    </div>
  )
}